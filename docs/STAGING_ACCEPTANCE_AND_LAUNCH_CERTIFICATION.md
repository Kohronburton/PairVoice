# PairVoice — Staging Acceptance & Launch Certification

> This is the final manual/staging release gate. Automated CI proves code/database invariants; this checklist proves real browser/device/provider/environment behavior. Do not mark a row PASS without evidence from the current release candidate.

## Release candidate identity
- PR: #9 — Phase 2: production workflow core
- Branch: `phase-2-production-workflow`
- Candidate commit: record at execution time
- PairVoice Verify run: record at execution time
- Staging URL: record at execution time
- Tester / date: record at execution time

## Gate A — Public acquisition and attribution
1. Open U.S. landing from a URL containing `utm_source`, `utm_campaign`, `utm_content`.
2. Confirm campaign cards load or the general-list fallback remains usable.
3. Select a campaign and complete signup.
4. Confirm first-touch attribution remains the original source through signup.
5. Confirm the admin funnel shows landing, campaign interest, signup and source.
6. Repeat in Spanish localization.
7. Confirm no payout/credential secrets appear in browser/network analytics payloads.

Evidence required: screenshots + funnel event rows/source breakdown.

## Gate B — Identity and partner paths
Test three distinct paths:
- Invite a new participant.
- Connect two already-registered PairVoice participants through the supported existing-user flow.
- Join Find Partner / partner pool.

For each:
- one human remains one canonical participant;
- self-pairing is blocked;
- duplicate campaign participation is blocked;
- changing partner does not erase campaign history;
- pair creation emits authoritative `pair_created`;
- partner acceptance is idempotent.

Evidence required: participant/pair IDs, state transitions, relevant activity/business-funnel events.

## Gate C — Qualification/readiness
1. Complete campaign eligibility and voice qualification for A/B.
2. Verify prior sample evidence remains after retest.
3. Verify each mandatory readiness gate.
4. Verify missing credential/capacity prevents READY.
5. Reserve credential/capacity and advance to READY.
6. Attempt concurrent duplicate reservation; prove one active assignment.
7. Replace an unusable credential; prove old assignment remains in history.

Evidence required: readiness gate rows + pair state + credential assignment history.

## Gate D — External work / FunCrowd manual adapter
1. Configure campaign WORK binding, external launch URL and invitation code through admin.
2. Sign in as an actual member of a READY pair.
3. Confirm another participant/non-member cannot reveal the pair's work access.
4. Open work access; confirm correct provider/code/URL.
5. Start work; confirm PairVoice state becomes RECORDING and `gig_started` is recorded.
6. Submit from PairVoice; confirm state becomes SUBMITTED and `submission_completed` is recorded.
7. Pause WORK subsystem; prove new starts are blocked while an existing working participant can still submit.

Evidence required: mobile screen recording + state/event rows.

## Gate E — QA / rework
1. Internal QA requests rework.
2. Participant returns through RECORDING → SUBMITTED.
3. Internal QA approves to CLIENT_QA.
4. Client QA rejects one controlled test pair; verify no earning.
5. Client QA approves another controlled pair; verify exactly one earning per active pair member.
6. Repeat same approval/idempotency key; verify no duplicate earning.

Evidence required: review rows, ledger rows, pair state, audit events.

## Gate F — Wallet and payout
1. Confirm approved earning appears in participant ledger/balance.
2. Try payout without verified default method; confirm blocked.
3. Verify payout method and request a valid amount.
4. Repeat request with same idempotency key; confirm one payout.
5. Attempt overdraw while payout is REQUESTED/PROCESSING; confirm blocked.
6. Start controlled payout attempt.
7. Mark provider outcome UNKNOWN; confirm payout remains PROCESSING and no payout ledger deduction exists.
8. Reconcile the same attempt as SUCCEEDED with a real provider reference; confirm exactly one negative payout ledger entry and PAID status.
9. Repeat success reconciliation; confirm no double deduction.
10. Pause PAYOUT subsystem; prove new requests/attempts are blocked while reconciliation remains available.

Evidence required: payout attempt history, ledger, provider reference, audit event.

## Gate G — Referrals
1. Use a referral relationship with zero configured commission; approve referred work and prove no cash reward.
2. In staging only, create a version/program with a small explicit test reward.
3. Approve qualifying referred work.
4. Verify exactly one commission/milestone ledger entry.
5. Repeat processing; confirm no duplicate award.
6. Pause REFERRAL; prove approval still succeeds while new reward processing is skipped.

Evidence required: referral relationship/commission/milestone/ledger rows.

## Gate H — Lifecycle messaging
1. Trigger PAIR_FORMED, WORK_READY, SUBMISSION_RECEIVED, REWORK_REQUIRED, APPROVED and PAYOUT_PAID.
2. Verify correct recipient and EN/ES template.
3. Simulate provider failure; verify FAILED + retry.
4. Exhaust controlled failure attempts; verify DEAD_LETTER.
5. Pause MESSAGING; verify queued messages remain and no claim occurs.
6. Resume and process.
7. Verify no message is recorded delivered when RESEND is unavailable.

Evidence required: test mailbox screenshots + outbox/message_events.

## Gate I — Admin and RBAC
Using accounts for each role:
- VIEW_ONLY cannot mutate.
- SUPPORT cannot execute payouts/credential changes.
- QA_REVIEWER can perform QA but not payout execution.
- PAYMENTS can reconcile payout but not QA/campaign credential operations.
- OPERATIONS can perform approved operations but not change subsystem controls.
- SUPER_ADMIN can change controls with a required reason.

Attempt direct API calls, not only hidden UI buttons.

Evidence required: HTTP statuses + audit rows.

## Gate J — Mobile/browser acceptance
Minimum devices:
- current iPhone Safari;
- Android Chrome;
- narrow 360–375 px viewport;
- desktop Chrome.

On each mobile device validate:
- landing/h1/CTA visible without horizontal scroll;
- campaign card tap targets;
- signup keyboard/form behavior;
- invite/share;
- dashboard;
- work access/code display;
- external provider launch;
- submission;
- rework;
- payout request;
- error states on slow/interrupted network.

Repeat critical transitions after refresh/back-navigation to prove idempotency.

Evidence required: screen recording per mobile OS.

## Gate K — Failure and hostile-network acceptance
For work, messaging and payout:
- request timeout;
- duplicate button tap;
- browser refresh during request;
- server 5xx;
- provider unavailable;
- lost response after server-side success.

Expected result: retry/reconcile/resume; never reset participant/pair/history and never duplicate money/external action.

## Gate L — Backup/restore
Current release commit must have PairVoice Verify's backup/restore drill PASS.
In staging/production operations, record:
- backup mechanism;
- last successful backup;
- restore target;
- restore evidence;
- RPO/RTO chosen by operator;
- post-restore ledger/provider/payout reconciliation.

## Gate M — Release readiness
Open `/admin/readiness` and protected `/api/admin/release-readiness`.
All blocking checks must pass.

A nonblocking warning must have an explicit operator disposition before launch.

## Gate N — Controlled launch
First release is not an unrestricted ad launch.

Sequence:
1. internal/staff smoke;
2. 2 controlled real pairs;
3. 10 approved-pair proof batch;
4. inspect rejection/support/payment/attribution;
5. organic traffic;
6. only then small paid acquisition.

Marketing scale metric: **approved-pair CAC**.
Do not scale from raw registrations or CTR.

## Certification decision
Release may leave draft only when:
- current-head CI is green;
- backup/restore is green;
- all blocking release-readiness checks pass in staging;
- Gates A–M have evidence;
- controlled proof batch can complete source → signup → pair → work → submission → approval → payout without manual database repair;
- rollback/kill-switch owners are identified.

Final status values:
- NOT TESTED
- BLOCKED
- PASS WITH WATCH ITEMS
- PASS
