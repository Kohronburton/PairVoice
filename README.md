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

The provider invitation code is not in the current source tree (earlier commits contained it, and the baseline migration still seeds default client revenue and participant compensation amounts; see docs/CODE_REVIEW.md CR-28); before entering the real invitation code in the admin campaign access screen, confirm with the client whether it is one campaign-wide code or one per pair (the seeded campaign versions record the scope as unconfirmed, and the app hands the same stored code to every pair). The baseline migration seeds default participant compensation amounts so a fresh database is usable, and published campaign versions are immutable, so change compensation by publishing a new campaign version. See docs/CAMPAIGN_CATALOG.md for the campaign structure.

## Professional gamification

Keep it light: progress bars, operating milestones and completion visibility. Never use mechanics that encourage rushing, rule-skipping or low-quality recordings.

## Verify

npm install
npm run typecheck
npm test
npm run build

See docs/ARCHITECTURE.md, docs/DATABASE.md, docs/TESTING.md and docs/DEVLOG.md.
