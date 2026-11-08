import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as fs from 'node:fs';
import * as path from 'node:path';

const SEED_LIMIT = 100;
const SEED_FILES = [
  path.join(process.cwd(), 'BaoDinh.csv'),
  path.join(process.cwd(), 'GoCong.csv'),
  path.join(__dirname, '../../../../BaoDinh.csv'),
  path.join(__dirname, '../../../../GoCong.csv'),
];

const STATION_METADATA: Record<
  string,
  { name: string; latitude: number; longitude: number; distanceKm: number; type: string }
> = {
  baodinh: { name: 'Bảo Định', latitude: 10.388921, longitude: 106.341713, distanceKm: 0, type: 'TRẠM ĐO' },
  cong3st: { name: 'Cống 3 Tháng 2', latitude: 10.353, longitude: 106.352, distanceKm: 4, type: 'CỐNG' },
  giathuan: { name: 'Gia Thuận', latitude: 10.316, longitude: 106.742, distanceKm: 34, type: 'CỐNG' },
  gocat: { name: 'Gò Cát', latitude: 10.364613, longitude: 106.370195, distanceKm: 21, type: 'TRẠM ĐO' },
  longhai: { name: 'Long Hải', latitude: 10.346, longitude: 106.671, distanceKm: 28, type: 'CỐNG' },
  longuong: { name: 'Long Uông', latitude: 10.394, longitude: 106.565, distanceKm: 18, type: 'TRẠM ĐO' },
  rachbang: { name: 'Rạch Bằng', latitude: 10.342, longitude: 106.569, distanceKm: 17, type: 'CỐNG' },
  rachbun: { name: 'Rạch Bùn', latitude: 10.360234, longitude: 106.775915, distanceKm: 23, type: 'TRẠM ĐO' },
  tanthuanbinh: { name: 'Tân Thuận Bình', latitude: 10.405, longitude: 106.463, distanceKm: 11, type: 'TRẠM ĐO' },
  vamgiong: { name: 'Vàm Giồng', latitude: 10.302144, longitude: 106.54872, distanceKm: 31, type: 'TRẠM ĐO' },
  vamkenh: { name: 'Vàm Kênh', latitude: 10.283028, longitude: 106.738487, distanceKm: 37, type: 'TRẠM ĐO' },
  xuanhoa: { name: 'Xuân Hòa', latitude: 10.336562, longitude: 106.410293, distanceKm: 22, type: 'TRẠM ĐO' },
};

@Injectable()
export class DatabaseBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseBootstrapService.name);

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit(): Promise<void> {
    if (process.env.DISABLE_DB_BOOTSTRAP === 'true') {
      this.logger.log('Database bootstrap is disabled by DISABLE_DB_BOOTSTRAP=true');
      return;
    }

    await this.createTablesIfNeeded();
    await this.seedIfEmpty();
  }

  private async createTablesIfNeeded(): Promise<void> {
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS positions (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        latitude DOUBLE PRECISION NOT NULL,
        longitude DOUBLE PRECISION NOT NULL,
        distance_km DOUBLE PRECISION,
        type VARCHAR(100)
      );
    `);

    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS position_data (
        id VARCHAR(50) PRIMARY KEY,
        station_id VARCHAR(50) NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
        datetime TIMESTAMP WITH TIME ZONE NOT NULL,
        salinity DOUBLE PRECISION,
        water_level DOUBLE PRECISION
      );
    `);
  }

  private async seedIfEmpty(): Promise<void> {
    const [{ count }] = await this.dataSource.query(
      'SELECT COUNT(*)::int AS count FROM position_data',
    );

    if (Number(count) > 0) {
      this.logger.log('Database already has data. Skip bootstrap seed.');
      return;
    }

    const seedFiles = this.resolveSeedFilePaths();
    if (!seedFiles.length) {
      this.logger.warn('Seed CSV files not found. Tables created without seed data.');
      return;
    }

    const seedData = this.buildSeedData(seedFiles, SEED_LIMIT);
    if (!seedData.observations.length) {
      this.logger.warn('Seed CSV files are empty. Tables created without seed data.');
      return;
    }

    await this.dataSource.transaction(async manager => {
      for (const stationId of seedData.stationIds) {
        const metadata = STATION_METADATA[stationId] ?? {
          name: stationId,
          latitude: 10.35,
          longitude: 106.55,
          distanceKm: null,
          type: 'TRẠM ĐO',
        };

        await manager.query(
          `INSERT INTO positions (id, name, latitude, longitude, distance_km, type)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name,
             latitude = EXCLUDED.latitude,
             longitude = EXCLUDED.longitude,
             type = EXCLUDED.type`,
          [stationId, metadata.name, metadata.latitude, metadata.longitude, metadata.distanceKm, metadata.type],
        );
      }

      for (const observation of seedData.observations) {
        await manager.query(
          `INSERT INTO position_data (id, station_id, datetime, salinity, water_level)
           VALUES ($1, $2, $3::timestamptz, $4, $5)
           ON CONFLICT (id) DO UPDATE SET
             station_id = EXCLUDED.station_id,
             datetime = EXCLUDED.datetime,
             salinity = EXCLUDED.salinity,
             water_level = EXCLUDED.water_level`,
          [observation.id, observation.stationId, observation.datetime, observation.salinity, observation.waterLevel],
        );
      }
    });

    this.logger.log(`Seeded ${seedData.observations.length} records from CSV files.`);
  }

  private resolveSeedFilePaths(): string[] {
    return SEED_FILES.filter(filePath => fs.existsSync(filePath));
  }

  private buildSeedData(seedFiles: string[], limit: number): {
    observations: Array<{
      id: string;
      stationId: string;
      datetime: string;
      salinity: number | null;
      waterLevel: number | null;
    }>;
    stationIds: string[];
  } {
    const observations = new Map<
      string,
      { id: string; stationId: string; datetime: string; salinity: number | null; waterLevel: number | null }
    >();
    const stationIds = new Set<string>();

    for (const filePath of seedFiles) {
      const rows = this.parseCsv(fs.readFileSync(filePath, 'utf8'));

      for (const row of rows) {
        const datetime = this.parseDateTime(row.Date);

        for (const [header, rawValue] of Object.entries(row)) {
          if (header === 'Date') continue;
          if (!/^[ZS]/.test(header)) continue;

          const stationId = header.slice(1).toLowerCase();
          const value = this.parseNumber(rawValue);
          const key = `${stationId}|${datetime}`;
          const observation = observations.get(key) ?? {
            id: `${stationId}-${datetime.slice(0, 19).replace(/\D/g, '')}`,
            stationId,
            datetime,
            salinity: null,
            waterLevel: null,
          };

          if (header.startsWith('S')) observation.salinity = value;
          if (header.startsWith('Z')) observation.waterLevel = value;

          observations.set(key, observation);
          stationIds.add(stationId);

          if (observations.size >= limit) {
            return { observations: [...observations.values()], stationIds: [...stationIds].sort() };
          }
        }
      }
    }

    return { observations: [...observations.values()], stationIds: [...stationIds].sort() };
  }

  private parseCsv(content: string): Array<Record<string, string>> {
    const lines = content.replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean);
    const headers = lines[0].split(',').map(header => header.replace(/^\uFEFF/, '').trim());

    return lines.slice(1).map(line => {
      const values = line.split(',');
      return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
    });
  }

  private parseDateTime(value: string): string {
    const match = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(value.trim());
    if (!match) {
      throw new Error(`Invalid CSV datetime: ${value}`);
    }

    const [, year, month, day, hour, minute, second] = match;
    return `${year}-${month}-${day}T${hour}:${minute}:${second}+07:00`;
  }

  private parseNumber(value: string): number | null {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
}
