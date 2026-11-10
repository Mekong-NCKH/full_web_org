# Phase 6 — Time-Series-Library DLinear experiment

## Goal

Train an experimental DLinear forecaster using the vendored
Time-Series-Library implementation and compare it with the Phase 5 baselines
on the exact same chronological holdout. This is an offline research
experiment. It does not enable forecasts in the public API.

## Experiment design

- Source: BaoDinh.csv, public window 2024-06-01 through 2024-07-31 UTC+07:00.
- Stations: baodinh, gocat, and vamkenh only.
- Targets: salinity in mg/L and water level in meters, trained as six separate
  univariate models.
- Model: Time-Series-Library DLinear, lookback 96 hours, prediction horizon
  24 hours, moving-average kernel 25.
- Outer split: first 70% of timestamps for model development, final 30% for
  the same holdout used by Phase 5.
- Inner split: first 80% of the outer initial-history segment for gradient
  updates; the remaining 20% for early stopping and checkpoint selection.
- Inference: non-overlapping 24-hour origins. Observed values from a completed
  holdout block may be used as input at the next origin.
- Scaling: mean and standard deviation from the inner training segment only.
- Training: CPU, Adam, MSE loss, batch size 32, learning rate 0.001, at most 100
  epochs, patience 7, deterministic per-series seeds.
- Missing data: the runner refuses a target series containing missing values.
  It never fills or interpolates measurements.

The output records every epoch's training and validation loss, mean gradient
norm, nonzero-gradient batch count, selected epoch, scaling values, source and
code hashes, model artifact hashes, and holdout metrics. MAE, RMSE, and bias use
the same units and prediction-minus-observation convention as Phase 5.

## Run

From Web/BE-Mekong-main, with NumPy and PyTorch installed:

    python scripts/stage6-dlinear-experiment.py

The experiment reads the selected CSV and the Phase 5 baseline report. It
writes reports/stage6-dlinear-experiment.json and one checkpoint per
station-variable series under reports/stage6-artifacts/. It does not load
environment files or connect to a database.

## Acceptance boundary

- Compare DLinear against both persistence and daily seasonal-naive metrics
  from the matching Phase 5 holdout.
- Keep all trained checkpoints experimental, regardless of whether an
  individual metric beats a baseline.
- Do not register the artifacts as validated models or expose predictions
  through GET /api/v1/stations/:id/forecasts without multi-window or
  multi-season validation and an agreed acceptance threshold.
- The selected source has only a two-month window. Results are not evidence of
  seasonal generalization.

## Current status

The experiment runner is reproducible and writes its report and checkpoints
locally. Model evaluation results are stored in the generated report. No
forecast API or database behavior is changed by this phase.

## Current holdout results

The current run scored 432 hourly targets per series across 18 rolling origins.
DLinear improved both MAE and RMSE against the stronger Phase 5 daily
seasonal-naive baseline on all six series:

| Station | Target | Unit | DLinear MAE | Daily-naive MAE | MAE change | DLinear RMSE | Daily-naive RMSE |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |
| Bao Dinh | Salinity | mg/L | 49.781984 | 59.421875 | -16.2228% | 64.524091 | 83.052231 |
| Bao Dinh | Water level | m | 0.224099 | 0.303347 | -26.1245% | 0.299949 | 0.460928 |
| Go Cat | Salinity | mg/L | 274.987528 | 346.937507 | -20.7386% | 375.174777 | 498.744243 |
| Go Cat | Water level | m | 0.245725 | 0.330715 | -25.6989% | 0.334409 | 0.518284 |
| Vam Kenh | Salinity | mg/L | 2597.856015 | 3272.129449 | -20.6066% | 3389.700346 | 4617.106477 |
| Vam Kenh | Water level | m | 0.375087 | 0.486515 | -22.9033% | 0.576479 | 0.819406 |

The final eight holdout hours do not form another complete 24-hour block and
remain unscored. Although DLinear reduced MAE and RMSE, its absolute bias was
worse than daily seasonal naive on all six series. The model therefore has an
error-magnitude improvement with a calibration tradeoff; both findings are
recorded in the report.

These are experimental results from one two-month source window. The model
checkpoints remain experimental; this result does not validate performance
across other seasons or years.
Validation early stopping selected epochs 20–78, with all six runs stopping
before the 100-epoch cap.

The generated report is
Web/BE-Mekong-main/reports/stage6-dlinear-experiment.json. Checkpoints are
stored under Web/BE-Mekong-main/reports/stage6-artifacts/, with each artifact
SHA-256 recorded in the report.
