# Phase 2 — Production Workflow Build Contract

Base checkpoint: Phase 0/1 verified merge `249994f84673e2270b54ca9cf30315b41d62b1ae`.

## Goal
Turn a permanent PairVoice participant and partner relationship into a recoverable paid-work lifecycle without making FunCrowd, Niva, or any payout provider the PairVoice source of truth.

## Production chain
IDENTITY → PROFILE → CAMPAIGN ELIGIBILITY → VOICE QUALIFICATION → PARTNER/PAIR → CAPACITY → CREDENTIAL → READY → WORK → SUBMIT → INTERNAL QA → CLIENT APPROVAL → LEDGER → WALLET → PAYOUT → REFERRAL/REPUTATION → NEXT OPPORTUNITY.

## Phase 2 slices
1. Campaign + eligibility engine
2. Individual voice qualification/versioning
3. Campaign-specific pair/readiness gate
4. Provider registry/adapters
5. Niva credential inventory/reservation/release
6. Work assignment + FunCrowd launch/session tracking
7. Submission + internal/client QA + rework
8. Immutable earnings/wallet projection
9. Payout execution/reconciliation adapter
10. Referral qualification + 10-qualified-referral milestone
11. Participant job/wallet UX
12. Admin command center + queues + kill switches
13. Messaging/notification automation
14. Fraud/risk/support controls
15. Observability + recovery drills + release evidence

## Reliability rule for every slice
VALIDATE → CHECKPOINT → TRANSACTIONAL STATE CHANGE → EXTERNAL ACTION IF ANY → RECORD RESULT → VERIFY → ADVANCE.

Failure never resets identity/history. External actions reuse idempotency keys. Exhausted retries route to MANUAL_REVIEW. Financial corrections use compensating ledger entries.

## Provider boundary
- WorkProvider: FunCrowd now; ManualExternal/PairVoiceNative later.
- CredentialProvider: Niva now; alternatives later.
- PayoutProvider: initial controlled rail; PayPal/additional rails later.
Provider-specific identifiers live in provider tables/metadata, not core business-state columns.

## Required Phase 2 state
### Voice sample
NOT_STARTED → RECORDED → PROCESSING → REVIEW_PENDING → PASSED | RETEST_REQUIRED | FAILED

### Pair readiness
PARTNER_ACCEPTED → ELIGIBILITY_VERIFIED → SAMPLES_PASSED → CONSENT_ACCEPTED → CAPACITY_RESERVED → CREDENTIAL_RESERVED → READY

### Work
READY → IN_PROGRESS → SUBMITTED → INTERNAL_QA → CLIENT_QA → APPROVED | REWORK_REQUIRED | REJECTED

### Money
APPROVED → EARNING_CREATED → AVAILABLE → PAYOUT_REQUESTED → PROCESSING → PAID | FAILED/HOLD

## Release blockers
Phase 2 cannot be called production-ready until tests prove:
- prior participation cannot be bypassed by partner/account changes;
- voice sample versions cannot overwrite evidence;
- pair cannot become READY unless every configured readiness gate passes;
- concurrent Niva allocation cannot double-assign credentials;
- provider success + lost response recovers without duplicate action;
- FunCrowd outage preserves PairVoice work state;
- approval invoked twice creates one earning;
- payout invoked twice cannot pay twice;
- externally successful payout with lost callback reconciles correctly;
- referral milestone invoked twice awards once;
- admin overrides are RBAC-controlled and audited;
- kill switches isolate each critical subsystem;
- backup restore drill succeeds and provider/financial reconciliation passes afterward;
- full mobile E2E passes for supported iOS/Android flows.

## Definition of done
Implementation + state transition + API/service + participant UX where applicable + admin control + audit event + metrics + unit/integration/state/E2E/failure tests + recovery path + documentation + staging evidence.
