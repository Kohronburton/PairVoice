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


## Passes 22–31 — Production Hardening Expansion

These passes extend the 21-pass master process. They are release gates, not optional polish.

### Pass 22 — Concurrency, Race Conditions & Idempotency
Attack simultaneous partner acceptance, matching, capacity reservation, Niva allocation, QA approval, earning creation, referral qualification and payout requests. Prove database constraints + transactional locks + idempotency keys prevent double assignment, double earnings, duplicate milestone rewards and duplicate payouts.

### Pass 23 — Financial Integrity & Reconciliation
Reconstruct every participant balance from the immutable ledger. Reconcile approved work → earning → available balance → payout request → provider transfer → settlement. Test adjustments, holds, reversals, failed/unknown provider responses, duplicate callbacks and provider-side success with PairVoice-side timeout.

### Pass 24 — Fraud, Abuse & Sybil Resistance
Threat-model duplicate humans/accounts, self-referrals, referral rings, shared payout destinations, device/account farming, location manipulation, repeated campaign attempts, collusive pairs, credential abuse and suspicious payout behavior. Risk signals may hold/review; they must not silently rewrite financial or participation history.

### Pass 25 — Provider Chaos & Dependency Failure
Inject Niva exhaustion/bad credentials, FunCrowd downtime/timeouts/schema changes, messaging failures, storage failures and payout-provider outages. PairVoice must preserve source-of-truth state, retry safely, reconcile uncertain external results and allow provider replacement without recreating participants/pairs/earnings.

### Pass 26 — Admin Error, RBAC & Insider-Safety
Attempt every sensitive action using wrong roles. Test accidental bulk operations, credential exposure, campaign edits, eligibility overrides, QA overrides, financial holds/releases, referral adjustments and payout actions. Require reason/evidence for consequential overrides, step-up auth where appropriate, audit history and reversible/compensating recovery.

### Pass 27 — Disaster Recovery, Backup & Restore
Run backup/restore drills for database and critical configuration. Define RPO/RTO targets before production. Restore to isolated environment, validate schema/migrations, rebuild projections, reconcile ledger/payout/provider state, verify credential assignments and prove no duplicate external action occurs after recovery.

### Pass 28 — Load, Scale & Marketplace Liquidity
Load-test signup spikes, magic links, partner-pool matching, campaign launch bursts, notification fan-out, admin queues, Niva assignment and payout batches. Measure p50/p95/p99 latency, queue depth, DB contention and failure rate. Add liquidity metrics: pool size, immediately matchable supply, time-to-match and supply gaps by language/country/campaign.

### Pass 29 — Mobile, Accessibility & Hostile-Network UX
Run supported iOS/Android mobile E2E under slow/intermittent networks, refresh/back navigation, duplicate taps, expired links, interrupted audio upload and session resume. Verify keyboard/screen-reader semantics, focus order, contrast, touch targets, localization expansion and recovery messaging.

### Pass 30 — Privacy, Consent, Retention & Data Lifecycle
Verify purpose/versioned consent, communication preferences, qualification-audio handling, provider data minimization, retention/deletion policy implementation, export/deletion workflows where applicable, secret redaction, logs/analytics minimization and jurisdiction/campaign configuration. Commercial reuse of qualification audio requires an explicit separate basis/consent.

### Pass 31 — Adversarial Launch Certification
Run the complete production chain plus deliberately broken variants from acquisition through payout/referral. Trace every critical requirement to Screen/API → DB → Event → Test → Admin Control → Documentation → Release Evidence. No P0/P1 unresolved defects, no untested financial mutation, no unowned recovery path, no undocumented state transition. Production activation requires signed release evidence and tested kill switches.

## 31-pass release rule
A feature is not complete because its happy path works. It is complete only when its state model, authorization, concurrency behavior, failure recovery, audit evidence, metrics, tests, operator controls and documentation all agree.
