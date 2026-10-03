# PairVoice Reliability & Recovery Standard

## Objective
PairVoice must fail safely, preserve accepted work and money, resume from the last durable checkpoint, and recover without resetting participant, pair, campaign, QA, credential, referral, ledger, payout or audit history.

No software can truthfully guarantee that an error will never occur. PairVoice's production standard is therefore: **errors are contained, data is durable, actions are idempotent, workflows are resumable, recovery is tested, and no incident requires destructive reset as the normal recovery mechanism.**

## Non-negotiable invariants
1. Production data is never repaired with database reset, table truncation or history deletion.
2. Financial and audit records are append-only. Corrections use compensating entries.
3. Published campaign economics are immutable and versioned.
4. Provider calls use idempotency keys and durable checkpoints.
5. Every asynchronous operation can retry safely.
6. A provider outage pauses only the affected operation, not the PairVoice identity or business record.
7. Credential reservation is transactional; one active credential bundle cannot be assigned twice.
8. Campaign participation history survives partner changes, account recovery and provider changes.
9. Account merges preserve source identity/history and create audit evidence.
10. Admin overrides require authorization, reason, before/after evidence and verification.

## Recovery model
Every critical operation follows:
**VALIDATE → WRITE INTENT/CHECKPOINT → EXECUTE → RECORD RESULT → VERIFY → ADVANCE STATE**

On failure:
**PRESERVE STATE → RECORD ERROR → RETRY WITH SAME IDEMPOTENCY KEY → MANUAL REVIEW IF RETRY LIMIT REACHED**

Never roll a participant back to the beginning merely because an external provider failed.

## Failure isolation
Separate boundaries:
- Identity/authentication
- Matching/partnering
- Campaign eligibility
- Voice qualification
- Credential provider (Niva)
- Work provider (FunCrowd / future native)
- QA/client approval
- Ledger
- Payout provider
- Messaging
- Analytics

Each integration gets timeout, bounded retry, exponential backoff/jitter, circuit breaker, dead-letter/manual-review path, health status and kill switch.

## Data protection
Production requirements before public paid work:
- managed PostgreSQL backups enabled;
- point-in-time recovery where hosting plan supports it;
- encrypted off-site backup/export on a defined schedule;
- database restoration into isolated staging on a schedule;
- object/audio storage versioning and retention policy;
- secrets stored outside source control and rotated;
- backup access separated from ordinary support permissions.

A backup is not considered valid until a restore test proves it.

## Recovery targets
Set and monitor explicit RPO/RTO before paid production. Initial engineering targets:
- financial/ledger/audit data: near-zero logical loss through transactional writes and provider reconciliation;
- operational database: PITR target appropriate to the selected Supabase plan;
- service restoration: documented runbook with measured restore time, not an untested promise.

## Deployment safety
- migrations are forward-only and additive by default;
- destructive schema changes require expand → migrate/backfill → verify → contract;
- every migration runs against a fresh database in CI;
- upgrade-path tests run against a production-shaped schema snapshot before release;
- deploy application changes compatible with old+new schema during migration window;
- feature flags/kill switches isolate risky features;
- rollback application code without rolling back accepted business data.

## Observability
Every request/workflow carries request/correlation ID. Monitor:
- API error rate and latency;
- database saturation;
- auth failures;
- matching failures;
- credential inventory and assignment failures;
- provider health/timeouts;
- QA queue age;
- ledger invariant failures;
- payout failures/reconciliation mismatches;
- message delivery;
- dead-letter/retry queue depth;
- backup age and last successful restore test.

Alerts must route to an operator with an actionable runbook.

## Incident recovery sequence
1. Stop only the affected capability with a kill switch.
2. Identify correlation ID, participant/pair/campaign and last durable checkpoint.
3. Preserve logs, state and provider evidence.
4. Quantify affected records and financial exposure.
5. Correct with a forward migration, retry or compensating recovery action.
6. Verify database invariants and external provider state.
7. Resume from checkpoint.
8. Reconcile money/credentials/messages.
9. Record root cause and prevention.
10. Re-enable the capability gradually.

## Required recovery tests
- process dies between intent and provider call;
- provider succeeds but response is lost;
- duplicate webhook/provider callback;
- timeout followed by retry;
- Niva inventory exhausted;
- same credential requested concurrently;
- FunCrowd unavailable mid-job;
- QA retry/rework;
- earning creation invoked twice;
- payout invoked twice;
- payout succeeds externally but callback is lost;
- referral milestone invoked twice;
- account duplicate/merge;
- partner disappears;
- database connection interruption;
- stale worker lock;
- message provider outage;
- deploy fails halfway through;
- restore database backup and reconcile provider state.

## Release gate
Paid production cannot launch until:
- clean install passes;
- upgrade-path migration passes;
- all critical state/invariant tests pass;
- application typecheck/unit/build/audit pass;
- staging E2E passes on iOS and Android;
- backup is enabled;
- at least one restore drill succeeds;
- Niva credential concurrency test succeeds;
- earning/payout/referral idempotency tests succeed;
- kill switches are verified;
- incident and provider runbooks identify the exact recovery procedure.
