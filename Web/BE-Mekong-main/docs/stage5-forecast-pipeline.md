# Stage 5 — Offline forecast baseline and validation gate

## Purpose

Stage 5 establishes reproducible comparison baselines before a trained
forecasting model is connected to the API or frontend. It uses the selected
BaoDinh.csv, the approved public stations, and the fixed June–July 2024
window. The report is research evidence, not an operational forecast.

## Baselines and evaluation

The offline runner compares two deterministic baselines for salinity and water
level at each public station:

- persistence: repeat the latest numeric observation available at each
  forecast origin.
- daily seasonal naive (24 hours): use the observed value from the same hour
  on the preceding day.

Evaluation uses a chronological 70/30 split, a 24-hour horizon, and
non-overlapping daily forecast origins in the holdout. It reports MAE, RMSE,
and signed bias (prediction minus observation) in the target unit. MAPE is omitted because the selected source
can contain zero and negative values. The runner preserves blanks, zeros, and
negative values; it does not interpolate or fill missing values. It counts
targets and predictions excluded because an input or target is missing.

The selected demo window is expected to contain 1,464 hourly timestamps. The
runner fails closed if required public columns, unique hourly timestamps, or
the complete approved window are missing.

## Current backtest result

The generated holdout contains 18 non-overlapping forecast origins and 432
scored hourly targets per station-variable series. No target or baseline input
was missing. The final eight holdout hours do not form a complete 24-hour
forecast block and are reported as unscored.

| Station | Target | Unit | Persistence MAE | Daily-naive MAE | Persistence RMSE | Daily-naive RMSE |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| Bao Dinh | Salinity | mg/L | 70.501642 | 59.421875 | 93.672672 | 83.052231 |
| Bao Dinh | Water level | m | 0.372488 | 0.303347 | 0.547446 | 0.460928 |
| Go Cat | Salinity | mg/L | 445.906628 | 346.937507 | 614.154846 | 498.744243 |
| Go Cat | Water level | m | 0.422105 | 0.330715 | 0.630243 | 0.518284 |
| Vam Kenh | Salinity | mg/L | 3539.238441 | 3272.129449 | 4853.037915 | 4617.106477 |
| Vam Kenh | Water level | m | 0.651834 | 0.486515 | 0.984591 | 0.819406 |

Daily seasonal naive had lower MAE and RMSE in all six series on this holdout.
This is a single chronological holdout over the selected two-month source and
does not establish performance on another season, year, or live feed.

## Run

From Web/BE-Mekong-main, run:

    python scripts/stage5-forecast-baseline.py

The default output is
Web/BE-Mekong-main/reports/stage5-forecast-baseline.json. Use --input or
--output to select different local paths. The script reads only the CSV. It
does not load environment files, open a database connection, write forecast
rows, or train a model.

## Acceptance boundary

- A source SHA-256, public station list, window, split, target units, missing
  value counts, and per-baseline metrics are recorded in the JSON report.
- No model weights, gradients, or learned parameters are produced in this
  stage.
- The forecast and imputation API routes remain unavailable. The UI does not
  display generated predictions.
- Public forecast integration requires a later Time-Series-Library experiment,
  comparison against these baselines on a chronological holdout, artifact and
  code provenance, an agreed quality threshold, and a model version explicitly
  marked validated.

## Current status

The generated offline evidence report is
Web/BE-Mekong-main/reports/stage5-forecast-baseline.json. It records source and
runner SHA-256 hashes.
The baselines are not registered in model_versions and are not persisted to
Neon. Their scores should be interpreted as comparison references, not proof
that a future model is accurate or suitable for operational decisions.
