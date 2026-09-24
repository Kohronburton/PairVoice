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
| Referral qualification/reward execution | VERIFIED #148 |
| Durable lifecycle messaging/retry | VERIFIED #148 |
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
**VERIFIED on PairVoice Verify #148**

Approved work is now the qualification event for referrals.
- campaign referral commission is paid only when the approved campaign version explicitly configures a non-zero `referral_commission_cents`;
- current zero-valued campaigns therefore create no accidental cash commission;
- active referral milestone programs are evaluated from approved work;
- milestone bonus is paid only when the active program explicitly configures a non-zero bonus;
- campaign commissions, milestone ledger entries and `referral_pair_completed` telemetry are idempotent.

Test: `supabase/tests/referral_qualification_invariants.sql`.

## Checkpoint O — Production subsystem controls
**VERIFIED on PairVoice Verify #148**

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
**VERIFIED on PairVoice Verify #148**

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
- PairVoice Verify #148: **PASSED** referral qualification, subsystem controls, lifecycle messaging migrations/invariants plus the full existing app/database suite.

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


## Checkpoint Q — Admin operations console
**IMPLEMENTED / VERIFY**

Added `/admin/operations` as an authenticated read-only command surface for:
- subsystem control status and incident reason;
- QA / client-QA / rework queue;
- payout requests, processing/failures and unresolved provider attempts;
- messaging FAILED / DEAD_LETTER visibility.

The page intentionally does not bypass the mutation APIs. State changes remain behind role-protected endpoints so audit/idempotency rules cannot be skipped.

## CI note — messaging test isolation
Intermediate runs #143–#146 showed the app job green while the database job failed because `operational_controls_messaging_invariants.sql` assumed the shared CI database outbox contained only four rows from that test. Earlier invariant tests correctly left committed test outbox rows in the same database, so `claim_message_outbox(20)` claimed 12.

Correction:
- the invariant now claims the queue normally but counts/asserts only lifecycle events belonging to its own generated pair;
- production outbox behavior was not weakened;
- the dedicated `lifecycle_messaging_invariants.sql` already passed in #146.


## Verified finish-line status — #148
PairVoice Verify #148 completed successfully after the test-isolation correction.
- app: PASSED
- database: PASSED
- referral qualification invariants: PASSED
- lifecycle messaging invariants: PASSED
- subsystem/operational controls messaging invariant: PASSED
- prior workflow/provider/payout/recovery invariants remained green.

The remaining launch blockers are now external/operational:
1. configure production environment variables/secrets and worker scheduler;
2. configure real FunCrowd launch URL/invitation data through admin storage;
3. decide/configure the actual payout rail or use the controlled manual reconciliation fallback;
4. complete admin mutation UI convenience controls if desired (APIs are already protected/available);
5. real-device iPhone + Android E2E;
6. controlled real-participant staging pilot;
7. production migration/deploy + smoke/rollback drill;
8. approved-pair CAC observation before paid scaling.


## Verification checkpoint — PairVoice Verify #151
**VERIFIED** on branch head `c6a8b0570b813d49db93c2e67784eb6e095e07f4`.

Run #151 passed:
- TypeScript typecheck;
- unit tests;
- production Next.js build;
- production dependency audit;
- all database migrations through the controls/messaging/referral/payout work present at that head;
- all database invariant suites present at that head.

This verifies the accumulated implementation through:
- admin authorization hardening;
- authoritative funnel milestones;
- manual external FunCrowd work path;
- QA/rework;
- payout request/execution/reconciliation;
- referral qualification/configurable rewards;
- subsystem controls;
- durable lifecycle messaging;
- production operations console;
- messaging test-isolation correction.

The backup/restore drill and computed release-readiness view were added after #151 and require their own current-head green run before being marked VERIFIED.

## Checkpoint P — Release readiness calculation
**IMPLEMENTED / VERIFY**

Added protected `GET /api/admin/release-readiness` and `/admin/readiness`.

Blocking checks include:
- core subsystem controls;
- unresolved UNKNOWN/MANUAL_REVIEW payouts;
- required Supabase/service/site/messaging/worker/encryption environment configuration;
- active campaign published version;
- active WORK provider binding;
- FunCrowd/manual external launch URL;
- campaign invitation code when required by version policy;
- available credential inventory when the campaign has an active CREDENTIAL provider binding.

Dead-letter lifecycle messages are surfaced as a watch condition. The protected API returns a single `ready` boolean plus the exact blocking checks; it does not override staging/mobile acceptance evidence.


## Checkpoint Q — Launch positioning on current production funnel
**VERIFIED by PairVoice Verify runs after commit**

The current PR #9 public page now uses the locked PairVoice acquisition positioning without importing the stale PR #5 implementation:
- English: **Get paid to talk.**
- Spanish: **Hablad. Grabad. Cobrad.**
- campaign cards remain database-driven;
- first name/email/consent requirements remain intact;
- attribution instrumentation remains intact;
- invite URL + partner-share success flow remains intact;
- empty/error catalog fallback remains intact.

PR #5 remains stale/not mergeable and must not be merged wholesale because it predates current identity/invite/instrumentation contracts.

## Checkpoint R — Existing registered users can connect campaign-specifically
**VERIFIED by PairVoice Verify #159 and later green runs**

Migration: `0022_existing_partner_linking.sql`.

Implemented:
- `campaign_partner_requests` with PENDING / ACCEPTED / DECLINED / CANCELLED / EXPIRED;
- link request uses the target's PairVoice public code rather than searchable email;
- both participants must already be QUALIFIED for the same published campaign;
- both participants must still have an active PARTNER_PENDING pair for that campaign;
- mutual acceptance is required;
- self-pairing is forbidden;
- target's old PARTNER_PENDING pair is preserved as CANCELLED, not deleted/reset;
- target's old active pair membership is deactivated with removal history;
- requester's pair becomes the canonical PAIRED record;
- campaign enrollment/history remains unchanged;
- other stale pending requests involving either participant are cancelled;
- authoritative `partner_invite_accepted` records source=`existing_user`;
- normal pair-state trigger emits `pair_created` and lifecycle messaging.

Participant API:
- `GET/POST /api/existing-partner`

Participant UI:
- `ExistingPartnerLink` appears for campaign PARTNER_PENDING pairs in the dashboard.
- user can share/copy their own public code, enter partner code, send request, accept/decline.

Invariant test:
- `supabase/tests/existing_partner_linking_invariants.sql`
proves idempotent request/accept, canonical pair, cancelled superseded pair, preserved enrollment history, inactive superseded membership, telemetry, and self-pair protection.

## Checkpoint S — Participant Wallet and payout destination privacy
**VERIFIED by PairVoice Verify #166 and earlier green runs through the wallet/payout API**

Participant Wallet:
- `/wallet`
- available balance from server-authoritative `participant_available_balance`;
- total positive earnings;
- reconciled PAID payout total;
- immutable ledger activity;
- payout request status;
- verified/pending payout-method state;
- one-click request of current available balance only.

Payout-method setup:
- `GET/POST /api/payout-method`
- participant selects PayPal / Cash App / controlled manual rail;
- recipient destination is encrypted with existing AES-256-GCM `PAIRVOICE_CREDENTIAL_ENCRYPTION_KEY`;
- participant APIs never return the recipient destination after storage;
- newly supplied method is PENDING and must be verified by authorized payments staff;
- prior default methods are no longer default when a new destination is supplied.

Payments admin:
- `GET/PATCH /api/admin/payout-methods`
- verification/disable requires SUPER_ADMIN or PAYMENTS and a reason;
- recipient reveal is a separate SUPER_ADMIN/PAYMENTS-only endpoint:
  `/api/admin/payout-methods/[id]/recipient`;
- reveal writes an audit event;
- legacy plaintext destination is tolerated only for backward compatibility; new destinations are encrypted.

Financial history hardening:
- migration `0023_payout_method_freeze.sql`;
- each payout request freezes `payout_method_id` to the exact VERIFIED method selected at request time;
- later default-method changes cannot rewrite an in-flight payout's intended destination;
- payout reconciliation invariant now explicitly verifies the frozen payout method.

## Checkpoint T — Dedicated QA and Payments operator consoles
**IMPLEMENTED / current-head verification pending at time of this entry**

QA console:
- `/admin/qa`
- lists SUBMITTED / INTERNAL_QA / CLIENT_QA / REWORK_REQUIRED;
- all decisions call `/api/admin/qa`, never generic state mutation;
- internal pass → CLIENT_QA;
- client pass → approved earnings flow;
- rework/reject require notes/evidence.

QA bypass closed:
- generic `/api/admin/pairs/transition` now rejects INTERNAL_QA, CLIENT_QA, REWORK_REQUIRED, REJECTED and financial target states;
- dedicated review/approval/payment operations are required.

Payments console:
- `/admin/payments`
- payout-method verify/disable;
- audited recipient reveal;
- frozen-destination reveal for an individual payout;
- start provider attempt;
- reconcile SUCCEEDED / FAILED / UNKNOWN / MANUAL_REVIEW;
- provider reference is required before success is recorded;
- UNKNOWN remains a reconciliation state and cannot silently become paid.

Dashboard cleanup:
- removed the misleading "Verify your phone" next-step blocker because no launch SMS verification rail exists;
- phone verification remains data capability that can be requested later by a campaign when a real verification provider/workflow is implemented.


## Checkpoint U — Versioned legal documents and exact campaign consent
**IMPLEMENTED / current-head verification pending at time of this entry**

The prior `accepted_terms_at` timestamp was insufficient by itself because it did not prove which text a participant accepted. The production workflow now records the exact published document versions.

Migration:
- `0024_versioned_legal_consent.sql`

Data model:
- `legal_documents`
  - SITE: PRIVACY / TERMS
  - CAMPAIGN: CAMPAIGN_TERMS / PARTICIPANT_CONSENT
  - locale + version + SHA-256 + status
- `legal_document_acceptances`
  - participant
  - campaign enrollment when applicable
  - exact document ID
  - acceptance timestamp/context

Publication safety:
- documents are created as DRAFT;
- SUPER_ADMIN publication requires a reason;
- publication writes audit evidence;
- publishing a replacement retires the prior published version for the same scope/key/locale/campaign version;
- published document content is immutable;
- no placeholder legal language was generated as production policy text.

Participant consent:
- `GET/POST /api/consent`
- `CampaignConsentCard` in the participant dashboard;
- campaign terms + participant consent must both be published for the participant's language and exact campaign version;
- acceptance records both exact document IDs;
- `accepted_terms_at` is set only through the exact-document acceptance flow;
- the participant's own `CONSENT_A` or `CONSENT_B` readiness gate is passed with exact document IDs as evidence;
- one participant's acceptance never passes the other participant's gate;
- repeat acceptance is idempotent.

Public legal routes:
- `/privacy`
- `/terms`
render only PUBLISHED site documents. Missing publication displays a not-certified message rather than fabricated legal text.

Admin:
- `/admin/legal`
- `GET/POST /api/admin/legal-documents`
for reviewed draft creation and audited publication.

Release readiness:
- English site PRIVACY and TERMS are blocking launch gates;
- each active campaign's published version must have CAMPAIGN_TERMS and PARTICIPANT_CONSENT before release readiness can pass.

Invariant test:
- `supabase/tests/versioned_legal_consent_invariants.sql`
proves published immutability, exact two-document acceptance, readiness evidence, per-participant isolation, repeat idempotency and partial-acceptance rejection.

### Remaining legal/operator input
Engineering intentionally does **not** invent or approve the final legal language. Before staging certification can pass, reviewed/approved Privacy, Terms, Campaign Terms and Participant Consent text must be supplied and published through the admin console.


## Finish-line verification note — 2026-09-24
CI caught a TypeScript import-path defect in the newly added public legal renderer after the legal routes were introduced. Database verification for that run was green. The renderer import was corrected in commit `064d187d618b4307046d6fba5474c8ff53906906`.

Do **not** treat runs #176–#180 as current-head certification if they predate that fix. Final engineering certification requires a green PairVoice Verify run whose head SHA is at or after `064d187d618b4307046d6fba5474c8ff53906906`.

PR #9 remains intentionally DRAFT until:
1. current-head CI is green;
2. reviewed legal text is published;
3. staging environment readiness returns no blocking failures;
4. the manual/mobile staging certification has evidence;
5. the controlled real-pair rollout succeeds without database repair.


## FINAL ENGINEERING CERTIFICATION — PairVoice Verify #183
**VERIFIED — 2026-09-24**

Certified branch head:
`cd4782c3528d38dada4f4384e44e316ecd84c34f`

PairVoice Verify run #183:
- app job: PASS
- database job: PASS
- TypeScript typecheck: PASS
- unit tests: PASS
- production Next.js build: PASS
- database migrations: PASS
- all database invariant suites: PASS
- versioned legal/consent invariants: PASS
- backup/restore drill: PASS

The two defects found by run #181 were corrected before this certification:
1. public legal routes are request-time dynamic so production build does not require runtime Supabase secrets during prerender;
2. campaign consent now uses actual `enrollment_status` enum values (`QUALIFIED` / `ACTIVE`).

### Engineering freeze point
PR #9 remains DRAFT and mergeable. Engineering implementation is now frozen at this verified checkpoint unless staging evidence finds a real defect.

### What remains before production launch
These are configuration/evidence gates, not unimplemented core workflow:
1. Deploy the certified branch to a staging environment.
2. Configure required staging secrets shown by `/api/admin/release-readiness`.
3. Configure real campaign WORK provider binding, FunCrowd/external launch URL and invitation code policy.
4. Load any required credential inventory/capacity.
5. Supply reviewed/approved Privacy, Terms, Campaign Terms and Participant Consent text; publish via `/admin/legal`.
6. Confirm `/admin/readiness` and `/api/admin/release-readiness` have zero blocking failures.
7. Execute `docs/STAGING_ACCEPTANCE_AND_LAUNCH_CERTIFICATION.md` on iPhone Safari, Android Chrome, narrow mobile viewport and desktop.
8. Complete the controlled 2-real-pair smoke, then 10-approved-pair proof batch.
9. Inspect source → signup → pair → work → submission → approval → payout and support/rejection metrics.
10. Only after that evidence: remove PR #9 from draft, merge/deploy, then begin organic acquisition before small paid acquisition.

### Explicitly not certified yet
- production hosting/deployment itself;
- real FunCrowd provider behavior;
- final legal language;
- live payout-provider transfer behavior;
- mobile/browser behavior on real devices;
- real-pair operational throughput.

Those require external environment/provider/human evidence and must not be inferred from CI.


## Live Early Access replacement cutover
A separate, deliberately narrow production PR was created from `main` so the new PairVoice Early Access presentation can replace the old live presentation without merging the entire Phase 2/staging branch.

Production cutover PR:
- PR #10 — **Replace current Early Access with new PairVoice paid-gig experience**
- Branch: `replace-current-early-access`
- Base: `main`
- Scope: `app/page.tsx` only
- Backend/database changes: none

Reason:
- `main` and PR #9 already share the same `/api/lead` signup endpoint and partner invite page.
- The replacement page uses funnel event names already supported on `main`.
- This allows the public messaging/experience to become **Get paid to talk / Hablad. Grabad. Cobrad.** immediately while the larger Phase 2 workflow remains behind staging certification.

Do not let later Phase 2 merges revert the live homepage copy to the former **One account / Multiple opportunities / Early access** presentation.


## PR #9 mainline reconciliation
After production PR #10 replaced the live Early Access homepage on `main`, PR #9 temporarily became non-mergeable because both branches had touched `app/page.tsx`.

Resolution:
- verified `main` and `phase-2-production-workflow` contain the exact same homepage blob;
- merged `main` commit `4311c23795cc9ce8451e21b4425277fe06d179f8` into the Phase 2 branch with a normal two-parent merge commit;
- preserved the full Phase 2 branch tree because the live homepage cutover content was already identical;
- post-reconciliation comparison reports Phase 2 **ahead of main and 0 commits behind**.

Fresh CI after this reconciliation is required before PR #9 is considered merge-ready.


## Staging infrastructure checkpoint — 2026-09-24
**IMPLEMENTED / PARTIALLY CONFIGURED**

Render:
- workspace: Kohron's workspace
- service: `pairvoice-staging`
- service ID: `srv-daqin049v7es73darq4g`
- branch: `phase-2-production-workflow`
- region: Virginia
- origin: `https://pairvoice-staging.onrender.com`
- auto-deploy: enabled
- public target hostname for Cloudflare: `pairvoice-staging.onrender.com`
- `NEXT_PUBLIC_SITE_URL=https://staging.pairvoice.com`

Supabase:
- isolated project: `PairVoice Staging`
- project ref: `dnhxgnzhcxyjwblhacuj`
- region: us-east-1
- production data was NOT copied
- all repository migrations 0001–0025 applied successfully
- canonical published U.S. English ($60/pair) and Spain Spanish ($50/pair) campaigns exist in staging

Staging-only secrets already generated/configured in Render:
- credential encryption key
- internal worker secret
- public Supabase URL/publishable key

Secrets intentionally NOT committed or recorded here:
- Supabase service-role/secret key
- Resend API key
- admin Basic Auth credentials

### Security hardening discovered during staging
Supabase advisors exposed real issues not caught by CI:
- eight PostgREST-visible tables lacked RLS;
- campaign signup and partner-join RPCs were callable by anonymous clients because server routes still used the public key;
- trigger-only SECURITY DEFINER functions were publicly executable;
- multiple helper functions had mutable search_path.

Corrective work:
- `app/api/signup` now uses `serviceClient()`;
- `app/api/pair` now uses `serviceClient()`;
- migration `0025_security_hardening.sql` enables RLS on remaining exposed tables;
- signup/partner RPCs are service-role only;
- legacy lead RPCs are service-role only;
- trigger-only SECURITY DEFINER functions are no longer executable via anon/authenticated RPC;
- flagged helper search paths are pinned;
- `supabase/tests/security_surface_invariants.sql` prevents regression.

Evidence:
- PairVoice Verify #194: PASS on head `5cd8212b45f9eae7c0bf0e6e17244f9ba00d8d7b`;
- Supabase staging advisor: no remaining PairVoice RLS-disabled errors, mutable-search-path warnings, or anonymous SECURITY DEFINER exposure warnings.
- remaining advisor items are informational server-only RLS/no-policy notices plus the generic citext-extension warning.

### Remaining staging configuration blockers
1. Set `SUPABASE_SERVICE_ROLE_KEY` on Render from the **PairVoice Staging** Supabase project. The Supabase connector intentionally does not expose this credential.
2. Set staging admin Basic Auth credentials (`PAIRVOICE_ADMIN_USER`, `PAIRVOICE_ADMIN_PASSWORD`).
3. Set `RESEND_API_KEY` before lifecycle/welcome-email acceptance.
4. Add `staging.pairvoice.com` as a Render custom domain and point Cloudflare CNAME `staging` to `pairvoice-staging.onrender.com`.
5. Publish reviewed staging legal documents and configure FunCrowd launch/access values.
6. Run the staging acceptance certification and controlled pair tests.


## Production marketplace conversion pass — 2026-09-24
**IMPLEMENTED**

Goal: move the public staging experience from a polished marketplace to a conversion-focused 9+/10 production candidate without inventing testimonials, payout timing, capacity, approval rates, or participant counts.

Changes:
- hero now leads with the concrete outcome: **Get paid to talk** / **Cobrad por hablar**;
- partner mechanic is part of the headline rather than buried in workflow copy;
- current market-relevant published gig payout is surfaced above the fold when available;
- primary hero CTA is **See if I qualify**, routed directly into the selected campaign;
- secondary CTA remains browse-oriented so users can compare gigs before committing;
- trust line explicitly states no experience required, free signup, no card, and requirements before recording;
- gig cards answer what the participant does and when payment occurs;
- campaign CTA changed from passive **View gig** to **See if I qualify**;
- proof strip uses only verifiable product facts; no fabricated social proof;
- no artificial urgency or fake remaining-capacity claims were added because staging does not yet expose verified public capacity;
- mobile CTA/fact layout tightened for one-handed conversion.

Next proof upgrade after real staging/production data exists:
- expose verified campaign capacity/remaining slots if operations approves it for public display;
- replace generic product proof with measured completed-pair, approval, payout, or participant metrics only after those figures are trustworthy.


## Four additional conversion passes — 2026-09-24
**IMPLEMENTED**

These passes build on the production marketplace conversion pass and intentionally avoid fabricated testimonials, fake urgency, unsupported approval rates, or invented payout timing.

### Pass 1 — Offer compression
Goal: remove the need to mentally assemble the offer from multiple sections.

Changes:
- gig cards now show the work action, approval/payment condition, estimated recording duration when campaign data provides it, and the immediate next step;
- payout remains visually dominant;
- campaign requirements stay ahead of signup;
- offer structure is now closer to: **payout → what you do → time/partner requirement → qualification CTA**.

### Pass 2 — Objection removal
Goal: increase perceived likelihood and trust without using unverifiable social proof.

Added a dedicated **No surprises** section answering:
- Do I need experience?
- Do I need a partner?
- When do I get paid?
- Do I pay to join?

Every answer is constrained to current PairVoice product behavior:
- experience is not assumed;
- partner requirement is campaign-specific;
- payment follows completed-work review/approval;
- account creation is free and does not require a card.

### Pass 3 — Signup friction reduction
Goal: stop making campaign users re-enter facts the selected campaign already determines.

Changes to `/join?campaign=...`:
- campaign country and language are now locked campaign facts instead of editable dropdowns;
- values are still submitted server-side from the selected campaign;
- first name, email, age confirmation and consent remain the required participant inputs;
- compact progress cue added: **Account → Partner → Work**;
- selected gig payout/market/partner context remains visible beside the form.

This reduces unnecessary choices while preserving campaign eligibility enforcement on the server.

### Pass 4 — Mobile conversion
Goal: preserve the best offer/CTA while users scroll on small screens.

Changes:
- added mobile-only sticky conversion bar for the currently relevant gig;
- bar includes real published payout when available, gig name and **See if I qualify** CTA;
- CTA routes directly into the selected campaign join flow;
- trust section, campaign facts, micro-progress and CTA layout collapse cleanly for narrow mobile screens;
- no sticky desktop obstruction was added.

### Current conversion philosophy
The page now prioritizes:
1. concrete economic outcome;
2. real published opportunity;
3. reduced uncertainty;
4. minimal next action;
5. campaign-specific qualification;
6. partner flow;
7. work/approval/payment transparency.

The next major conversion upgrade should come from **real operating proof**, not more speculative copy:
- verified completed-pair counts;
- verified payout totals;
- measured approval/rejection rates;
- real campaign capacity/remaining slots if operations approves public display;
- participant testimonials only after collected with permission.


## 10/10 conversion redesign — 2026-09-24
**IMPLEMENTED**

The staging/production candidate homepage was redesigned around a conversion-first value architecture inspired by Alex Hormozi's offer principles, while keeping all public claims grounded in actual PairVoice behavior.

### Sales architecture
- One dominant acquisition promise: **Talk together. Record. Get paid.**
- The current market-relevant published gig payout is visible above the fold.
- Primary CTA is qualification-focused: **See if I qualify**.
- Secondary CTA is browse-oriented for people who want to compare gigs first.
- Partner requirement, market, language, approval condition, and estimated session duration are surfaced before signup when campaign data provides them.

### Value equation implementation
The page explicitly increases:
- **desired outcome** — paid conversational voice work;
- **perceived likelihood** — visible requirements, approval rules, and trackable status.

The page explicitly decreases:
- **time delay** — one account and one guided workflow;
- **effort/sacrifice** — no signup fee, no card, no prior experience requirement, and campaign facts locked into the join flow.

### Risk reversal / objection handling
Without inventing guarantees:
- payout shown before work;
- requirements shown before recording;
- no cost to create an account;
- approval/payment status remains visible;
- FAQ answers experience, partner, payment, and signup-cost questions;
- final CTA tells the user to check fit before recording anything.

### UX/UI changes
- premium server-rendered hero;
- strong real-payout offer block;
- focused **Why PairVoice** section;
- conversion-first gig cards with payout, work, payment condition, estimated time, partner requirement, and one CTA;
- dedicated **Before you record** risk section;
- four-step gig-to-payout flow;
- FAQ accordion;
- final high-contrast CTA with the featured payout;
- mobile sticky payout + qualification CTA;
- bilingual EN/ES parity;
- responsive desktop/tablet/mobile layouts;
- server-rendered public catalog preserved for speed and SEO.

### Integrity constraints
Not added because PairVoice does not yet have verified public evidence:
- fake testimonials;
- fabricated participant counts;
- invented approval rates;
- invented payout-speed claims;
- fake countdowns;
- fake capacity/scarcity.

The next conversion upgrade should use real operating proof collected from controlled staging/production pairs.


## Staging signup outage fix — 2026-09-24
**FIXED / DEPLOYED**

Observed symptom:
- production join UI showed `Unable to complete signup.`

Confirmed root cause from Render runtime logs:
- `Error: Supabase service configuration missing`
- staging Render did not have `SUPABASE_SERVICE_ROLE_KEY`;
- `/api/signup` depended directly on `serviceClient()`.

Fix:
- deployed Supabase Edge Function `pairvoice-signup` to the isolated PairVoice Staging project;
- Edge Function uses Supabase's built-in server secret environment and invokes the private `register_campaign_participant` RPC;
- Render/browser never receive the Supabase service-role/secret key;
- `/api/signup` now validates input and delegates registration to the Edge Function using the staging publishable key;
- privileged database RPC remains service-role only;
- Supabase Edge Function source is excluded from the Next.js TypeScript project so Deno runtime types do not break the web build.

Verification:
- direct staging DB registration RPC smoke test passed inside a rollback transaction;
- PairVoice Verify run #225: PASS;
- Render deploy `dep-daqnas7lot8c73ajoidg`: LIVE;
- staging service started successfully on the new instance.

The prior visible signup error was caused by missing server configuration, not participant eligibility or form validation.
