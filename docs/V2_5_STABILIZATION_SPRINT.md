# PairVoice V2.5 Stabilization Sprint

## Goal
Make the existing core journey reliable before merging passkeys:
Pick gig → Sign up → Verify → Get partner → Do gig → Submit → Approval → Get paid.

## Release blockers and fixes
1. Identity/Auth reconciliation
   - Link existing participants to matching Supabase Auth users when the email identity is already proven.
   - Normal sign-in may create an Auth identity only when a PairVoice participant with that email already exists.
   - Unknown sign-in emails must not create orphan Auth users.
   - Signup remains the only path that may create a new PairVoice participant.
2. Partner recovery
   - Preserve campaign/partner context through auth.
   - Show partner handoff failures to the participant.
   - Never tell a PAIRED participant to connect another partner.
3. Work/submission
   - Preserve idempotent transitions.
   - Give safe retry copy that explicitly says progress is preserved.
4. Payout integrity
   - Keep database-side balance reservation and idempotency as authority.
   - Treat browser idempotency keys as convenience, not the integrity boundary.
5. Security hardening
   - Lock trigger-only SECURITY DEFINER functions away from anon/authenticated callers.
   - Pin function search_path.
6. CI
   - Actual staging branch must run full verification automatically.
7. Release proof
   - One complete real staging journey before passkeys.
   - Then 20 consecutive core journeys with zero P0/data-integrity/auth/RLS/payment blockers.

## Non-goals
No redesign, marketplace expansion, affiliate expansion, AI features, or admin rebuild.

## Merge rule
Do not merge passkeys or stabilization into staging until CI is green and the core identity/partner/work/payment invariants are proven.


## Implementation status

Completed on `v2.5-stabilization`:
- [x] Existing-account auth recovery is separated from new signup.
- [x] Unknown sign-in emails no longer use the account-creation path.
- [x] Legacy `/login` bypass is retired; `/signin` is the single auth entry point.
- [x] Exact-email Auth/participant reconciliation migration is prepared.
- [x] Participant Auth ownership is protected with a unique partial index.
- [x] Partner invite recovery failures are visible to the user.
- [x] PAIRED state no longer tells a user to connect another partner.
- [x] Submission retry messaging is explicit and non-destructive.
- [x] Payout idempotency key survives browser refresh.
- [x] Trigger-only SECURITY DEFINER functions are removed from public RPC execution.
- [x] Mutable search_path warnings for core trigger functions are fixed.
- [x] Core-path foreign-key indexes are added.
- [x] Edge signup and partner-join validation return field-specific errors.
- [x] Actual staging branch is covered by PairVoice Verify CI.
- [x] Typecheck, unit tests, production build and dependency audit pass.
- [x] All migrations and SQL invariants pass.
- [x] Backup/restore drill passes.

Still required before merge:
- [ ] Apply the stabilization migration only to the confirmed staging database/environment.
- [ ] Reconcile and re-count participant/Auth identity state after migration.
- [ ] Deploy the stabilization application branch to staging.
- [ ] Prove one complete staging journey: signup → verify → partner → work → submit → approval → payout state.
- [ ] Run cross-user/RLS negative tests against the deployed staging build.
- [ ] Run mobile refresh/back/retry/duplicate-tap tests.
- [ ] Complete 20 consecutive successful V2.5 journeys.
- [ ] Rebase/review passkey PR after stabilization is accepted.
- [ ] Configure and verify WebAuthn RP ID/origins before passkey merge.

## Current hold
PR #21 and PR #20 remain unmerged. Production is untouched.
