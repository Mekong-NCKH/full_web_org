const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { Client } = require('pg');
const { loadEnv, rootDir } = require('./import-csv');

const migrationPath = path.join(rootDir, 'scripts', 'sql', 'phase2-data-platform.sql');
const confirmationValue = 'apply-phase2-additive-schema';

async function main() {
  loadEnv(path.join(rootDir, '.env.local'));
  loadEnv(path.join(rootDir, '.env'));
  const sql = fs.readFileSync(migrationPath, 'utf8');
  const sha256 = crypto.createHash('sha256').update(sql).digest('hex');
  const mode = process.argv.includes('--apply') ? 'apply' : 'check';

  if (mode === 'check') {
    process.stdout.write(`${JSON.stringify({ mode, migration: 'phase2-data-platform.sql', sha256 }, null, 2)}\n`);
    process.stdout.write('No database connection was opened and no schema was changed.\n');
    return;
  }

  if (process.env.PHASE2_SCHEMA_CONFIRM !== confirmationValue) {
    throw new Error(`Set PHASE2_SCHEMA_CONFIRM=${confirmationValue} to authorize the additive schema migration.`);
  }
  const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL_UNPOOLED or DATABASE_URL is required; its value is never printed by this script.');
  }

  const target = new URL(connectionString);
  const databaseName = decodeURIComponent(target.pathname.replace(/^\//, ''));
  if (databaseName !== 'neondb' || !target.hostname.endsWith('.neon.tech')) {
    throw new Error('The Phase 2 schema migration is restricted to the configured Neon database named neondb.');
  }
  if (target.hostname.includes('-pooler.')) {
    throw new Error('Schema migrations require the direct, unpooled Neon connection string. Set DATABASE_URL_UNPOOLED.');
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    application_name: 'full_web_org_phase2_schema',
  });
  await client.connect();
  try {
    await client.query(sql);
  } finally {
    await client.end();
  }

  process.stdout.write(`${JSON.stringify({ mode: 'applied', migration: 'phase2-data-platform.sql', sha256 }, null, 2)}\n`);
}

main().catch((error) => {
  const aggregateDetails = error instanceof AggregateError
    ? error.errors.map((item) => item?.code || item?.message).filter(Boolean).join(', ')
    : '';
  const message = error?.message || error?.code || aggregateDetails || 'Unknown error';
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
