# full_web_org project rules

These rules apply to the Mekong salinity monitoring web application and its backend.

## Product and public data

- Treat `BaoDinh.csv` as the selected source for the public demo.
- Keep the public demo window at 2024-06-01 00:00 through 2024-07-31 23:59:59 in UTC+07:00 unless the project owner changes it.
- Publicly expose only stations with verified coordinates: `baodinh`, `gocat`, and `vamkenh`. Do not invent coordinates or publish other station rows by default.
- Source salinity is in g/L and must be converted by multiplying by 1,000 before storing or returning mg/L. Water level is in meters.
- Preserve `null`, numeric zero, and negative measurements as distinct values. Do not silently replace missing or negative source values.
- Keep the API response contract and source/time-window metadata documented in `Web/BE-Mekong-main/docs/monitoring-api-v1.md`.

## Application boundaries

- `Web` is the Vite/React frontend. It reads monitoring data from `/api/v1`; do not reintroduce sample JSON, hard-coded map markers, or localhost URLs into production UI code.
- `Web/BE-Mekong-main` is the NestJS API. Keep domain/use-case, repository, infrastructure, and controller responsibilities separate.
- Preserve the existing TypeORM and `pg` stack. Read `DATABASE_URL` from environment configuration; Neon CLI local variables are loaded from `.env.local` before `.env`.
- Keep schema changes in SQL or reviewed migration code. Do not enable TypeORM `synchronize` against Neon or production.

## Secrets and database safety

- Never commit `.env`, `.env.local`, Neon connection strings, Vercel tokens, or database passwords. Use GitHub Actions secrets and Vercel environment variables for deployment.
- Do not print credentials in logs, test output, issue descriptions, or pull requests.
- Run the demo importer without `--apply` first. It must validate the selected CSV, station set, units, time range, and record counts without opening a database connection.
- Apply destructive database rebuilds only to the intended Neon branch and only when the task explicitly authorizes the named rebuild. The importer may replace `positions` and `position_data`; it must leave unrelated tables untouched.
- Keep end-to-end test database guards enabled. Never point destructive E2E resets at Neon or another non-local database.

## Pull requests and checks

- Make changes on a feature branch and merge through a pull request; do not push directly to `main`.
- Require the `frontend` and `backend` CI checks, dismissal of stale approvals, resolved conversations, and an up-to-date branch before merge. An approving review is optional while the project has a single maintainer.
- Run frontend typecheck, lint, and build. Run backend lint, unit tests, E2E tests against disposable PostgreSQL, demo CSV dry-run, and build before merging.
- Do not use production deployment as a required PR check. Production deployment runs from `main` only after both CI jobs pass and `VERCEL_DEPLOY_ENABLED=true` is configured.
- Keep PRs focused, explain data/schema/API changes, and include test evidence. Update `DEPLOYMENT.md` and the API contract when deployment or public behavior changes.

## Environment and deployment

- Frontend production uses `VITE_API_BASE_URL`; backend production uses `DATABASE_URL`, `PUBLIC_DATA_START`, `PUBLIC_DATA_END`, and the exact allowed `CORS_ORIGINS`.
- Keep Neon connection credentials in the backend environment only. Never expose them through Vite variables or browser code.
- Use Neon CLI setup with `--no-agent-setup` when provisioning this repository so project setup does not install coding-agent integrations.
- Configure branch rules, GitHub Actions secrets/variables, and Vercel project settings as protected repository/account settings; document required names without storing their values.
