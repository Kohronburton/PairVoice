# Testing & Release Gates
Definition of done: code + migration + permissions + errors + audit + tests + docs + staging + smoke test.

## CI
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm audit --omit=dev --audit-level=high`

## Unit
Validation, partner-invite routing, workflow transitions and calculations.

## Database
Clean migration, constraints, RLS, RPC transactions, credential concurrency, approval idempotency, immutable ledger/audit.

Production onboarding invariants:
- `participants.onboarding_completed_at` and `last_seen_at` exist.
- authenticated users can execute `claim_participant_account`, `get_my_dashboard`, and `mark_my_pair_ready`.
- anon cannot execute participant account/dashboard/readiness RPCs.
- anon/authenticated cannot execute `register_campaign_participant` or `join_pair_invite` directly; server service role owns those mutations.
- account claim binds only the participant matching the verified auth email.
- one participant readiness confirmation cannot move a two-person pair to READY.
- the second active member readiness confirmation moves READINESS_PENDING → READY without skipping the state machine.

## E2E
Required production smoke path:
1. Open homepage and select a published campaign.
2. Participant A signs up at `/join?campaign=...`.
3. Enrollment returns a production `/pair/{inviteCode}` link.
4. Participant A receives account/welcome email and can open `/dashboard`.
5. Participant B opens the pair link and joins.
6. Participant A receives partner-joined notification.
7. A and B independently sign in and confirm readiness.
8. Dashboard state becomes READY only after both confirmations.
9. Operations advances READY → RECORDING and releases instructions/credentials.
10. Pair completes required sessions → SUBMITTED → QA → client approval → one earnings set → one payout.

## Security
Cross-user access denied, credential inventory denied, payment role enforcement, state skipping denied, direct anonymous enrollment RPC execution denied, pair-invite GET returns no participant PII.

## Concurrency
50 workers / 1 credential = 1 winner; duplicate approval = 1 earnings set; duplicate payout = 1 payout; simultaneous second-participant join produces one active B membership.
