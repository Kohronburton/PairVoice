# PairVoice — Living Master Build Context

> Purpose: preserve the complete engineering/product context while PairVoice is built. Update this document as part of every consequential implementation slice. Never promote a planned item to implemented or verified without evidence.

## Status vocabulary
- **VERIFIED** — implementation exists and the stated automated/manual verification actually passed.
- **IMPLEMENTED / UNVERIFIED** — code/schema/config exists but the required verification has not passed yet.
- **PLANNED** — agreed design/requirement; not implemented.
- **UNKNOWN** — evidence is unavailable or insufficient.
- **SUPERSEDED** — deliberately replaced; preserve the decision trail.

## Non-negotiable product invariants
1. One human maps to one canonical PairVoice identity; duplicates are resolved/merged with history preserved.
2. PairVoice owns canonical business state. Niva, FunCrowd and payout providers are integrations, not sources of truth.
3. Participant/campaign/partner/work/QA/money/referral history is never reset as routine recovery.
4. Critical operations are idempotent, resumable and auditable.
5. Financial/audit history is immutable; corrections use compensating records.
6. Partner changes never erase campaign participation/eligibility history.
7. Campaign terms/economics accepted by participants are versioned.
8. Readiness is server-authoritative.
9. External provider failure cannot require recreating a participant/pair.
10. Consequential admin overrides require authorization, reason/evidence and audit.
11. Find Partner is launch-critical, not a future-only feature.
12. Mobile-first participant UX hides internal complexity without weakening server rules.
13. No feature is called complete based only on its happy path.
14. No destructive database reset/truncate/history deletion is an accepted production repair procedure.

## Core production chain
IDENTITY → PROFILE → CONSENT → CAMPAIGN ELIGIBILITY → VOICE QUALIFICATION → PARTNER / MATCH → PAIR → CAPACITY → CREDENTIAL → READY → WORK → SUBMISSION → INTERNAL QA → CLIENT QA → APPROVAL → EARNING → WALLET → PAYOUT → REFERRAL / REPUTATION → NEXT OPPORTUNITY

Horizontal systems: messaging, support, risk/fraud, analytics, audit, RBAC, configuration/feature flags, localization, observability, backup/recovery.

## Participant experience target
Primary production navigation: Home | Jobs | Partners | Wallet | Profile.

Participant mental model:
1. Join
2. Qualify
3. Pair
4. Get Ready
5. Work
6. Get Approved & Paid
7. Return / Refer

## Admin operating model
Primary grouping: Dashboard | People | Work | Money | Messages | System.

Admin must eventually control/observe participant identity, possible duplicates, partner pool/matches, campaigns/rules, eligibility, samples, pair readiness, provider integrations, Niva-style credential inventory, work sessions, QA/rework, ledger/wallet, payouts, referrals/rewards, messages, risk/holds, audit, metrics, kill switches and recovery queues.

## Phase 0/1 — VERIFIED MERGED FOUNDATION
PR #8 was merged to main as squash commit:
`249994f84673e2270b54ca9cf30315b41d62b1ae`

Verified before merge:
- application typecheck
- unit tests
- production build
- production dependency audit
- complete migration application in CI
- database invariant suite
- no-reset recovery invariant suite

Implemented foundation includes permanent participant identity support, magic-link/session path, early-access lead conversion/claiming, partner pool/find-partner foundation, duplicate phone constraint, referral-program/milestone data foundation, payout-method data foundation, workflow checkpoints and recovery actions.

Recovery standard: VALIDATE → CHECKPOINT → EXECUTE → RECORD RESULT → VERIFY → ADVANCE. Failure preserves state and resumes/reconciles rather than resetting.

## Phase 2 branch / PR
Branch: `phase-2-production-workflow`
PR: #9 — Phase 2: production workflow core
Base checkpoint: `249994f84673e2270b54ca9cf30315b41d62b1ae`
PR remains draft until the production-core release gates are satisfied.

### VERIFIED Phase 2 evidence
At commit `98a71965bce5123754f34e8cf0df6803e1fff5cb`, PairVoice Verify run #101 completed successfully.

At commit `9a7c7bdd97d9c4bbbfa983eb0f04acceb3c8b92e`, PairVoice Verify run #103 completed successfully.

Therefore the following Phase 2 slice is VERIFIED through #103:
- versioned voice-sample schema/history foundation
- eligibility-evaluation evidence table
- campaign-specific pair-readiness gates
- capacity-reservation data model
- server-authoritative readiness evaluation
- provider integration registry
- campaign/provider bindings
- provider credential inventory
- concurrency-safe credential reservation
- idempotent same-request reservation behavior
- one-active-assignment constraints
- inventory exhaustion safe failure
- credential readiness evidence
- associated database invariant tests

### Important scope limits
The above does **not** mean:
- real Niva API integration is verified;
- actual Niva credentials have been imported;
- FunCrowd integration is complete;
- recording/work execution is complete;
- QA/client approval UI/workflows are complete;
- PayPal or another payout provider is working;
- referral cash bonus execution is complete;
- Admin OS is complete;
- Phase 2 is production-ready.

Those remain PLANNED/IN PROGRESS until separately implemented and verified.

## Current implementation position
Last verified Phase 2 commit: `9a7c7bdd97d9c4bbbfa983eb0f04acceb3c8b92e`.
Current next slice:
1. credential release/replacement/revocation lifecycle;
2. safe recovery from bad/exposed/unusable credentials without pair reset;
3. tests for lifecycle/idempotency/history preservation;
4. verify CI;
5. then implement WorkProvider/FunCrowd abstraction and recoverable work/session lifecycle.

## Provider architecture
Provider classes:
- WorkProvider — FunCrowd initially; ManualExternal / PairVoice Native later.
- CredentialProvider — Niva-style credentials initially; replaceable.
- PayoutProvider — controlled initial rail; PayPal/additional rails later.
- MessagingProvider
- StorageProvider

Provider-specific IDs/secrets/metadata must not become PairVoice's canonical workflow state.

## Voice qualification
State model:
NOT_STARTED → RECORDED → PROCESSING → REVIEW_PENDING → PASSED | RETEST_REQUIRED | FAILED

Attempts are versioned. A retest must not overwrite prior evidence. Qualification audio reuse beyond the qualification purpose requires an appropriate separate consent/basis.

## Pair readiness
Required conceptual gates:
PARTNER_ACCEPTED
ELIGIBILITY_A
ELIGIBILITY_B
SAMPLE_A
SAMPLE_B
CONSENT_A
CONSENT_B
PARTICIPATION_HISTORY
CAPACITY
CREDENTIAL

A pair becomes READY only when every configured mandatory gate is satisfied/validly waived by authorized policy.

## Work / QA / money target states
Work:
READY → IN_PROGRESS → SUBMITTED → INTERNAL_QA → CLIENT_QA → APPROVED | REWORK_REQUIRED | REJECTED

Money:
APPROVED → EARNING_CREATED → AVAILABLE → PAYOUT_REQUESTED → PROCESSING → PAID | FAILED/HOLD

Never infer payment success from a timeout. Reconcile unknown provider outcomes before retrying an externally consequential operation.

## Matching / partner rules
Three participant paths are required:
- Invite Someone
- Connect Existing PairVoice User
- Find Me a Partner

Matching must be privacy-preserving and campaign-aware. Partner changes do not reset eligibility or participation history. Existing-existing linking requires mutual acceptance. Self-pairing and duplicate active pairing are forbidden.

## Referral system
Planned prominent milestone: invite 10 people and earn a configurable cash bonus.

A registration alone does not count as a qualified referral. Current intended qualification is verified participant plus qualifying approved work; exact business rule remains configurable/versioned until locked in implementation.

Milestone reward must be idempotent and fraud-checked. Duplicate humans, self-referrals, loops/rings and duplicate reward attempts must be tested before cash rewards are activated.

Historical campaign economics are separate from the milestone concept and must not be silently rewritten.

## Payout architecture
PairVoice Ledger → Available Balance → Payout Request → Provider Adapter → Processing → Paid / Failed / Hold.

PairVoice owns balance/history. Provider executes transfer. PayPal and other rails are PLANNED until real adapters and reconciliation tests exist.

## Reliability / recovery requirements
Every critical external action requires:
- durable intent/checkpoint
- idempotency key
- bounded retry
- timeout
- provider-result recording
- reconciliation for uncertain outcome
- manual-review/dead-letter path
- correlation/request ID
- audit/activity evidence
- subsystem kill switch where consequential

Production recovery must use forward repair, retry, reconciliation or compensating action—not destructive reset.

## 31-pass master process
1. System boundaries & invariants
2. Early Access
3. Identity & participant profile + magic link
4. Participant dashboard
5. Wallet/ledger + payout adapter
6. Gamification/incentives
7. Partner network + Day-1 Find Partner
8. Referral engine + 10-qualified milestone
9. Campaign/eligibility
10. Voice qualification
11. Pair readiness
12. Provider abstraction
13. Niva credential operations
14. Recording/work
15. QA/approval
16. Communications
17. Admin OS
18. Security/fraud/support/resilience
19. Analytics/marketplace intelligence
20. Final integration
21. Verification/documentation audit
22. Concurrency/race/idempotency
23. Financial integrity/reconciliation
24. Fraud/abuse/Sybil resistance
25. Provider chaos/dependency failure
26. Admin error/RBAC/insider safety
27. Disaster recovery/backup/restore
28. Load/scale/marketplace liquidity
29. Mobile/accessibility/hostile-network UX
30. Privacy/consent/retention/data lifecycle
31. Adversarial launch certification

## Pass 31 traceability requirement
Every critical requirement must trace:
Requirement → Screen/API → Database → State/Event → Test → Admin Control → Recovery → Documentation → Release Evidence.

## Definition of done
For a consequential feature, DONE requires all applicable:
- implementation
- authorization
- state transition enforcement
- database constraints
- idempotency/concurrency behavior
- participant UX
- admin control
- activity/audit evidence
- metrics/observability
- unit/integration/state/E2E/failure tests
- recovery path
- documentation
- staging/release evidence

## Documentation discipline
For every consequential slice:
1. update this master context;
2. update the relevant focused specification/runbook;
3. record commit/PR and verification evidence;
4. explicitly mark VERIFIED vs IMPLEMENTED/UNVERIFIED vs PLANNED;
5. record failures and why the fix was chosen;
6. preserve superseded decisions instead of silently rewriting history;
7. state the exact next implementation step.

This document is a context ledger, not proof by itself. Repository code, migrations, tests, CI results and production/staging evidence remain the authoritative implementation evidence.


## Instrumentation + launch telemetry slice
Status: **IMPLEMENTED / UNVERIFIED** pending PairVoice Verify CI on the current PR head.

Implemented:
- persistent first-touch attribution captured client-side and attached to every funnel event;
- last-touch attribution captured on every event;
- UTM/source/referral/invite/click identifiers retained in telemetry metadata;
- device class attached to client funnel events;
- server-side request/country/user-agent context attached to telemetry without making those values canonical participant identity;
- canonical aliases for campaign view, campaign CTA and partner-invite creation while preserving legacy event compatibility;
- partner matching choice/request/join events;
- partner invite share-click channel events for WhatsApp, SMS, email, Facebook and copy-link;
- expanded event vocabulary through pair, gig, submission, payment and referral milestones so later slices can emit against one stable contract;
- credential replacement now returns the existing assignment for a repeated idempotency key rather than rotating credentials again;
- database invariants now cover credential replacement idempotency, preservation of replaced assignment history, single recovery evidence, and work-provider-run idempotency.

Launch rule:
Do not optimize paid acquisition against raw signups. The primary acquisition metric remains approved-pair CAC. Funnel telemetry must trace source/creative → signup → partner/pair → submission → approval before paid scale.

Next implementation:
1. verify this slice in CI;
2. emit partner acceptance/pair-created events from server-authoritative pair transitions rather than inferring them from UI;
3. implement recoverable work-provider launch/submission transitions and corresponding telemetry;
4. add approval/earning/payment telemetry at the authoritative server transition;
5. build the admin funnel view from stored events and campaign state.
