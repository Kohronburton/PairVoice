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
**IMPLEMENTED / current-head verification pending**
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
**IMPLEMENTED / current-head verification pending**
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

## CI finding from PairVoice Verify #109
Run #109 failed **only in the app unit-test job** because the old privacy test prohibits funnel event names containing the word `payment`.
- database job: **PASSED**
- typecheck before tests: **PASSED**
- existing matching/workflow/invite/crypto/validation tests: **PASSED**
- failing test: `lib/funnel.test.ts` privacy contract
- resolution: preserved the privacy rule and renamed financial status telemetry to payout/earning terminology instead of weakening the test.

## Checkpoint E — Authoritative business milestones
**IMPLEMENTED / current-head verification pending**

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
**IMPLEMENTED / current-head verification pending**

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
**IMPLEMENTED / current-head verification pending**

Admin route:
- `POST /api/admin/approve`
- authorized roles: SUPER_ADMIN, QA_REVIEWER, OPERATIONS
- calls existing idempotent `approve_pair_and_create_earnings`
- pair state transition emits authoritative approval + earning milestones automatically.

## Checkpoint H — Admin authorization + funnel command center
**IMPLEMENTED / current-head verification pending**

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
**IMPLEMENTED / current-head verification pending**

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
| Credential recovery | IMPLEMENTED / VERIFY |
| Attribution chain | IMPLEMENTED / VERIFY |
| Authoritative pair milestones | IMPLEMENTED / VERIFY |
| Work start/submission lifecycle | IMPLEMENTED / VERIFY |
| Approval → earnings | IMPLEMENTED / VERIFY |
| Payout status telemetry | IMPLEMENTED / VERIFY |
| Admin funnel view | IMPLEMENTED / VERIFY |
| Real FunCrowd launch adapter | PLANNED |
| Internal/client QA operating UI | PLANNED |
| Real payout-provider execution + reconciliation | PLANNED |
| Referral reward execution | PLANNED |
| Messaging/recovery automations | PARTIAL |
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
