import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { Response } from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';

type Measurement = { value: number | null; unit: string };
type Station = { id: string; location: { source: string } };
type SnapshotItem = {
  station: { id: string };
  status: string;
  observation: { salinity: Measurement; waterLevel: Measurement } | null;
};
type HistoryItem = { salinity: Measurement };
type Envelope<T> = { data: T };

function responseBody<T>(response: Response): T {
  return response.body as T;
}

describe('Monitoring API with PostgreSQL', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  const getServer = () => app.getHttpServer() as import('node:http').Server;

  beforeAll(async () => {
    if (process.env.E2E_DATABASE_RESET_ALLOWED !== 'true') {
      throw new Error(
        'Set E2E_DATABASE_RESET_ALLOWED=true for the disposable PostgreSQL test database.',
      );
    }
    const allowedHosts = new Set(['127.0.0.1', 'localhost', 'postgres']);
    if (
      process.env.DATABASE_URL ||
      process.env.DB_NAME !== 'neondb' ||
      !allowedHosts.has(process.env.DB_HOST ?? '')
    ) {
      throw new Error(
        'E2E tests require the disposable neondb database on localhost or the CI postgres service.',
      );
    }

    process.env.PUBLIC_DATA_START = '2024-06-01T00:00:00+07:00';
    process.env.PUBLIC_DATA_END = '2024-07-31T23:59:59+07:00';

    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    dataSource = module.get(DataSource);
    await dataSource.query(
      'DROP TABLE IF EXISTS position_data; DROP TABLE IF EXISTS positions;',
    );
    const initSql = readFileSync(
      resolve(__dirname, '../docker/postgres/init/01-init.sql'),
      'utf8',
    );
    await dataSource.query(initSql);
    await dataSource.query(
      `INSERT INTO positions (id, name, latitude, longitude, type)
       VALUES
         ('baodinh', 'Bao Dinh', 10.388921, 106.341713, 'monitoring'),
         ('gocat', 'Go Cat', 10.364613, 106.370195, 'monitoring'),
         ('vamkenh', 'Vam Kenh', 10.283028, 106.738487, 'monitoring')`,
    );
    await dataSource.query(
      `INSERT INTO position_data (id, station_id, datetime, salinity, water_level)
       VALUES
         ('baodinh-start', 'baodinh', '2024-06-01T00:00:00+07:00', 100, 0.1),
         ('baodinh-demo', 'baodinh', '2024-06-15T12:00:00+07:00', 0, 0),
         ('baodinh-end', 'baodinh', '2024-07-31T23:00:00+07:00', 150, 0.2),
         ('gocat-demo', 'gocat', '2024-06-15T12:00:00+07:00', -250.5, -0.25)`,
    );

    app = module.createNestApplication();
    await app.init();
  }, 30000);

  afterAll(async () => {
    await app?.close();
  });

  it('lists only approved stations with observations inside the demo window', async () => {
    const response = await request(getServer())
      .get('/api/v1/stations')
      .expect(200);
    const { data } = responseBody<Envelope<Station[]>>(response);
    expect(data.map((station) => station.id)).toEqual(['baodinh', 'gocat']);
    expect(
      data.find((station) => station.id === 'gocat')?.location.source,
    ).toContain('cong_locations.csv');
  });

  it('reads timestamped values from PostgreSQL and preserves zero, negative, and no-data states', async () => {
    const response = await request(getServer())
      .get('/api/v1/observations/snapshot')
      .query({ at: '2024-06-15T12:00:00+07:00', maxAgeHours: '6' })
      .expect(200);
    const { data } = responseBody<Envelope<SnapshotItem[]>>(response);
    const byStation = new Map(
      data.map((row) => [row.station.id, row] as const),
    );

    expect(byStation.get('baodinh')).toMatchObject({
      observation: {
        salinity: { value: 0, unit: 'mg/L' },
        waterLevel: { value: 0, unit: 'm' },
      },
    });
    expect(byStation.get('gocat')).toMatchObject({
      observation: {
        salinity: { value: -250.5, unit: 'mg/L' },
        waterLevel: { value: -0.25, unit: 'm' },
      },
    });
    expect(byStation.get('vamkenh')).toMatchObject({
      status: 'no_data',
      observation: null,
    });
  });

  it('returns inclusive history from PostgreSQL and rejects out-of-window and private stations', async () => {
    const start = await request(getServer())
      .get('/api/v1/stations/baodinh/observations')
      .query({
        from: '2024-06-01T00:00:00+07:00',
        to: '2024-06-01T00:00:00+07:00',
      })
      .expect(200);
    expect(responseBody<Envelope<HistoryItem[]>>(start).data).toHaveLength(1);

    const series = await request(getServer())
      .get('/api/v1/stations/gocat/observations')
      .query({
        from: '2024-06-15T12:00:00+07:00',
        to: '2024-06-15T12:00:00+07:00',
      })
      .expect(200);
    const { data } = responseBody<Envelope<HistoryItem[]>>(series);
    expect(data).toHaveLength(1);
    expect(data[0]?.salinity).toEqual({
      value: -250.5,
      unit: 'mg/L',
    });

    await request(getServer())
      .get('/api/v1/observations/snapshot')
      .query({ at: '2024-05-31T23:00:00+07:00' })
      .expect(400);
    await request(getServer())
      .get('/api/v1/observations/snapshot')
      .query({ at: '2024-07-31T23:59:59+07:00' })
      .expect(200);
    await request(getServer())
      .get('/api/v1/observations/snapshot')
      .query({ at: '2024-08-01T00:00:00+07:00' })
      .expect(400);
    await request(getServer())
      .get('/api/v1/stations/giathuan/observations')
      .query({ from: '2024-06-15T12:00:00Z', to: '2024-06-15T13:00:00Z' })
      .expect(404);
  });

  it('returns an empty public catalog and empty data range when the database has no observations', async () => {
    await dataSource.query('DELETE FROM position_data');

    const stations = await request(getServer())
      .get('/api/v1/stations')
      .expect(200);
    expect(responseBody<Envelope<Station[]>>(stations).data).toEqual([]);

    const range = await request(getServer())
      .get('/api/v1/metadata/data-range')
      .expect(200);
    expect(
      responseBody<Envelope<{ from: string | null; to: string | null }>>(range)
        .data,
    ).toEqual({
      from: null,
      to: null,
    });
  });
});
