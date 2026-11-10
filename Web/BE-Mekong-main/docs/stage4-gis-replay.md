# Stage 4 — GIS reference rules and historical replay

## Implemented in this stage

- The monitoring API exposes `GET /api/v1/gis/reference-status?at=...&mode=historical|replay`.
- `GET /api/v1/gis/reference-rules` returns the active versioned rule set. The browser fetches it once and evaluates the selected historical frame locally, so replay does not make a database request for every playback step.
- The existing `Sanility_GIS_Monitoring/script.py` remains available as the offline GIS replay script; the browser replay reads the approved API dataset instead of the script's broader local output file.
- The endpoint reads the selected public observations at or before the requested time. Its response marks the data as `observed`, identifies `BaoDinh.csv`, and reports the observation's existing `unverified` quality.
- Rule set `mekong-legacy-gis-reference` version `1.0.0` preserves the public-station cases from `Sanility_GIS_Monitoring/script.py` and `logicLayer.py`: Bao Dinh and Go Cat use the legacy fixed label; Vam Kenh uses the legacy `salinity > 1.5 g/L` condition, converted to `1,500 mg/L`.
- Every rule result is marked as an unconfirmed reference simulation. The website's replay advances through the loaded hourly historical observations. Replay never writes data or presents a result as live.
- The map and station cards display the reference label, rule version, and unconfirmed status. `live` and `forecast` are explicitly marked `not_configured`.

## Data boundaries

- Only `baodinh`, `gocat`, and `vamkenh` are included in the public API and the reference rule set. No additional stations or coordinates are exposed.
- The replay uses the selected June–July 2024 `BaoDinh.csv` observations already served by `/api/v1`; it does not read or publish `Sanility_GIS_Monitoring/data.csv`.
- `Sanility_GIS_Monitoring/realtime.py` remains a QGIS console refresh script and is not imported by the web server.
- The existing `Web/src/components/data/tien_giang.geojson` does not have boundary source, date, or verification metadata documented in this repository. It is not used to draw a boundary overlay in this stage. The verified station coordinates continue to come from `Sanility_GIS_Monitoring/cong_locations.csv`.
- These reference rules are not approved operational instructions. Negative numeric source measurements are preserved and passed through the reference comparison as numeric values; the result remains unverified and demonstrative.

## Acceptance status

Historical selection and browser replay are implemented for the public demo window. Rule version and confirmation state are visible through the API and UI. Observation records remain separate from model output. Live ingestion, forecast models, imputation, operational gate confirmation, and verified administrative-boundary overlays are not implemented in Stage 4.
