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
