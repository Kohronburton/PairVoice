# PairVoice

Mobile-first recruitment and operations platform for paid conversational speech-data projects.

## V1

Campaign #1 is Spain Spanish using FunCrowd as the external recording provider. PairVoice owns recruitment, configurable screening, pair formation, training, FunCrowd companion workflow, session tracking, external QA, payment obligations, WhatsApp-assisted communication, referrals and audit history.

### Core rules

- Supabase/Postgres is the source of truth.
- Spain requirements are campaign configuration, not platform hard-coding.
- Requirement versions are immutable after publication.
- Both participants must independently qualify before a pair can become ready.
- FunCrowd is an external provider; PairVoice never fabricates external completion/QA state.
- COMPLETED != ACCEPTED != PAYMENT_DUE != PAID.
- Spain V1 compensation is $50 TOTAL per accepted pair.
- WhatsApp V1 is operator-assisted click-to-chat. Delivery/read status is not claimed without an official API.
- Credentials and payment obligations require database-level duplicate protection.

## Stack

Next.js App Router + TypeScript + Tailwind + Supabase/Postgres/Auth/Storage + Vitest + Playwright.

## Architecture

Modular monolith. Domain modules live under `modules/`; UI routes under `app/`; database migrations under `supabase/migrations/`.

## First milestones

1. A synthetic pair can travel through the entire workflow without direct database edits.
2. Two real Spain pairs complete the same workflow.
3. Validate 10 accepted pairs before adding paid acquisition or unnecessary infrastructure.

See `docs/SYSTEM_PLAN.md` and `docs/STATE_MACHINE.md`.
