# PairVoice Development Log

## 2026-09-20 — Clean core redesign
Removed competing legacy database models because the product is pre-production. Added one canonical baseline with versioned campaigns, normalized enrollments/pair members, credential bundles, redo history, append-only ledger/audit, idempotent approval earnings, transactional public registration/pair join, revenue-first admin metrics, light professional milestones, tests and CI gates.

Revenue effect: protects the lead → pair → approval → cash path from duplicate credentials, duplicate earnings, retroactive payout drift and schema ambiguity.

Release: feature branch; requires CI and clean-database verification before merge.
