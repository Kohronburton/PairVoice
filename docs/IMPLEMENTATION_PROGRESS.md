# PairVoice — Implementation → Instrumentation → Launch Progress

> Purpose: execution checkpoint for finishing PairVoice. This file records what has actually been implemented, what is verified, what remains blocked, and the exact next work. Repository code/tests/CI remain authoritative.

## Current branch / PR
- Branch: `phase-2-production-workflow`
- Pull request: **#9 — Phase 2: production workflow core**
- Base: verified Phase 0/1 merge `249994f84673e2270b54ca9cf30315b41d62b1ae`
- PR state: draft until production release gates are satisfied.

## Status key
- **VERIFIED** — implementation exists and required CI/tests passed on the stated commit.
- **IMPLEMENTED / UNVERIFIED** — code exists; current-head CI has not yet passed.
- **PLANNED** — agreed next work only.
- **BLOCKED** — cannot advance safely until dependency is resolved.

## Checkpoint A — Foundation
**VERIFIED** via merged PR #8:
- permanent participant identity;
- magic-link/session path;
- early-access lead conversion;
- partner pool / find-partner foundation;
- duplicate-phone constraint;
- referral/payout-method data foundation;
- workflow checkpoints + no-reset recovery invariants.

## Checkpoint B — Phase 2 readiness/provider foundation
**VERIFIED on earlier Phase 2 commits before the launch-instrumentation slice:**
- versioned voice qualification evidence;
- campaign eligibility evidence;
- pair readiness gates;
- capacity reservations;
- server-authoritative readiness;
- provider registry/bindings;
- provider credential inventory/reservation;
- reservation concurrency/idempotency;
- inventory exhaustion protection.

## Checkpoint C — Credential recovery
**VERIFIED on PairVoice Verify #116**
- credential replacement now honors the caller idempotency key before rotating again;
- old credential assignment remains preserved as REPLACED;
- old credential is revoked instead of erased;
- recovery action evidence is written once;
- work-provider-run creation is idempotent;
- SQL invariants added in `supabase/tests/provider_credential_recovery_invariants.sql`.

Relevant commits:
- `fbac95d453ba4f125206af4df5f9019b9a0359f0` — replacement idempotency
- `c8082d5c9964f7ba35e62d8a7568cef76476e510` — recovery/work-run invariants

## Checkpoint D — Anonymous acquisition instrumentation
**VERIFIED on PairVoice Verify #116**
- expanded funnel vocabulary from landing through referral;
- persistent first-touch attribution;
- current/last-touch attribution;
- UTM source/medium/campaign/content/term;
- invite/referral/source/fbclid/gclid capture;
- device-class telemetry;
- server-added request/country/user-agent context;
- campaign-view / campaign-CTA canonical event aliases;
- partner matching request/join instrumentation;
- invite share-channel instrumentation;
- financial telemetry uses non-sensitive status names (`earning_available`, `payout_requested`, `payout_completed`) and does not store payout credentials.

Relevant commits:
- `88ce7bf37705b8a84769bc580a1a748177c005c2`
- `4c1121163ba232a6b46391a9a7f6adc7e6fc0e41`
- `be4e48b65c7b20170cd4f1c563559f35a8760b5d`
- `6b4c525d466edb35593d38bcc9d4758b7effc8a5`
- privacy-contract correction: `860b9c0d354a8e7efb171afdb855ba84190133cc`

## CI history
Run #109 failed **only in the app unit-test job** because the old privacy test prohibits funnel event names containing the word `payment`. That issue was corrected without weakening the privacy rule.\n\n**PairVoice Verify #116 PASSED on head `bef29f1f06f0e3866763b745bee051e984597092`.**\n- app typecheck: PASSED\n- unit tests: PASSED\n- production build: PASSED\n- production dependency audit: 0 high/critical vulnerabilities\n- all migrations: PASSED\n- all database invariants, including launch instrumentation/recovery tests: PASSED
- database job: **PASSED**
- typecheck before tests: **PASSED**
- existing matching/workflow/invite/crypto/validation tests: **PASSED**
- failing test: `lib/funnel.test.ts` privacy contract
- resolution: preserved the privacy rule and renamed financial status telemetry to payout/earning terminology instead of weakening the test.

## Checkpoint E — Authoritative business milestones
**VERIFIED on PairVoice Verify #116**

Migration: `0015_launch_instrumentation_work_transitions.sql`

A separate server-authoritative `business_funnel_events` stream now records workflow milestones without relying on browser inference:
- `partner_invite_accepted`
- `pair_created`
- `pair_qualified`
- `gig_started`
- `submission_completed`
- `submission_approved`
- `submission_rejected`
- `earning_available`
- `payout_requested`
- `payout_completed`
- `referral_pair_completed`

Properties:
- idempotency key is mandatory and unique;
- campaign/pair/participant references are internal IDs only;
- pair-state trigger emits authoritative pair/work/approval milestones;
- payout triggers emit request/completion status without payment credentials;
- invite acceptance is recorded from the trusted pair API after successful pair formation.

Relevant commits:
- `84f3a7da72e7e57f296e68d3318798634c70c639` — authoritative milestone migration
- `7144e21867205fe3665a78eac42d488ae40fb660` — trusted invite-acceptance milestone

## Checkpoint F — Recoverable work transitions
**VERIFIED on PairVoice Verify #116**

New server function:
`transition_work_provider_run(...)`

State rules implemented:
- READY → LAUNCHING / IN_PROGRESS / CANCELLED / MANUAL_REVIEW
- LAUNCHING → IN_PROGRESS / FAILED / MANUAL_REVIEW
- IN_PROGRESS → SUBMITTED / FAILED / MANUAL_REVIEW
- SUBMITTED → COMPLETED / REWORK_REQUIRED / MANUAL_REVIEW
- REWORK_REQUIRED → IN_PROGRESS / CANCELLED / MANUAL_REVIEW
- FAILED → LAUNCHING / MANUAL_REVIEW

Behavior:
- repeat idempotency key returns the existing result;
- IN_PROGRESS advances the authoritative pair to RECORDING;
- SUBMITTED advances the pair to SUBMITTED;
- activity evidence is retained;
- external reference/result metadata/error state is stored on the work run;
- external provider state does not become PairVoice canonical pair state.

Admin route:
- `POST /api/admin/work`
- authorized roles: SUPER_ADMIN, OPERATIONS

## Checkpoint G — Approval / earnings
**VERIFIED on PairVoice Verify #116**

Admin route:
- `POST /api/admin/approve`
- authorized roles: SUPER_ADMIN, QA_REVIEWER, OPERATIONS
- calls existing idempotent `approve_pair_and_create_earnings`
- pair state transition emits authoritative approval + earning milestones automatically.

## Checkpoint H — Admin authorization + funnel command center
**VERIFIED on PairVoice Verify #116**

Security correction:
- previous `/api/admin/funnel` read from the service-role client without checking an authenticated admin membership.
- it now requires an active `admin_memberships` record.

Added:
- `lib/admin-server.ts` shared role check;
- protected `/api/admin/funnel`;
- `/admin/funnel` server-rendered command center.

30-day dashboard currently reports:
- landing → signup;
- signup → authoritative pair;
- pair → submission;
- submission → approval;
- acquisition event counts;
- authoritative workflow event counts;
- top first-touch sources.

Relevant commits:
- `d335a0a4514431b94655322e08b9d296722e6a66` — admin authorization helper
- `4171857c3738e3ab72da39f978eb2699aed83a06` — work admin route
- `82375e0fb413e78deb34a2cacd66d581204081e6` — approval route
- `f589f8faf12ee88dee5390105a2f88b4df805bac` — secure expanded funnel API
- `c9fdd71711c881ef5f4156f43764c3cab2cf9826` — admin funnel page

## Checkpoint I — Launch milestone invariants
**VERIFIED on PairVoice Verify #116**

Test:
`supabase/tests/launch_instrumentation_invariants.sql`

It proves in one rollback-safe scenario:
1. invite acceptance event is idempotent;
2. PARTNER_PENDING → PAIRED emits pair_created;
3. readiness → READY emits pair_qualified;
4. work run start advances pair to RECORDING and emits gig_started;
5. repeated start command is idempotent;
6. submit advances pair to SUBMITTED and emits submission_completed;
7. client approval creates earnings once;
8. approval emits submission_approved;
9. PAYABLE emits earning_available;
10. payout creation emits payout_requested;
11. payout settlement emits payout_completed.

Commit:
- `64e7c0231a8a6449527cf1f252a670d5f722d3e3`

## Current launch gates

| Gate | Status |
|---|---|
| Permanent identity/history | VERIFIED |
| Find-partner foundation | VERIFIED |
| Readiness/capacity | VERIFIED earlier slice |
| Credential reservation | VERIFIED earlier slice |
| Credential recovery | VERIFIED #116 |
| Attribution chain | VERIFIED #116 |
| Authoritative pair milestones | VERIFIED #116 |
| Work start/submission lifecycle | VERIFIED #116 |
| Approval → earnings | VERIFIED #116 |
| Payout status telemetry | VERIFIED #116 |
| Admin funnel view | VERIFIED #116 |
| FunCrowd manual external adapter | VERIFIED #134 |
| Internal/client QA workflow/API | VERIFIED #134; queue UI remains |
| Provider-neutral payout reconciliation | VERIFIED #134; live provider adapter remains |
| Referral qualification/reward execution | IMPLEMENTED / VERIFY |
| Durable lifecycle messaging/retry | IMPLEMENTED / VERIFY |
| Full mobile production E2E | PLANNED |
| Staging acceptance | PLANNED |
| Paid traffic | BLOCKED until end-to-end launch gates pass |

## Exact next implementation order
1. Get current-head PairVoice Verify green; fix only evidence-based failures.
2. Add WorkProvider/FunCrowd adapter boundary that launches/reconciles work without exposing provider state as canonical PairVoice state.
3. Add internal QA → client QA → rework/rejection operational endpoints and admin queue.
4. Add payout adapter/reconciliation with unknown-outcome handling; never infer transfer success from timeout.
5. Emit/refine referral qualification only after approved work.
6. Wire lifecycle messages to authoritative state transitions.
7. Complete admin queues/kill switches for work, payout, messaging and matching.
8. Run mobile E2E + hostile-network/retry acceptance.
9. Stage with controlled real participants.
10. Only after source → approved pair → payout is observable and recoverable, begin organic launch and then small paid acquisition.

## Marketing launch rule
The business metric remains **approved-pair CAC**, not signup CAC.
No paid scaling is authorized until the system can trace:
`source/creative → signup → partner/pair → submission → approval → earning/payout state`.

## Resume instruction
When work resumes, start with this file, the living master context, PR #9 current head, and the latest PairVoice Verify run. Do not re-plan completed slices or reset database/history to solve failures.


## Checkpoint J — Admin authorization hardening
**IMPLEMENTED / VERIFY**

All known `/api/admin/*` service-role surfaces now require an authenticated active admin membership.
- campaign access GET/PATCH: SUPER_ADMIN / OPERATIONS
- catalog: SUPER_ADMIN / OPERATIONS
- credential inventory/create/assign/release: SUPER_ADMIN / OPERATIONS
- pair queue: active admin
- pair state transition: SUPER_ADMIN / OPERATIONS
- stats/funnel: active admin
- work transitions: SUPER_ADMIN / OPERATIONS
- approval/QA: SUPER_ADMIN / QA_REVIEWER / OPERATIONS

Mutating pair/campaign operations now carry the authenticated admin user into audit/activity evidence where applicable.

## Checkpoint K — QA / rework
**IMPLEMENTED / VERIFY**

Added `record_pair_review(...)` and `POST /api/admin/qa`.

Internal QA:
- SUBMITTED → INTERNAL_QA
- APPROVED → CLIENT_QA
- REWORK_REQUIRED → REWORK_REQUIRED
- REJECTED → REJECTED

Client QA:
- APPROVED → existing idempotent approval + earnings flow
- REWORK_REQUIRED → REWORK_REQUIRED
- REJECTED → REJECTED

Properties:
- mandatory idempotency key;
- immutable review row retained;
- activity + audit evidence;
- duplicate review request returns original response;
- approval remains the only path that creates campaign earnings.

Test: `supabase/tests/qa_rework_invariants.sql`
- proves duplicate review request does not duplicate review;
- proves rework loop returns through recording/submission;
- proves internal pass advances to client QA;
- proves client approval creates exactly two pair-member earnings and authoritative approval telemetry.


## Checkpoint L — Manual external FunCrowd work path
**IMPLEMENTED / VERIFY**

Repository evidence identifies FunCrowd as the current external work provider for the U.S. English and Spain Spanish paired-conversation campaigns, but no verified FunCrowd API contract exists in this repository. The implementation therefore uses a controlled **MANUAL external WorkProvider adapter** instead of inventing an API.

Implemented:
- `funcrowd` registered as a WORK provider in MANUAL mode;
- published campaigns whose canonical provider is FUNCROWD bind to that provider through `campaign_provider_bindings`;
- `campaign_access.launch_url` stores the external work destination server-side;
- existing campaign invitation code remains in `campaign_access`, outside source control;
- `prepare_pair_work_access(...)` reveals external access only for PairVoice pairs in an allowed ready/work state;
- secure participant `/api/work/access` verifies authenticated participant → enrollment → active pair membership before returning provider access;
- participant START and SUBMIT actions call the idempotent PairVoice work-state transition rather than treating the external provider as canonical state;
- participant dashboard shows READY / RECORDING / REWORK_REQUIRED / SUBMITTED work;
- provider navigation uses a keepalive START checkpoint to reduce lost state when leaving PairVoice.

Verification test:
`supabase/tests/manual_external_work_adapter_invariants.sql`
- provider exists;
- access preparation is idempotent;
- exactly one work run is created;
- configured launch URL + invitation code are returned;
- start advances the pair to RECORDING and emits `gig_started`;
- submit advances the pair to SUBMITTED and emits `submission_completed`.

Relevant commits:
- `26b18ff1ee4110fd427ca3b6a9ab63e24bb69953` — manual external provider adapter
- `39e593e460f39b2ee1d5baf3a4f7bebcb7b4fa07` — secure participant work-access API
- `e9968d65ece0011d401391951a0b2f05073c1055` — admin launch URL configuration
- `927d1f7a88c925fdb6522f335962260399ac764e` — participant work card
- `039853a25dfb04aa9e6f4e30428fc56a5bdf7f30` — dashboard work surface
- `73e7a73df126657951845fbe2eb6b0d57d5898e2` — manual adapter invariants
- `f240752adf06bb1c348fb6d9145fc7cf42c05a00` — navigation checkpoint reliability


## Checkpoint M — Payout execution and reconciliation
**IMPLEMENTED / VERIFY**

The repository did not contain a verified live payout-provider adapter. This slice therefore establishes the provider-neutral financial safety layer and a controlled/manual first rail; real PayPal/Cash App/provider APIs remain separate integrations until their contracts and credentials are verified.

Implemented:
- `provider_payout_attempts` with INTENT / PROCESSING / SUCCEEDED / FAILED / UNKNOWN / MANUAL_REVIEW;
- only one unresolved payout attempt per payout;
- `participant_available_balance(...)` = immutable ledger balance minus REQUESTED/PROCESSING payout reservations;
- `request_participant_payout(...)` requires a VERIFIED default payout method, locks the participant, checks available balance and is idempotent;
- `create_payout_attempt(...)` is idempotent and moves the payout to PROCESSING;
- `reconcile_payout_attempt(...)` never infers success from a timeout;
- UNKNOWN / MANUAL_REVIEW keep the payout PROCESSING and create no payout ledger entry;
- only explicit SUCCEEDED reconciliation with a provider reference creates the negative immutable PAYOUT ledger entry and marks the payout PAID;
- repeat successful reconciliation cannot duplicate the ledger deduction;
- participant `POST /api/payout` uses the authenticated PairVoice identity;
- admin `/api/admin/payouts` is limited to SUPER_ADMIN / PAYMENTS for execution/reconciliation;
- payout request/completion telemetry contains status/currency context, not recipient/payment credentials.

Verification test:
`supabase/tests/payout_reconciliation_invariants.sql`
covers balance reservation, duplicate payout request, overdraw prevention, UNKNOWN provider outcome, later successful reconciliation, exactly-one ledger deduction, payout-completed telemetry, and post-payout balance.

Relevant commits:
- `44e6385c8ba67384b0abbf08b52c2087bcc199dc` — payout safety/reconciliation migration
- `dfdcc2392ac712f71aea0e66132b2d36be53f191` — participant payout request API
- `3159530dffe1717040af025826b39ba3847cdb6a` — payments-admin reconciliation API
- `8989544583cd936e0607350744d476b731a36d28` — payout invariant test


## Checkpoint N — Referral qualification and configurable rewards
**IMPLEMENTED / VERIFY**

Referral money is configuration-driven. Current production campaign versions still carry zero referral commission unless explicitly changed through a versioned campaign decision.

Implemented:
- approved pair state triggers referral qualification for referred participants;
- campaign `referral_commission_cents > 0` creates one AVAILABLE commission and one immutable REFERRAL_EARNING ledger entry per referral relationship/pair;
- zero commission creates no cash entry;
- `referral_pair_completed` telemetry records the successful referred pair independent of whether cash is configured;
- active `referral_programs` evaluate qualified referred participants by approved-job count;
- milestone award requires the configured number of qualified referrals;
- milestone bonus is created only when the active program has a nonzero configured bonus;
- unique keys on commission, milestone award and ledger entries make repeated processing idempotent;
- disabling the REFERRAL subsystem skips reward processing without blocking core pair approval.

Test: `supabase/tests/referral_qualification_invariants.sql`.

## Checkpoint O — Subsystem isolation and lifecycle messaging
**IMPLEMENTED / VERIFY**

Subsystem controls:
- MATCHING
- WORK
- PAYOUT
- MESSAGING
- REFERRAL

Only SUPER_ADMIN can change subsystem controls through `/api/admin/controls`; every change requires a reason and creates audit evidence.

Isolation behavior:
- MATCHING pause blocks new partner-pool joins;
- WORK pause blocks new work access/starts but does not block an already-working participant from submitting;
- PAYOUT pause blocks new payout requests and new execution attempts but does not block reconciliation of money already in flight;
- MESSAGING pause prevents outbox claiming while preserving queued messages;
- REFERRAL pause skips reward qualification without blocking campaign approval.

Lifecycle messaging:
- Pair formed → PAIR_FORMED
- Ready → WORK_READY
- Submitted → SUBMISSION_RECEIVED
- Rework → REWORK_REQUIRED
- Payable/approved earning → APPROVED
- Rejected → REJECTED
- Payout reconciled paid → PAYOUT_PAID

Messages are inserted into `outbox_events` with deterministic dedupe keys. The worker claims rows with SKIP LOCKED, retries failures with backoff, and moves exhausted failures to DEAD_LETTER. Delivery is through the existing Resend integration using bilingual EN/ES lifecycle templates. Missing provider configuration is treated as a delivery failure, not a false success.

Internal worker:
`POST /api/internal/outbox`
requires `PAIRVOICE_INTERNAL_SECRET` or `CRON_SECRET`.

Test:
`supabase/tests/operational_controls_messaging_invariants.sql`
covers message deduplication, claim behavior, retry status, messaging pause/resume and default subsystem state.


## Checkpoint N — Referral qualification
**IMPLEMENTED / VERIFY**

Approved work is now the qualification event for referrals.
- campaign referral commission is paid only when the approved campaign version explicitly configures a non-zero `referral_commission_cents`;
- current zero-valued campaigns therefore create no accidental cash commission;
- active referral milestone programs are evaluated from approved work;
- milestone bonus is paid only when the active program explicitly configures a non-zero bonus;
- campaign commissions, milestone ledger entries and `referral_pair_completed` telemetry are idempotent.

Test: `supabase/tests/referral_qualification_invariants.sql`.

## Checkpoint O — Production subsystem controls
**IMPLEMENTED / VERIFY**

Added audited kill switches for:
- MATCHING
- WORK
- PAYOUT
- MESSAGING
- REFERRAL

Failure-isolation rules:
- MATCHING off blocks new partner-pool actions;
- WORK off blocks new work access/start, but existing participants can still submit completed work;
- PAYOUT off blocks new requests and new execution attempts, but reconciliation remains available for in-flight money;
- MESSAGING off stops outbox claims without deleting messages;
- REFERRAL off skips new referral reward processing without blocking pair approval.

Only SUPER_ADMIN can change controls through `/api/admin/controls`; every change requires a reason and writes audit evidence.

Test: `supabase/tests/subsystem_controls_invariants.sql`.

## Checkpoint P — Durable lifecycle messaging
**IMPLEMENTED / VERIFY**

Pair/payout state changes now enqueue deduplicated lifecycle messages into the durable `outbox_events` table.
Templates:
- PAIR_FORMED
- WORK_READY
- SUBMISSION_RECEIVED
- REWORK_REQUIRED
- APPROVED
- REJECTED
- PAYOUT_PAID

Worker:
- `POST /api/internal/message-worker`
- requires `PAIRVOICE_WORKER_SECRET`;
- claims up to 20 messages with `FOR UPDATE SKIP LOCKED`;
- sends through the existing Resend integration;
- success → DELIVERED;
- failure → exponential retry;
- after 5 failed attempts → DEAD_LETTER;
- missing email provider configuration is treated as a retryable delivery failure, not a false success.

Test: `supabase/tests/lifecycle_messaging_invariants.sql` proves dedupe count, messaging pause, resume, retry and delivery completion.

## Latest verified CI
- PairVoice Verify #134: **PASSED**.
- Includes app typecheck/unit tests/build/audit plus database migrations and invariants through the payout reconciliation slice.
- Referral, controls and lifecycle messaging commits are newer and remain **IMPLEMENTED / VERIFY** until their current-head run passes.

## Remaining finish-critical work
1. Verify current head and repair only evidence-based failures.
2. Build admin operating queues/UI for QA, payout reconciliation, controls and dead-letter messages.
3. Add production scheduler/cron invocation for the message worker and health evidence.
4. Configure real campaign launch URL/invitation code in admin data; never commit secrets/codes to source.
5. Integrate a real payout provider only after provider/API contract and credentials are verified; controlled manual reconciliation remains the safe fallback.
6. Run mobile E2E on iPhone + Android across signup → pairing → work → submission → QA → payout request.
7. Run hostile-network/retry scenarios and kill-switch drills.
8. Run a controlled staging pilot with real participants and reconcile every pair/payout/message.
9. Only then merge PR #9 / production release and begin organic acquisition; paid traffic remains gated on approved-pair CAC observability.
