# Monitoring API v1

This document describes the public V1 contract for the `positions` and `position_data` schema, including the additive Stage 4 GIS reference endpoint. Salinity is normalized from the selected CSV's g/L values to mg/L (multiply by 1000). Water level remains in meters and uses the source sea-level reference. Measurement quality remains `unverified`; responses describe the historical demo dataset and do not claim live readings. The additive Phase 2 schema can record source-file and raw-field provenance after its guarded import runs; that provenance does not change the quality status or observation contract.

The public station set is the current intersection of station headers in `BaoDinh.csv` and coordinates in `Sanility_GIS_Monitoring/cong_locations.csv`: `baodinh`, `gocat`, and `vamkenh`. V1 returns canonical coordinates from `cong_locations.csv`; it does not expose the legacy database coordinates for other stations. The importer now reads `BaoDinh.csv` only, per the Phase 0 Go Cat source choice. Existing database rows still have unverified provenance until the selected source is imported and reconciled.

All timestamps in v1 query parameters must be ISO 8601 with `Z` or an explicit numeric offset (URL-encode `+` as `%2B`); responses are UTC. Date ranges are inclusive. Errors use NestJS's JSON HTTP exception format (`statusCode`, `message`, `error`).

| Endpoint | Purpose |
| --- | --- |
| `GET /api/v1/status` | Report API state, public-window configuration, measurement provenance, configured pipelines, and available historical/replay/live/forecast modes. |
| `GET /api/v1/stations` | List approved stations that exist in the database and have data in the public window. Coordinates include their source path. |
| `GET /api/v1/metadata/data-range` | Earliest/latest timestamps for approved stations inside the public window, or `{ "from": null, "to": null }` when empty. |
| `GET /api/v1/observations/snapshot?at=...&maxAgeHours=...` | Per approved station, return the latest record at or before `at`, bounded by the window and `at - maxAgeHours`; otherwise `observation: null` and `status: no_data`. Default age is 6 hours, allowed range 0-168. Future records are never used. |
| `GET /api/v1/stations/:id/observations?from=...&to=...` | Inclusive station series, at most 31 days and 10,000 returned rows. `truncated` indicates more rows exist. Unknown or non-public station returns 404. |
| `GET /api/v1/stations/:id/forecasts` | Reserved contract; returns 501 until a forecast model is integrated. |
| `GET /api/v1/stations/:id/imputations` | Reserved contract; returns 501 until an imputation model is integrated. |
| `GET /api/v1/gis/reference-rules` | Return the versioned, unconfirmed GIS reference rules used by the historical UI. |
| `GET /api/v1/gis/reference-status?at=...&mode=...` | Evaluate the versioned legacy GIS reference rules against the latest observed values at or before `at`. It returns a reference simulation, never an operational gate command. |

The GIS reference endpoint accepts `mode=historical` (default) or `mode=replay`. It applies rule set `mekong-legacy-gis-reference` version `1.0.0`, marked `unconfirmed` and intended only for reference simulation. The Vam Kenh rule's source threshold is `1.5 g/L`, normalized to `1,500 mg/L`; the Bao Dinh and Go Cat labels are copied from the legacy script. Results identify the `BaoDinh.csv` observed-data source and preserve the observation's `unverified` quality. A missing observation or required measurement produces an unknown result. Live mode and forecast mode remain unavailable.

The status endpoint now reports `dataModes`: `historical` and `replay` are available, while `live` and `forecast` are `not_configured`. Forecast and imputation routes remain separate and unavailable until models are integrated.

Example GIS response:

```json
{
  "success": true,
  "mode": "replay",
  "asOf": "2024-06-15T00:00:00.000Z",
  "dataKind": "observed",
  "source": "BaoDinh.csv",
  "ruleSet": {
    "id": "mekong-legacy-gis-reference",
    "version": "1.0.0",
    "confirmationStatus": "unconfirmed",
    "intendedUse": "reference_simulation_only"
  },
  "data": [
    {
      "station": { "id": "vamkenh", "name": "Vam Kenh" },
      "observation": {
        "observedAt": "2024-06-15T00:00:00.000Z",
        "salinity": { "value": 1800, "unit": "mg/L" }
      },
      "referenceStatus": {
        "code": "close_for_storage",
        "label": "Đóng trữ",
        "basis": "Legacy rule: salinity > 1.5 g/L (1500 mg/L).",
        "thresholdMgL": 1500
      }
    }
  ]
}
```

Production must set `PUBLIC_DATA_START=2024-06-01T00:00:00+07:00` and `PUBLIC_DATA_END=2024-07-31T23:59:59+07:00` for the selected June–July 2024 demo. The interval must be ordered and no longer than 62 days. Data endpoints return 503 when either setting is absent or invalid. Local non-production runs may omit both settings. Requests outside a configured window return 400.

The same observation format is used in series and snapshots:

```json
{"id":"example","observedAt":"2024-06-01T00:00:00.000Z","salinity":{"value":450,"unit":"mg/L"},"waterLevel":{"value":0,"unit":"m","reference":"sea_level"},"quality":"unverified"}
```

Station responses use this shape:

```json
{"id":"gocat","name":"Go Cat","location":{"latitude":10.364613,"longitude":106.370195,"source":"Sanility_GIS_Monitoring/cong_locations.csv"}}
```

The legacy `/api/data/positions` and `/api/data/date-range/:date/:startTime/:endTime/:positionId` routes remain available for the existing frontend, but now return only approved stations/locations and observations inside the configured public window. The legacy date and time use UTC+07:00 and must describe valid calendar dates. V1 uses Nest's default error response rather than the success envelope on failure.

## Database and import

Application startup no longer runs the legacy 100-record bootstrap. Initialize a new database with `docker/postgres/init/` or another reviewed schema migration. For an existing database, the optional `scripts/sql/phase1-observation-index.sql` adds a query index; obtain normal database change authorization and take appropriate backups before applying it. The Phase 2 provenance and model-result schema is in `scripts/sql/phase2-data-platform.sql`; see `docs/phase2-data-platform.md` for its dry-run, guarded migration, and idempotent source import. No migration or import is run automatically.

`npm run data:demo:check` validates the selected `BaoDinh.csv` source and reports a dry-run summary without connecting to a database. `npm run data:demo:rebuild` requires `DEMO_DATA_REBUILD_CONFIRM=rebuild-public-demo-2024-06-07`; it replaces only the `positions` and `position_data` tables in the configured Neon database named `neondb`, in one transaction, with three approved stations and 4,392 hourly observations for June-July 2024. Salinity is converted from g/L to mg/L, and zero, negative, and missing values are preserved. Other database tables are untouched.

Automated controller tests use a stub repository. A PostgreSQL-backed integration run and verification against the approved source file are required before deployment.
