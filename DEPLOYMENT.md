# Deployment and GitHub setup

## Applications

Use two Vercel projects from this repository:

| Project  | Root directory       | Runtime                |
| -------- | -------------------- | ---------------------- |
| Frontend | `Web`                | Vite SPA with fallback |
| Backend  | `Web/BE-Mekong-main` | NestJS serverless API  |

The backend uses Vercel's NestJS framework preset, which detects `src/main.ts` and deploys the app as a Vercel Function. Its `vercel.json` uses `npm ci --include=dev` so the Nest CLI in `devDependencies` remains available when the Production environment sets `NODE_ENV=production`; `outputDirectory: null` prevents a static output-folder requirement. The frontend `vercel.json` enables direct navigation to SPA routes.

## Neon provisioning

Run these commands from `Web/BE-Mekong-main` after completing Neon CLI sign-in in the browser if prompted. If global installation is blocked, use `npx --yes neon@latest` in place of `neon`.

```powershell
npm i -g neon@latest
neon init -y --no-agent-setup --org-id org-weathered-flower-95780138 --project-id rough-bar-15202106 --branch production --services postgres
neon deploy
```

The backend loads `.env.local` first and `.env` second. Neon CLI-generated environment files are ignored by Git; keep their connection values private. Verify that deployment provides `DATABASE_URL`, then use that variable locally. On Vercel, configure the Neon connection as the backend project's `DATABASE_URL` environment variable; do not upload `.env.local`.

## Production environment variables

Configure these in the Vercel project dashboards. Do not commit credentials or put them in this repository.

**Backend project**

- `DATABASE_URL`: a Neon pooled connection string (host includes `-pooler`) for the Vercel serverless runtime. Use a direct, unpooled connection only for schema migrations.
- `PUBLIC_DATA_START=2024-06-01T00:00:00+07:00`
- `PUBLIC_DATA_END=2024-07-31T23:59:59+07:00`
- `CORS_ORIGINS`: the exact production frontend origin, without a trailing slash.
- `NODE_ENV=production`

**Frontend project**

- `VITE_API_BASE_URL`: the backend's production origin, without a trailing slash.

After adding or changing environment variables, create a new deployment so both projects use the updated values. Keep Neon credentials in the Vercel backend environment only.

## CI and production deploy

`.github/workflows/ci.yml` runs on pull requests, pushes to `main`, manual dispatches, and merge-queue checks. The `frontend` and `backend` jobs are the required checks. The backend job uses a disposable PostgreSQL 17 service, runs controller and API integration tests, verifies the demo CSV, then builds.

Production deployment is opt-in. In GitHub repository settings, add these **Actions secrets**:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_FRONTEND_PROJECT_ID`
- `VERCEL_BACKEND_PROJECT_ID`

Add the repository **Actions variable** `VERCEL_DEPLOY_ENABLED=true` to enable the production deploy job after CI passes on `main`. Until this switch is enabled, no Vercel deployment is attempted. Configure Vercel project environment variables before enabling it.

Also add these repository **Actions variables** for the post-deploy smoke test:

- `VERCEL_FRONTEND_URL`: frontend production origin, such as `https://your-frontend.vercel.app`.
- `VERCEL_BACKEND_URL`: backend production origin, such as `https://your-api.vercel.app`.

After deployment, CI checks the frontend responds and verifies `/api/v1/status`, `/api/v1/stations`, and `/api/v1/metadata/data-range`, including the three public station IDs.

For an on-demand production deploy, open **Actions > CI > Run workflow**, select `main`, and start the workflow. Both CI jobs must pass, the `production` environment must allow `main`, and `VERCEL_DEPLOY_ENABLED` must be `true` before `deploy-production` runs. A dispatch from any other branch cannot deploy production. Use this after changing production environment variables; Vercel needs a new deployment for those values to take effect. For local deployments, run Vercel CLI from the repository root, link the intended Vercel project, then run `vercel pull`, `vercel build --prod`, and `vercel deploy --prebuilt --prod`; the project's configured Root Directory selects `Web` or `Web/BE-Mekong-main`.

## Require pull requests and passing checks

The `main` ruleset requires pull requests, the `frontend` and `backend` checks, an up-to-date branch, resolved conversations, and blocks force pushes and branch deletion. Required approvals are currently set to zero for this single-developer repository; re-enable one approval when an independent reviewer is available. Do not require `deploy-production` as a PR check because it only runs on `main` after CI passes and deployment is enabled.

When a second maintainer joins, enable one approval, dismiss stale approvals, and require approval of the latest reviewable push. Limit bypass to designated repository administrators for emergency recovery.

In **Settings > Environments > production**, restrict deployments to `main` and require an environment reviewer when a second maintainer is available. The workflow already targets this environment.

## Rebuild the two-month demo dataset

The checked-in CSV dry-run reports the selected Bao Dinh source, the three coordinate-verified public stations, and June–July 2024 row counts. To rebuild Neon, first rotate any connection string that was shared in chat. Then use the new value only as a local `DATABASE_URL` environment variable. Review `Web/BE-Mekong-main/docs/monitoring-api-v1.md` and the import script before applying. The rebuild requires an explicit confirmation variable and truncates only the two monitoring tables; it does not delete unrelated database tables.

## Phase 2 provenance schema and import

Phase 2 adds source import records, source-level observation fields, model version/run/result tables, and station monitoring rules. It does not create forecasts, fill missing observed values, enable alert delivery, or change the public API. Review `Web/BE-Mekong-main/docs/phase2-data-platform.md` and the migration SQL directly. Run `npm run data:phase2:check` before loading; it validates the import offline. The schema apply is additive and guarded. The separate data load is transactional and idempotent, and it does not truncate rows or change station coordinates. Do not run either apply command against a production Neon branch until its intended target, backup, and migration diff have been reviewed.

## Stage 4 GIS rules and replay

The browser fetches versioned GIS rules once and replays the public historical observations locally. `GET /api/v1/gis/reference-status` is also available for clients that need a server-evaluated result. Rule set `mekong-legacy-gis-reference` v1.0.0 is unconfirmed and simulation-only. This feature requires no database migration. It does not enable live ingestion, forecasts, imputation, or operational gate commands. See `Web/BE-Mekong-main/docs/stage4-gis-replay.md` and the [API contract](Web/BE-Mekong-main/docs/monitoring-api-v1.md).

## Stage 5 forecast baseline

Stage 5 adds an offline chronological backtest for persistence and 24-hour seasonal-naive baselines using only the approved BaoDinh.csv public window and stations. It records MAE, RMSE, bias, source hash, units, and missing-value counts. It does not train a model, access Neon, or enable forecast routes. See the [Stage 5 guide](Web/BE-Mekong-main/docs/stage5-forecast-pipeline.md) and the generated [baseline report](Web/BE-Mekong-main/reports/stage5-forecast-baseline.json).

## Phase 6 DLinear experiment

Phase 6 runs the vendored Time-Series-Library DLinear model offline for the three approved stations and both monitoring variables. It uses the Phase 5 holdout, saves local checkpoints and epoch-level training evidence, and does not register models or expose forecast routes. See the [Phase 6 guide](Web/BE-Mekong-main/docs/phase6-tslib-experiment.md) and [experiment report](Web/BE-Mekong-main/reports/stage6-dlinear-experiment.json).

## Phase 7 forecast promotion gate

The Stage 7 gate audits Phase 5/6 source lineage, checkpoint hashes, matched holdout metrics, bias, source quality, and approval evidence. The current result is HOLD, so no forecast rows are registered and public forecast routes remain disabled. See the [Phase 7 guide](Web/BE-Mekong-main/docs/phase7-forecast-promotion.md) and [promotion report](Web/BE-Mekong-main/reports/stage7-forecast-promotion.json).

## Current boundary

The Neon production branch contains the 4,392 public observations for `baodinh`, `gocat`, and `vamkenh` across June–July 2024. The Vercel projects use the `Web` and `Web/BE-Mekong-main` roots, and production environment variables are configured in their respective projects. GitHub Actions holds the Vercel credential and project IDs as secrets and the production URLs and deploy gate as repository variables. The `production` GitHub environment is restricted to `main`. Never place a Neon URL in GitHub Actions logs or source files.
