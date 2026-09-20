# PairVoice

PairVoice is a mobile-first marketplace and operations platform for paid voice-data work.

## Core product model

PairVoice does not treat every external listing as a separate product.

`Job Family -> Campaign -> Source Posting -> Enrollment -> Work -> QA -> Payout`

Examples:

- Job family: Paired Conversation Recording
  - U.S. English — 7 Conversations
  - Canada English — 7 Conversations
  - Spain Spanish — 7 Conversations
- Job family: Mobile Voice Recording
  - Australia English — iPhone Recording

Multiple Upwork listings can point to the same PairVoice campaign.

## Public experience

The public site is catalog-first and email-first:

`Opportunity catalog -> choose campaign or general list -> email + consent -> lead saved`

No password, phone number, payout setup or voice sample is required at first contact.

## Operational model

A participant has one reusable PairVoice identity and can enroll in many campaigns.

Pair campaigns create a PairVoice pair record. Solo campaigns skip pair formation.

External provider invitation codes are campaign-level configuration and are never used as PairVoice pair IDs.

## Stack

- Next.js App Router
- TypeScript
- Supabase/Postgres
- Server-side Supabase service role for application database access
- Row-level security enabled on operational tables
- Render deployment
- GitHub Actions build checks

## Main directories

- `app/` — public site, admin dashboard and server API routes
- `modules/` — workflow and messaging logic
- `supabase/migrations/` — current schema transition
- `docs/ARCHITECTURE.md` — system model and invariants
- `docs/CAMPAIGN_CATALOG.md` — canonical active campaign/source catalog

## Current campaigns

- `us-english-7`
- `ca-english-7`
- `es-spain-7`
- `au-english-iphone`

See `docs/CAMPAIGN_CATALOG.md` for the current source-posting map and locked economics.
