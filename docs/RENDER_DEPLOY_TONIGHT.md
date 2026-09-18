# PairVoice Render Deployment — Tonight

## Service type

Deploy PairVoice as a **Node Web Service** on Render. Do not deploy it as a static site because the application uses Next.js server API routes.

## Repository settings

- Repository: Kohronburton/PairVoice
- Branch: feat/signup-first-launch
- Runtime: Node
- Build command: `npm install && npm run build`
- Start command: `npm start`
- Health check: `/api/health`

A `render.yaml` file at the repository root contains the same configuration.

## Required Render environment variables

Set these in the Render dashboard. Do not commit their values:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PAIRVOICE_ADMIN_USER`
- `PAIRVOICE_ADMIN_PASSWORD`

## Supabase prerequisite

Before opening the site to real traffic, apply migrations in order through:

- 001_signup_growth.sql
- 002_market_pricing.sql
- 003_leads.sql
- 004_acquisition_analytics.sql
- 005_locale_markets.sql
- 006_normalize_markets.sql
- 007_unknown_market.sql

Tonight's lead endpoint depends on the `leads` table and later locale/acquisition columns.

## Smoke test after deploy

1. Open `/api/health`. It should return `ok: true`.
2. Open the homepage on a phone.
3. Enter a test email and accept email consent.
4. Confirm the success state appears.
5. Confirm the lead exists in Supabase `leads`.
6. Confirm `detected_locale`, `language_code`, source/UTM fields and market fields are populated as available.
7. Open `/admin`; verify the browser asks for the configured admin username/password.
8. Confirm the lead count increased.
9. Delete or clearly label the test lead before measuring production KPIs.

## Tonight scope

The public visitor only enters email and consent. Phone, password, voice enrollment, payout information and full participant onboarding are deferred until a matching paid opportunity exists.
