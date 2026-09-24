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
12. Browser clients never receive service-role credentials or direct enrollment mutation authority.
13. Participant self-service identity is bound to the verified auth email and `participants.auth_user_id`.
14. The participant dashboard derives its next action from authoritative enrollment/pair state.

## Participant identity and onboarding
Public campaign and partner registration POST to PairVoice server routes. Those routes use the service-role key to call the transactional enrollment RPCs. Anonymous and ordinary authenticated browser roles cannot call those enrollment RPCs directly.

After enrollment, Supabase passwordless Auth establishes the user session. `claim_participant_account()` attaches the auth user only to the participant row with the same verified email. Authenticated participant RPCs expose a scoped dashboard and readiness action without exposing other participants or credential inventory.

## Pair lifecycle
PARTNER_PENDING → PAIRED → READINESS_PENDING → READY → RECORDING → SUBMITTED → INTERNAL_QA → CLIENT_QA → APPROVED → PAYABLE → PAID.

Participant A creates the pair during campaign registration. Participant B joins through the pair-specific invite. Each member independently completes readiness. The first confirmation starts READINESS_PENDING; the second active member confirmation advances the pair to READY.

## Credentials
A bundle contains the two external accounts required by one pair. Credential accounts are A/B child records. Secrets are ciphertext. Bundle and pair assignments are one-to-one and are not silently recycled.

## Money
Participant balances are derived from ledger entries. Corrections use ADJUSTMENT/REVERSAL entries, never edits to history. Public cards show campaign pair compensation; the authenticated dashboard calculates and shows the member's configured share separately.

## Messaging
Core state commits first. External notifications use provider calls/outbox patterns so provider failure cannot corrupt PairVoice state. Resend handles branded PairVoice lifecycle email; Supabase Auth handles secure passwordless sign-in links.

## Measurement
The funnel records landing, opportunity selection, onboarding, signup, invite/share, partner signup, magic-link, dashboard and readiness events. No email, phone, IP or payment values belong in funnel-event payloads.

## Gamification
Use progress and milestones only. Never gamify behavior that can reduce compliance or recording quality.
