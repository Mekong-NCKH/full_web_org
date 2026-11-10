/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import type { Server } from 'node:http';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { PositionUseCases } from '../../application/use-cases/position.use-cases';
import { IPositionRepositoryToken } from '../../domain/repositories/position.repository.interface';
import { MonitoringController } from './monitoring.controller';

describe('monitoring API', () => {
  let app: INestApplication;
  const getServer = () => app.getHttpServer() as Server;
  const station = {
    id: 'gocat',
    name: 'Go Cat',
    latitude: 10.364613,
    longitude: 106.370195,
  };
  const stationWithoutReading = {
    id: 'baodinh',
    name: 'Bao Dinh',
    latitude: 10.388921,
    longitude: 106.341713,
  };
  const vamkenhStation = {
    id: 'vamkenh',
    name: 'Vam Kenh',
    latitude: 10.283028,
    longitude: 106.738487,
  };
  const observation = {
    id: 'o1',
    station_id: 'gocat',
    datetime: '2024-06-15T00:00:00.000Z',
    salinity: -125,
    water_level: 0,
  };
  const repo = {
    getPositions: jest.fn().mockResolvedValue([station, stationWithoutReading]),
    getPositionById: jest.fn((id: string) =>
      Promise.resolve(
        id === 'gocat'
          ? station
          : id === 'baodinh'
            ? stationWithoutReading
            : null,
      ),
    ),
    getObservations: jest.fn().mockResolvedValue([observation]),
    getSnapshot: jest.fn().mockResolvedValue([
      { station, observation },
      { station: stationWithoutReading, observation: null },
    ]),
    getDataRange: jest.fn().mockResolvedValue({
      from: observation.datetime,
      to: observation.datetime,
    }),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [MonitoringController],
      providers: [
        PositionUseCases,
        { provide: IPositionRepositoryToken, useValue: repo },
      ],
    }).compile();
    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => jest.clearAllMocks());

  it('returns mg/L and meter metadata while preserving negative and zero values', async () => {
    const response = await request(getServer())
      .get('/api/v1/observations/snapshot')
      .query({ at: '2024-06-15T07:00:00+07:00', maxAgeHours: '6' })
      .expect(200);

    expect(repo.getSnapshot).toHaveBeenCalledWith(
      new Date('2024-06-15T00:00:00Z'),
      new Date('2024-06-14T18:00:00Z'),
    );
    expect(response.body.data[0].observation.salinity).toEqual({
      value: -125,
      unit: 'mg/L',
    });
    expect(response.body.data[0].observation.waterLevel).toEqual({
      value: 0,
      unit: 'm',
      reference: 'sea_level',
    });
    expect(response.body.data[1]).toMatchObject({
      station: { id: 'baodinh' },
      status: 'no_data',
      observation: null,
    });
  });

  it('keeps missing measurements null instead of converting them to zero', async () => {
    repo.getObservations.mockResolvedValueOnce([
      { ...observation, salinity: null, water_level: null },
    ]);
    const response = await request(getServer())
      .get('/api/v1/stations/gocat/observations')
      .query({ from: '2024-06-15T00:00Z', to: '2024-06-16T00:00Z' })
      .expect(200);

    expect(response.body.data[0].salinity).toEqual({
      value: null,
      unit: 'mg/L',
    });
    expect(response.body.data[0].waterLevel).toEqual({
      value: null,
      unit: 'm',
      reference: 'sea_level',
    });
  });

  it('publishes only the versioned rules for approved public stations', async () => {
    const response = await request(getServer())
      .get('/api/v1/gis/reference-rules')
      .expect(200);
    const body = response.body as {
      data: {
        id: string;
        version: string;
        confirmationStatus: string;
        intendedUse: string;
        rules: Array<{ stationId: string }>;
      };
    };

    expect(body.data).toMatchObject({
      id: 'mekong-legacy-gis-reference',
      version: '1.0.0',
      confirmationStatus: 'unconfirmed',
      intendedUse: 'reference_simulation_only',
    });
    expect(body.data.rules.map((rule) => rule.stationId)).toEqual([
      'baodinh',
      'gocat',
      'vamkenh',
    ]);
  });

  it('evaluates historical reference status without exposing private stations', async () => {
    const previousStart = process.env.PUBLIC_DATA_START;
    const previousEnd = process.env.PUBLIC_DATA_END;
    process.env.PUBLIC_DATA_START = '2024-06-01T00:00:00+07:00';
    process.env.PUBLIC_DATA_END = '2024-07-31T23:59:59+07:00';
    repo.getSnapshot.mockResolvedValueOnce([
      { station, observation },
      { station: stationWithoutReading, observation: null },
      {
        station: vamkenhStation,
        observation: {
          ...observation,
          id: 'o2',
          station_id: 'vamkenh',
          salinity: 1800,
        },
      },
      {
        station: { ...station, id: 'giathuan', name: 'Gia Thuan' },
        observation,
      },
    ]);

    try {
      const response = await request(getServer())
        .get('/api/v1/gis/reference-status')
        .query({ at: '2024-06-15T07:00:00+07:00', mode: 'replay' })
        .expect(200);
      const body = response.body as {
        mode: string;
        dataKind: string;
        source: string;
        ruleSet: { version: string; confirmationStatus: string };
        data: Array<{
          station: { id: string };
          referenceStatus: { code: string; thresholdMgL?: number };
        }>;
      };

      expect(body).toMatchObject({
        mode: 'replay',
        dataKind: 'observed',
        source: 'BaoDinh.csv',
        ruleSet: { version: '1.0.0', confirmationStatus: 'unconfirmed' },
      });
      expect(body.data.map((row) => row.station.id).sort()).toEqual([
        'baodinh',
        'gocat',
        'vamkenh',
      ]);
      expect(
        body.data.find((row) => row.station.id === 'vamkenh')?.referenceStatus,
      ).toMatchObject({
        code: 'close_for_storage',
        thresholdMgL: 1500,
      });
      expect(repo.getSnapshot).toHaveBeenCalledWith(
        new Date('2024-06-15T00:00:00.000Z'),
        new Date('2024-05-31T17:00:00.000Z'),
      );
    } finally {
      if (previousStart === undefined) delete process.env.PUBLIC_DATA_START;
      else process.env.PUBLIC_DATA_START = previousStart;
      if (previousEnd === undefined) delete process.env.PUBLIC_DATA_END;
      else process.env.PUBLIC_DATA_END = previousEnd;
    }
  });

  it('rejects live and forecast as GIS reference modes', async () => {
    await request(getServer())
      .get('/api/v1/gis/reference-status')
      .query({ at: '2024-06-15T00:00:00Z', mode: 'live' })
      .expect(400);
    expect(repo.getSnapshot).not.toHaveBeenCalled();
  });

  it.each([
    '2024-02-30T00:00:00Z',
    '2024-01-01T00:00:00',
    '2024-01-01T00:00:00+14:30',
  ])('rejects invalid timestamp %s', async (at) => {
    await request(getServer())
      .get('/api/v1/observations/snapshot')
      .query({ at })
      .expect(400);
    expect(repo.getSnapshot).not.toHaveBeenCalled();
  });

  it('rejects reversed or excessive ranges and non-public stations', async () => {
    const endpoint = '/api/v1/stations/gocat/observations';
    await request(getServer())
      .get(endpoint)
      .query({ from: '2024-06-16T00:00Z', to: '2024-06-15T00:00Z' })
      .expect(400);
    await request(getServer())
      .get(endpoint)
      .query({ from: '2024-06-01T00:00Z', to: '2024-07-03T00:00Z' })
      .expect(400);
    await request(getServer())
      .get('/api/v1/stations/missing/observations')
      .query({ from: '2024-06-15T00:00Z', to: '2024-06-16T00:00Z' })
      .expect(404);
    expect(repo.getObservations).not.toHaveBeenCalled();
  });

  it('rejects requests outside the configured public window', async () => {
    const previousStart = process.env.PUBLIC_DATA_START;
    const previousEnd = process.env.PUBLIC_DATA_END;
    process.env.PUBLIC_DATA_START = '2024-06-01T00:00:00+07:00';
    process.env.PUBLIC_DATA_END = '2024-07-31T23:59:59+07:00';

    try {
      await request(getServer())
        .get('/api/v1/observations/snapshot')
        .query({ at: '2024-05-31T16:00:00Z' })
        .expect(400);
      expect(repo.getSnapshot).not.toHaveBeenCalled();
    } finally {
      if (previousStart === undefined) delete process.env.PUBLIC_DATA_START;
      else process.env.PUBLIC_DATA_START = previousStart;
      if (previousEnd === undefined) delete process.env.PUBLIC_DATA_END;
      else process.env.PUBLIC_DATA_END = previousEnd;
    }
  });

  it('uses the same normalized measurement shape for time series and snapshots', async () => {
    const response = await request(getServer())
      .get('/api/v1/stations/gocat/observations')
      .query({ from: '2024-06-15T00:00Z', to: '2024-06-16T00:00Z' })
      .expect(200);

    expect(response.body.data[0]).toMatchObject({
      observedAt: observation.datetime,
      salinity: { value: -125, unit: 'mg/L' },
      waterLevel: { value: 0, unit: 'm', reference: 'sea_level' },
      quality: 'unverified',
    });
  });
});
