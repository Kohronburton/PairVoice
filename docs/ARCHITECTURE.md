# PairVoice Architecture

PairVoice is server-authoritative, transaction-safe, idempotent, auditable and revenue-focused.

## Invariants
1. Published campaign versions are immutable.
2. A participant enrolls once per campaign.
3. One active pair membership per enrollment.
4. Partner replacement preserves history.
5. One credential bundle is assigned to one pair.
6. Credentials do not release before readiness.
7. Redos preserve attempts.
8. SUBMITTED != APPROVED != PAYABLE != PAID.
9. Ledger and audit rows are append-only.
10. Earnings/payouts use idempotency keys.
11. Revenue reporting is based on approved work.

## Pair lifecycle
PARTNER_PENDING → PAIRED → READINESS_PENDING → READY → RECORDING → SUBMITTED → INTERNAL_QA → CLIENT_QA → APPROVED → PAYABLE → PAID.

## Credentials
A bundle contains the two external accounts required by one pair. Credential accounts are A/B child records. Secrets are ciphertext. Bundle and pair assignments are one-to-one and are not silently recycled.

## Money
Participant balances are derived from ledger entries. Corrections use ADJUSTMENT/REVERSAL entries, never edits to history.

## Messaging
Core state commits first. External notifications use an outbox so provider failure cannot corrupt PairVoice state.

## Gamification
Use progress and milestones only. Never gamify behavior that can reduce compliance or recording quality.
