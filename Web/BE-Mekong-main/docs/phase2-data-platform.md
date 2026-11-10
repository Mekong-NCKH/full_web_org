# Phase 2 — Provenance and model-result storage

## Scope

Phase 2 extends the Phase 1 monitoring database with source-level provenance and storage for later forecasting, imputation, and threshold-rule work. It does not implement a forecasting model, imputation method, alert delivery, or new public API response. The V1 forecast and imputation routes remain unavailable until a later integration phase.

The migration is additive. It keeps the existing `positions` and `position_data` tables and the 4,392 historical demo observations. It adds source import metadata, raw source values, model registry records, forecast and imputation run/results tables, and station monitoring rules. Model-generated values are stored separately from observed measurements; imputation never overwrites an observed value.

## Data and provenance rules

- The source remains `BaoDinh.csv`, with the approved demo window `2024-06-01 00:00:00` through `2024-07-31 23:59:59` at UTC+07:00.
- Only the coordinate-verified stations `baodinh`, `gocat`, and `vamkenh` are loaded.
- Raw salinity is retained in source units (g/L) and the normalized observation remains in mg/L (`g/L × 1,000`). Water level remains in meters.
- The raw CSV field text and parsed numeric value are both stored. A blank field has empty raw text and a `NULL` numeric value; zero and negative values remain numeric zero and negatives.
- Each loaded file is identified by SHA-256. Re-running the same source file upserts on its import/station/timestamp key and normalized observation ID, so rows do not multiply.
- Source provenance does not imply field validation. Imported observation quality remains `unverified` until a separate quality review changes it.
- The schema migration leaves existing Phase 1 rows with `NULL` `source_import_id`. After the Phase 2 import, the selected June–July demo rows link to the matching `data_imports` record; their measurement values remain unchanged.

## Schema map

| Table | Purpose |
| --- | --- |
| `positions`, `position_data` | Existing station metadata and normalized observed measurements |
| `data_imports` | Source file hash, units, timezone, public window, and import status |
| `raw_observations` | Source field text and parsed source-unit values by station and time |
| `model_versions` | Model task, version, artifact/code provenance, configuration, and validation metrics |
| `forecast_runs`, `forecast_results` | Forecast execution metadata and predicted values, separate from observations |
| `imputation_runs`, `imputation_results` | Imputation execution metadata and proposed values, without replacing original observations |
| `monitoring_rules` | Station-specific salinity or water-level thresholds; no alert delivery is implemented |

## Safe execution order

Run from `Web/BE-Mekong-main` in PowerShell.

1. Check the existing Phase 1 demo input without connecting to a database:

   ```powershell
   npm run data:demo:check
   ```

2. Review the migration SQL and dry-run the provenance import. The import command avoids opening a database connection:

   ```powershell
   npm run data:phase2:check
   ```

3. After reviewing the SQL and backing up the intended database, apply the additive schema to the configured Neon database. Set a direct, unpooled `DATABASE_URL_UNPOOLED` in the local environment (the command falls back to `DATABASE_URL` only when it is also direct). The command reads `.env.local` before `.env`, does not print the connection string, requires database `neondb` on a Neon host, and requires an explicit confirmation value:

   ```powershell
   $env:PHASE2_SCHEMA_CONFIRM = 'apply-phase2-additive-schema'
   npm run db:phase2:apply
   Remove-Item Env:PHASE2_SCHEMA_CONFIRM
   ```

   The same SQL file is mounted into Docker initialization for a fresh local database. The guarded `db:phase2:apply` command is Neon-only; apply this SQL to an already initialized local database with a local-only database tool.

4. After confirming the migration exists and station metadata is correct, load the source rows transactionally. This command reads `DATABASE_URL` first and falls back to `DATABASE_URL_UNPOOLED` only if the primary variable is absent; it does not print the connection string. It only upserts the Phase 2 source records and selected normalized demo observations; it does not truncate tables or change station coordinates.

   ```powershell
   $env:PHASE2_DATA_IMPORT_CONFIRM = 'load-public-demo-with-provenance'
   npm run data:phase2:load
   Remove-Item Env:PHASE2_DATA_IMPORT_CONFIRM
   ```

The importer refuses to run if the Phase 2 tables or approved station rows are missing. A failed import rolls back the transaction. It does not create forecast or imputation results.

## Verification queries

Run these read-only queries after a database administrator confirms the schema and load:

```sql
SELECT source_code, source_filename, source_file_sha256, status, loaded_record_count
FROM data_imports
ORDER BY created_at DESC;

SELECT p.id, COUNT(*) AS raw_rows,
       MIN(r.observed_at) AS first_observation,
       MAX(r.observed_at) AS last_observation
FROM raw_observations r
JOIN positions p ON p.id = r.station_id
GROUP BY p.id
ORDER BY p.id;

SELECT p.id, COUNT(*) AS normalized_rows,
       COUNT(*) FILTER (WHERE d.source_import_id IS NULL) AS rows_without_source_link,
       COUNT(*) FILTER (WHERE d.quality_status <> 'unverified') AS reviewed_rows
FROM position_data d
JOIN positions p ON p.id = d.station_id
WHERE p.id IN ('baodinh', 'gocat', 'vamkenh')
  AND d.datetime >= '2024-05-31T17:00:00Z'
  AND d.datetime <= '2024-07-31T16:00:00Z'
GROUP BY p.id
ORDER BY p.id;
```

Expected Phase 2 demo load: one import record, 1,464 raw rows and 1,464 normalized rows per approved station (4,392 total), and `unverified` quality status. Forecast and imputation result tables should remain empty until a later phase registers and evaluates a model.

## Current completion status

The production migration and import completed on 2026-11-08. The import is `loaded` with 4,392 source rows and 4,392 normalized rows linked to its source record; each approved station has 1,464 rows. Quality remains `unverified`. Forecast and imputation model/run/result tables and monitoring rules are empty, as model integration and alert processing are outside Phase 2.
