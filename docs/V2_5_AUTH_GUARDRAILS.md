# V2.5 auth guardrails

These are release-blocking invariants for PairVoice authentication.

1. Email contains a PairVoice `/auth/confirm` URL, never a directly consumable Supabase `/verify` action URL.
2. GET `/auth/confirm` never verifies or consumes the one-time token.
3. Token consumption requires an explicit POST from the confirmation page.
4. `next` accepts only local absolute paths; external/protocol-relative/control-character redirects fall back to `/dashboard`.
5. Ordinary sign-in never creates an Auth identity for an email that has no PairVoice participant.
6. Existing-account recovery may create the missing Auth identity only when an exact normalized participant email exists.
7. After verification, the authenticated email must map to exactly one PairVoice participant.
8. A participant already owned by a different `auth_user_id` is a hard conflict: sign out and deny dashboard access.
9. Dashboard access is granted only after `claim_pairvoice_identity_self` succeeds and the persisted `auth_user_id` is re-read and matches the authenticated user.
10. The database unique partial index on `participants(auth_user_id)` remains the final duplicate-ownership guard.
11. Magic-link/passkey work must preserve campaign and partner `next` context.
12. Failed verification never mutates campaign enrollment, pair ownership, work state, ledger, or payout state.

## Required regression cases
- Email security scanner GETs confirmation URL before user: token remains usable.
- User presses Continue once: succeeds.
- User presses Continue twice: second attempt fails safely; first session remains authoritative.
- Existing participant with no Auth identity: recovery creates/claims exactly one identity.
- Existing participant with Auth user but missing participant link: recovery claims existing identity.
- Unknown email on Sign in: rejected; no Auth user created.
- Auth email/participant mismatch: rejected.
- Participant already linked to different Auth user: rejected and logged as `AUTH_IDENTITY_CONFLICT`.
- Malicious external `next`: cannot redirect off PairVoice.
- Campaign + partner context survives confirmation.
