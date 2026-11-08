const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');

const rootDir = path.resolve(__dirname, '..');
const IMPORT_LIMIT = Number(process.env.IMPORT_LIMIT || 100);

loadEnv(path.join(rootDir, '.env'));

const files = [
  path.join(rootDir, 'BaoDinh.csv'),
  path.join(rootDir, 'GoCong.csv'),
];

const stationMetadata = {
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

function loadEnv(envPath) {
  if (!fs.existsSync(envPath)) return;

  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separator = trimmed.indexOf('=');
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function parseCsv(content) {
  const lines = content.replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean);
  const headers = splitCsvLine(lines[0]).map((header) => header.replace(/^\uFEFF/, '').trim());

  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
  });
}

function splitCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

function parseDateTime(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) throw new Error(`Invalid CSV datetime: ${value}`);

  const [, year, month, day, hour, minute, second] = match;
  return `${year}-${month}-${day}T${hour}:${minute}:${second}+07:00`;
}

function parseNumber(value) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function stationIdFromHeader(header) {
  return header.slice(1).toLowerCase();
}

function buildObservations() {
  const observations = new Map();
  const stationIds = new Set();

  for (const file of files) {
    const rows = parseCsv(fs.readFileSync(file, 'utf8'));

    for (const row of rows) {
      const datetime = parseDateTime(row.Date);

      for (const [header, rawValue] of Object.entries(row)) {
        if (header === 'Date') continue;
        if (!/^[ZS]/.test(header)) continue;

        const stationId = stationIdFromHeader(header);
        const value = parseNumber(rawValue);
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

        if (observations.size >= IMPORT_LIMIT) {
          return {
            observations: [...observations.values()],
            stationIds: [...stationIds].sort(),
          };
        }
      }
    }
  }

  return {
    observations: [...observations.values()],
    stationIds: [...stationIds].sort(),
  };
}

async function main() {
  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
  const client = hasDatabaseUrl
    ? new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      })
    : new Client({
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT || 5432),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      });

  const { observations, stationIds } = buildObservations();

  await client.connect();
  await client.query('BEGIN');

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS positions (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        latitude DOUBLE PRECISION NOT NULL,
        longitude DOUBLE PRECISION NOT NULL,
        distance_km DOUBLE PRECISION,
        type VARCHAR(100)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS position_data (
        id VARCHAR(50) PRIMARY KEY,
        station_id VARCHAR(50) NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
        datetime TIMESTAMP WITH TIME ZONE NOT NULL,
        salinity DOUBLE PRECISION,
        water_level DOUBLE PRECISION
      )
    `);

    for (const stationId of stationIds) {
      const metadata = stationMetadata[stationId] ?? {
        name: stationId,
        latitude: 10.35,
        longitude: 106.55,
        distanceKm: null,
        type: 'TRẠM ĐO',
      };

      await client.query(
        `INSERT INTO positions (id, name, latitude, longitude, distance_km, type)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           latitude = EXCLUDED.latitude,
           longitude = EXCLUDED.longitude,
           distance_km = EXCLUDED.distance_km,
           type = EXCLUDED.type`,
        [stationId, metadata.name, metadata.latitude, metadata.longitude, metadata.distanceKm, metadata.type],
      );
    }

    for (const observation of observations) {
      await client.query(
        `INSERT INTO position_data (id, station_id, datetime, salinity, water_level)
         VALUES ($1, $2, $3::timestamptz, $4, $5)
         ON CONFLICT (id) DO UPDATE SET
           station_id = EXCLUDED.station_id,
           datetime = EXCLUDED.datetime,
           salinity = EXCLUDED.salinity,
           water_level = EXCLUDED.water_level`,
        [
          observation.id,
          observation.stationId,
          observation.datetime,
          observation.salinity,
          observation.waterLevel,
        ],
      );
    }

    await client.query('COMMIT');
    console.log(`Imported ${stationIds.length} stations and ${observations.length} observations.`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
