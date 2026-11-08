# Deployment and GitHub setup

## Applications

Use two Vercel projects from this repository:

| Project  | Root directory       | Runtime                |
| -------- | -------------------- | ---------------------- |
| Frontend | `Web`                | Vite SPA with fallback |
| Backend  | `Web/BE-Mekong-main` | NestJS serverless API  |

Set the backend project's install/build settings to the package scripts (`npm ci` and `npm run build`). The frontend `vercel.json` enables direct navigation to SPA routes; the backend project includes its own `vercel.json` and `api/index.ts`.

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

- `DATABASE_URL`: a newly rotated Neon PostgreSQL connection string.
- `PUBLIC_DATA_START=2024-06-01T00:00:00+07:00`
- `PUBLIC_DATA_END=2024-07-31T23:59:59+07:00`
- `CORS_ORIGINS`: the exact production frontend origin, without a trailing slash.
- `NODE_ENV=production`

**Frontend project**

- `VITE_API_BASE_URL`: the backend's production origin, without a trailing slash.

After adding or changing environment variables, create a new deployment so both projects use the updated values. Keep Neon credentials in the Vercel backend environment only.

## CI and production deploy

`.github/workflows/ci.yml` runs on pull requests, pushes to `main`, and merge-queue checks. The `frontend` and `backend` jobs are the required checks. The backend job uses a disposable PostgreSQL 17 service, runs controller and API integration tests, verifies the demo CSV, then builds.

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

For a manual deploy, run `npx vercel link` once from each project root (`Web` and `Web/BE-Mekong-main`), then use `npm run deploy:preview` or `npm run deploy:prod` from that root. The CLI reads environment values from the linked Vercel project.

## Require pull requests and passing checks

In GitHub, open **Settings > Rules > Rulesets**, create a branch ruleset targeting `main`, and enable:

1. Require pull requests, one approval, dismissal of stale approvals, and approval of the latest reviewable push.
2. Require status checks `frontend` and `backend`, with the branch up to date before merging.
3. Require conversation resolution; block force pushes and branch deletion.
4. Limit bypass to designated repository administrators for emergency recovery.

Do not include `deploy-production` as a required check because it is intentionally skipped for pull requests and when deployment is disabled.

In **Settings > Environments > production**, restrict deployments to `main` and require an environment reviewer when a second maintainer is available. The workflow already targets this environment.

## Rebuild the two-month demo dataset

The checked-in CSV dry-run reports the selected Bao Dinh source, the three coordinate-verified public stations, and June–July 2024 row counts. To rebuild Neon, first rotate any connection string that was shared in chat. Then use the new value only as a local `DATABASE_URL` environment variable. Review `Web/BE-Mekong-main/docs/monitoring-api-v1.md` and the import script before applying. The rebuild requires an explicit confirmation variable and truncates only the two monitoring tables; it does not delete unrelated database tables.

## Current boundary

The Neon CLI linked the configured `production` branch and `neon deploy` confirmed it already matched the Postgres policy. The local rebuild subsequently completed: 4,392 observations for `baodinh`, `gocat`, and `vamkenh` across June-July 2024 were applied. The supplied local run also confirmed that the API starts and that `/api/v1/status`, `/api/v1/stations`, and `/api/v1/metadata/data-range` respond successfully. GitHub changes are still unpushed because this workspace cannot write `.git`; GitHub branch rules and Vercel project settings remain to be completed from the user's authenticated terminal/account. Never place a Neon URL in GitHub Actions logs or source files.
