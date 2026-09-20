# PairVoice

PairVoice is a mobile-first recruitment and operations platform for paid conversational speech-data projects.

## Operating objective

Optimize **approved contribution**, not raw registrations:

Lead → qualified participant → valid pair → ready pair → sessions → internal QA → client approval → earnings → payout.

## Clean baseline

The project is pre-production, so the database is intentionally one clean schema instead of carrying competing legacy models.

Core domains: acquisition, participants, campaign enrollments, immutable campaign versions, pair membership history, credential inventory, topics/sessions/redos, QA, referrals, immutable ledger/payouts, outbox messaging, activity and audit.

## Revenue rules

- Published campaign terms are immutable.
- A participant enrolls once per campaign.
- One active pair membership per enrollment.
- One credential bundle is assigned to one pair for its lifetime.
- Completion is not approval; approval is not payout.
- Earnings/payouts are idempotent.
- Ledger and audit records are append-only.
- Existing assignments never inherit future rule/payout changes.

## Spain

Current PairVoice offer: **$50 per completed pair**. Confirmed client base revenue from the supplied contract: **$75 per pair**. The supplied invitation code is stored as a campaign default but marked unconfirmed until the client confirms whether it is universal or pair-specific.

## Professional gamification

Keep it light: progress bars, operating milestones and completion visibility. Never use mechanics that encourage rushing, rule-skipping or low-quality recordings.

## Verify

npm install
npm run typecheck
npm test
npm run build

See docs/ARCHITECTURE.md, docs/DATABASE.md, docs/TESTING.md and docs/DEVLOG.md.
