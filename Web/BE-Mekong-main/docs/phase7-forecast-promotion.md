# Phase 7 — Forecast promotion gate

## Purpose

Phase 7 audits the Phase 5 baseline report and Phase 6 DLinear experiment
before any forecast can be registered or returned by the public API. The gate
checks source lineage, holdout alignment, checkpoint hashes, matched score
counts, performance against both baselines, and bias against daily
seasonal-naive. The generated report also records SHA-256 hashes for both
input reports and the gate script so the decision can be tied to its evidence.

It also records evidence that cannot be inferred from the current experiment:
independent-season validation, measurement quality review, and owner-approved
acceptance thresholds. Missing approval or evidence produces HOLD. The gate
does not write to Neon, create forecast rows, or enable an API route.

## Run

From Web/BE-Mekong-main:

    python scripts/stage7-forecast-promotion-gate.py

The default output is
Web/BE-Mekong-main/reports/stage7-forecast-promotion.json. The npm command is
forecast:promotion:check.

## Current decision

The current evidence produces HOLD:

- DLinear improves MAE and RMSE against persistence and daily seasonal naive
  on all six station-variable series.
- Its absolute bias is worse than daily seasonal naive on all six series.
- Evaluation uses one two-month source window and one holdout.
- Observation quality remains unverified.
- No owner-approved acceptance threshold is recorded.

The model artifacts remain experimental. The API is not enabled. A HOLD is the
expected outcome until the missing validation and approval evidence is added.

## Promotion requirements

1. Resolve the bias degradation or document and approve an explicit
   station-variable bias tolerance.
2. Evaluate independent time windows from additional seasons or years.
3. Review source quality and provenance with the data owner.
4. Record owner-approved acceptance thresholds.
5. Rerun the gate and review the generated report before model registration or
   public API integration.
