const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');

const rootDir = path.resolve(__dirname, '..');
const sourcePath = path.join(rootDir, 'BaoDinh.csv');
const demoStart = '2024-06-01 00:00:00';
const demoEnd = '2024-07-31 23:00:00';
const hoursPerStation = 1464;
const salinityToMgL = 1000;
const confirmation = 'rebuild-public-demo-2024-06-07';

const publicStations = {
  baodinh: {
    name: 'Bao Dinh',
    latitude: 10.388921,
    longitude: 106.341713,
    source: 'Sanility_GIS_Monitoring/cong_locations.csv',
  },
  gocat: {
    name: 'Go Cat',
    latitude: 10.364613,
    longitude: 106.370195,
    source: 'Sanility_GIS_Monitoring/cong_locations.csv',
  },
  vamkenh: {
    name: 'Vam Kenh',
    latitude: 10.283028,
    longitude: 106.738487,
    source: 'Sanility_GIS_Monitoring/cong_locations.csv',
  },
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

function parseCsv(content) {
  const lines = content.replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) throw new Error('BaoDinh.csv is empty or has no data rows.');

  const headers = splitCsvLine(lines[0]).map(header => header.trim());
  return lines.slice(1).map((line, index) => {
    const values = splitCsvLine(line);
    if (values.length !== headers.length) {
      throw new Error(`CSV row ${index + 2} has ${values.length} values; expected ${headers.length}.`);
    }
    return Object.fromEntries(headers.map((header, column) => [header, values[column] ?? '']));
  });
}

function parseSourceValue(rawValue, label) {
  const value = rawValue.trim();
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`Invalid numeric value for ${label}: ${value}`);
  return parsed;
}

function sourceDateToTimestamp(dateValue) {
  const match = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(dateValue.trim());
  if (!match) throw new Error(`Invalid CSV date: ${dateValue}`);

  const [, year, month, day, hour, minute, second] = match;
  const localDate = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}+07:00`);
  if (Number.isNaN(localDate.getTime())) throw new Error(`Invalid CSV date: ${dateValue}`);
  return localDate.toISOString();
}

function buildDemoDataset() {
  if (!fs.existsSync(sourcePath)) throw new Error(`Selected source file is missing: ${sourcePath}`);
  const rows = parseCsv(fs.readFileSync(sourcePath, 'utf8'));
  const requiredHeaders = ['Date', ...Object.keys(publicStations).flatMap(id => [`S${id}`, `Z${id}`])];
  const headers = new Set(Object.keys(rows[0]));
  const missing = requiredHeaders.filter(header => !headers.has(header));
  if (missing.length) throw new Error(`BaoDinh.csv is missing required columns: ${missing.join(', ')}`);

  const selectedRows = rows
    .map((row, index) => ({ row, sourceRow: index + 2 }))
    .filter(({ row }) => row.Date >= demoStart && row.Date <= demoEnd);
  if (selectedRows.length !== hoursPerStation) {
    throw new Error(`Expected ${hoursPerStation} hourly demo rows; found ${selectedRows.length}.`);
  }

  const seenTimes = new Set();
  const observations = [];
  const rawObservations = [];
  const valueSummary = Object.fromEntries(Object.keys(publicStations).map(id => [id, {
    rowCount: 0,
    numericCount: 0,
    missingCount: 0,
    zeroCount: 0,
    negativeCount: 0,
    minMgL: null,
    maxMgL: null,
  }]));
  const waterLevelSummary = Object.fromEntries(Object.keys(publicStations).map(id => [id, {
    rowCount: 0,
    numericCount: 0,
    missingCount: 0,
    zeroCount: 0,
    negativeCount: 0,
    minMeters: null,
    maxMeters: null,
  }]));

  for (const { row, sourceRow } of selectedRows) {
    const timestamp = sourceDateToTimestamp(row.Date);
    if (seenTimes.has(timestamp)) throw new Error(`Duplicate demo timestamp: ${row.Date}`);
    seenTimes.add(timestamp);

    for (const stationId of Object.keys(publicStations)) {
      const sourceSalinityGPerL = parseSourceValue(row[`S${stationId}`], `S${stationId} at ${row.Date}`);
      const waterLevelMeters = parseSourceValue(row[`Z${stationId}`], `Z${stationId} at ${row.Date}`);
      const salinityMgL = sourceSalinityGPerL === null ? null : sourceSalinityGPerL * salinityToMgL;
      const summary = valueSummary[stationId];
      const waterSummary = waterLevelSummary[stationId];
      summary.rowCount += 1;
      waterSummary.rowCount += 1;

      if (salinityMgL !== null) {
        summary.numericCount += 1;
        if (salinityMgL === 0) summary.zeroCount += 1;
        if (salinityMgL < 0) summary.negativeCount += 1;
        summary.minMgL = summary.minMgL === null ? salinityMgL : Math.min(summary.minMgL, salinityMgL);
        summary.maxMgL = summary.maxMgL === null ? salinityMgL : Math.max(summary.maxMgL, salinityMgL);
      } else {
        summary.missingCount += 1;
      }

      if (waterLevelMeters !== null) {
        waterSummary.numericCount += 1;
        if (waterLevelMeters === 0) waterSummary.zeroCount += 1;
        if (waterLevelMeters < 0) waterSummary.negativeCount += 1;
        waterSummary.minMeters = waterSummary.minMeters === null ? waterLevelMeters : Math.min(waterSummary.minMeters, waterLevelMeters);
        waterSummary.maxMeters = waterSummary.maxMeters === null ? waterLevelMeters : Math.max(waterSummary.maxMeters, waterLevelMeters);
      } else {
        waterSummary.missingCount += 1;
      }

      observations.push({
        id: `${stationId}-${timestamp.replace(/\D/g, '').slice(0, 12)}`,
        stationId,
        datetime: timestamp,
        salinity: salinityMgL,
        waterLevel: waterLevelMeters,
      });
      rawObservations.push({
        stationId,
        datetime: timestamp,
        sourceRow,
        rawSalinity: row[`S${stationId}`] ?? '',
        rawWaterLevel: row[`Z${stationId}`] ?? '',
        salinityGPerL: sourceSalinityGPerL,
        waterLevelMeters,
      });
    }
  }

  if (seenTimes.size !== hoursPerStation) throw new Error('Demo timestamps are incomplete.');
  for (const [stationId, summary] of Object.entries(valueSummary)) {
    if (summary.rowCount !== hoursPerStation) {
      throw new Error(`${stationId} has ${summary.rowCount} salinity rows; expected ${hoursPerStation}.`);
    }
    if (waterLevelSummary[stationId].rowCount !== hoursPerStation) {
      throw new Error(`${stationId} has ${waterLevelSummary[stationId].rowCount} water-level rows; expected ${hoursPerStation}.`);
    }
  }

  return { observations, rawObservations, valueSummary, waterLevelSummary };
}

function createInsertValues(rows, columns) {
  const values = [];
  const tuples = rows.map((row, rowIndex) => {
    const placeholders = columns.map((_, columnIndex) => {
      values.push(row[columnIndex]);
      return `$${rowIndex * columns.length + columnIndex + 1}`;
    });
    return `(${placeholders.join(', ')})`;
  });
  return { tuples: tuples.join(', '), values };
}

async function insertObservations(client, observations) {
  const batchSize = 1000;
  for (let offset = 0; offset < observations.length; offset += batchSize) {
    const batch = observations.slice(offset, offset + batchSize).map(row => [
      row.id,
      row.stationId,
      row.datetime,
      row.salinity,
      row.waterLevel,
    ]);
    const { tuples, values } = createInsertValues(batch, ['id', 'station_id', 'datetime', 'salinity', 'water_level']);
    await client.query(
      `INSERT INTO position_data (id, station_id, datetime, salinity, water_level) VALUES ${tuples}`,
      values,
    );
  }
}

async function rebuildDatabase(dataset) {
  if (process.env.DEMO_DATA_REBUILD_CONFIRM !== confirmation) {
    throw new Error(`Set DEMO_DATA_REBUILD_CONFIRM=${confirmation} to authorize replacing the two monitoring tables.`);
  }
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required; it was not printed or written by this script.');

  const target = new URL(process.env.DATABASE_URL);
  const databaseName = decodeURIComponent(target.pathname.replace(/^\//, ''));
  if (databaseName !== 'neondb' || !target.hostname.endsWith('.neon.tech')) {
    throw new Error('The rebuild is restricted to the configured Neon database named neondb.');
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    application_name: 'full_web_org_demo_rebuild',
  });

  await client.connect();
  try {
    await client.query('BEGIN');
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
    await client.query("COMMENT ON COLUMN position_data.salinity IS 'Normalized value in mg/L; source S columns in BaoDinh.csv are g/L and are multiplied by 1000.'");
    await client.query("COMMENT ON COLUMN position_data.water_level IS 'Value in meters relative to the source sea-level reference.'");

    // Replace only the application monitoring tables; unrelated Neon tables are untouched.
    await client.query('TRUNCATE TABLE position_data, positions');
    for (const [stationId, station] of Object.entries(publicStations)) {
      await client.query(
        `INSERT INTO positions (id, name, latitude, longitude, distance_km, type)
         VALUES ($1, $2, $3, $4, NULL, 'monitoring')`,
        [stationId, station.name, station.latitude, station.longitude],
      );
    }
    await insertObservations(client, dataset.observations);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

async function main() {
  loadEnv(path.join(rootDir, '.env.local'));
  loadEnv(path.join(rootDir, '.env'));
  const dataset = buildDemoDataset();
  const mode = process.argv.includes('--apply') ? 'apply' : 'dry-run';
  const result = {
    mode,
    source: 'BaoDinh.csv',
    sourceSalinityUnit: 'g/L',
    outputSalinityUnit: 'mg/L',
    conversion: 'source value × 1000',
    waterLevelUnit: 'm',
    windowLocalTime: { from: demoStart, to: demoEnd, offset: '+07:00' },
    stations: Object.keys(publicStations),
    hourlyRowsPerStation: hoursPerStation,
    observationsToWrite: dataset.observations.length,
    salinitySummaryMgL: dataset.valueSummary,
    waterLevelSummaryMeters: dataset.waterLevelSummary,
  };

  if (mode === 'dry-run') {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    process.stdout.write('No database connection was opened and no rows were changed. Use --apply with the explicit confirmation variable to replace only positions and position_data.\n');
    return;
  }

  await rebuildDatabase(dataset);
  process.stdout.write(`${JSON.stringify({ ...result, mode: 'applied' }, null, 2)}\n`);
}

if (require.main === module) {
  main().catch(error => {
    const aggregateDetails = error instanceof AggregateError
      ? error.errors.map(item => item?.code || item?.message).filter(Boolean).join(', ')
      : '';
    const message = error?.message || error?.code || aggregateDetails || 'Unknown error';
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
}

module.exports = {
  buildDemoDataset,
  loadEnv,
  publicStations,
  rootDir,
  sourcePath,
};
