const fs = require('node:fs');
const crypto = require('node:crypto');
const { Client } = require('pg');
const {
  buildDemoDataset,
  loadEnv,
  publicStations,
  rootDir,
  sourcePath,
} = require('./import-csv');

const confirmValue = 'load-public-demo-with-provenance';
const sourceCode = 'baodinh-public-demo';
const sourceTimezone = 'UTC+07:00';
const batchSize = 500;

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function insertValues(rows, columnCount) {
  const values = [];
  const tuples = rows.map((row, rowIndex) => {
    const placeholders = row.map((value, columnIndex) => {
      values.push(value);
      return `$${rowIndex * columnCount + columnIndex + 1}`;
    });
    return `(${placeholders.join(', ')})`;
  });
  return { tuples: tuples.join(', '), values };
}

async function assertSchema(client) {
  const requiredRelations = [
    'data_imports',
    'raw_observations',
    'position_data',
  ];
  const result = await client.query(
    `SELECT table_name
       FROM information_schema.tables
      WHERE table_schema = current_schema()
        AND table_name = ANY($1::text[])`,
    [requiredRelations],
  );
  const found = new Set(result.rows.map((row) => row.table_name));
  const missing = requiredRelations.filter((name) => !found.has(name));
  if (missing.length) {
    throw new Error(
      `Phase 2 schema is missing (${missing.join(', ')}). Apply scripts/sql/phase2-data-platform.sql first.`,
    );
  }

  const stations = await client.query(
    'SELECT id FROM positions WHERE id = ANY($1::varchar[])',
    [Object.keys(publicStations)],
  );
  const present = new Set(stations.rows.map((row) => row.id));
  const missingStations = Object.keys(publicStations).filter((id) => !present.has(id));
  if (missingStations.length) {
    throw new Error(
      `The database is missing approved station rows (${missingStations.join(', ')}). The Phase 2 importer does not create or change station coordinates.`,
    );
  }
}

async function upsertImport(client, dataset, sourceHash) {
  const result = await client.query(
    `INSERT INTO data_imports (
       source_code, source_filename, source_file_sha256, source_timezone,
       window_start, window_end, source_salinity_unit,
       normalized_salinity_unit, water_level_unit, status,
       loaded_record_count, metadata
     ) VALUES (
       $1, 'BaoDinh.csv', $2, $3,
       '2024-06-01T00:00:00+07:00'::timestamptz,
       '2024-07-31T23:59:59+07:00'::timestamptz,
       'g/L', 'mg/L', 'm', 'registered', 0, $4::jsonb
     )
     ON CONFLICT (source_code, source_file_sha256) DO UPDATE SET
       source_filename = EXCLUDED.source_filename,
       source_timezone = EXCLUDED.source_timezone,
       window_start = EXCLUDED.window_start,
       window_end = EXCLUDED.window_end,
       source_salinity_unit = EXCLUDED.source_salinity_unit,
       normalized_salinity_unit = EXCLUDED.normalized_salinity_unit,
       water_level_unit = EXCLUDED.water_level_unit,
       metadata = EXCLUDED.metadata
     RETURNING id`,
    [
      sourceCode,
      sourceHash,
      sourceTimezone,
      JSON.stringify({
        stations: Object.keys(publicStations),
        rowCount: dataset.observations.length,
        conversion: 'salinity g/L × 1000 = mg/L',
      }),
    ],
  );
  return result.rows[0].id;
}

async function upsertRawObservations(client, importId, observations) {
  for (let offset = 0; offset < observations.length; offset += batchSize) {
    const batch = observations.slice(offset, offset + batchSize).map((row) => [
      importId,
      row.stationId,
      row.datetime,
      row.sourceRow,
      row.rawSalinity,
      row.rawWaterLevel,
      row.salinityGPerL,
      row.waterLevelMeters,
    ]);
    const { tuples, values } = insertValues(batch, 8);
    await client.query(
      `INSERT INTO raw_observations (
         import_id, station_id, observed_at, source_row_number,
         raw_salinity_value, raw_water_level_value,
         salinity_g_per_l, water_level_m
       ) VALUES ${tuples}
       ON CONFLICT (import_id, station_id, observed_at) DO UPDATE SET
         source_row_number = EXCLUDED.source_row_number,
         raw_salinity_value = EXCLUDED.raw_salinity_value,
         raw_water_level_value = EXCLUDED.raw_water_level_value,
         salinity_g_per_l = EXCLUDED.salinity_g_per_l,
         water_level_m = EXCLUDED.water_level_m`,
      values,
    );
  }
}

async function upsertNormalizedObservations(client, importId, observations) {
  for (let offset = 0; offset < observations.length; offset += batchSize) {
    const batch = observations.slice(offset, offset + batchSize).map((row) => [
      row.id,
      row.stationId,
      row.datetime,
      row.salinity,
      row.waterLevel,
      importId,
      'unverified',
    ]);
    const { tuples, values } = insertValues(batch, 7);
    await client.query(
      `INSERT INTO position_data (
         id, station_id, datetime, salinity, water_level,
         source_import_id, quality_status
       ) VALUES ${tuples}
       ON CONFLICT (id) DO UPDATE SET
         station_id = EXCLUDED.station_id,
         datetime = EXCLUDED.datetime,
         salinity = EXCLUDED.salinity,
         water_level = EXCLUDED.water_level,
         source_import_id = EXCLUDED.source_import_id,
         quality_status = EXCLUDED.quality_status`,
      values,
    );
  }
}

async function loadDataset(dataset, sourceHash) {
  if (process.env.PHASE2_DATA_IMPORT_CONFIRM !== confirmValue) {
    throw new Error(
      `Set PHASE2_DATA_IMPORT_CONFIRM=${confirmValue} to authorize the idempotent provenance import.`,
    );
  }
  const connectionString = process.env.DATABASE_URL || process.env.DATABASE_URL_UNPOOLED;
  if (!connectionString) {
    throw new Error('DATABASE_URL or DATABASE_URL_UNPOOLED is required; its value is never printed by this script.');
  }

  const target = new URL(connectionString);
  const databaseName = decodeURIComponent(target.pathname.replace(/^\//, ''));
  if (databaseName !== 'neondb' || !target.hostname.endsWith('.neon.tech')) {
    throw new Error('The Phase 2 import is restricted to the configured Neon database named neondb.');
  }
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    application_name: 'full_web_org_phase2_import',
  });

  await client.connect();
  try {
    await client.query('BEGIN');
    await assertSchema(client);
    const importId = await upsertImport(client, dataset, sourceHash);
    await upsertRawObservations(client, importId, dataset.rawObservations);
    await upsertNormalizedObservations(client, importId, dataset.observations);
    await client.query(
      `UPDATE data_imports
          SET status = 'loaded',
              loaded_record_count = $2,
              last_loaded_at = NOW()
        WHERE id = $1`,
      [importId, dataset.observations.length],
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

async function main() {
  loadEnv(require('node:path').join(rootDir, '.env.local'));
  loadEnv(require('node:path').join(rootDir, '.env'));
  const dataset = buildDemoDataset();
  const sourceHash = sha256File(sourcePath);
  const mode = process.argv.includes('--apply') ? 'apply' : 'dry-run';
  const summary = {
    mode,
    source: 'BaoDinh.csv',
    sourceFileSha256: sourceHash,
    timeZone: sourceTimezone,
    windowLocalTime: {
      from: '2024-06-01 00:00:00',
      to: '2024-07-31 23:59:59',
      offset: '+07:00',
    },
    stations: Object.keys(publicStations),
    rawObservationRows: dataset.rawObservations.length,
    normalizedObservationRows: dataset.observations.length,
    salinityValueCounts: dataset.valueSummary,
    waterLevelValueCounts: dataset.waterLevelSummary,
    importIsIdempotent: true,
    writesForecastOrImputationResults: false,
  };

  if (mode === 'dry-run') {
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
    process.stdout.write('No database connection was opened and no rows were changed.\n');
    return;
  }

  await loadDataset(dataset, sourceHash);
  process.stdout.write(`${JSON.stringify({ ...summary, mode: 'loaded' }, null, 2)}\n`);
}

main().catch((error) => {
  const aggregateDetails = error instanceof AggregateError
    ? error.errors.map((item) => item?.code || item?.message).filter(Boolean).join(', ')
    : '';
  const message = error?.message || error?.code || aggregateDetails || 'Unknown error';
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
