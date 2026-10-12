# PairVoice end-to-end launch acceptance plan

**Release target:** staging only. **Production:** no test data, no real money movement, no production credentials.

## One-click automated suites

1. GitHub Actions **PairVoice Launch Test**: seven staging HTTP/security smoke checks. Report in run summary and artifact.
2. GitHub Actions **PairVoice Mobile Browser Simulation**: two independent iPhone-sized Chromium browser contexts; screenshots of landing pages and invalid auth, anonymous partner/payout/work authorization tests. Report and screenshots in artifact.
3. **PairVoice Verify**: TypeScript, Vitest, production build, dependency audit, disposable PostgreSQL migration and SQL invariant tests.

These suites are **not** a full authenticated E2E journey. They intentionally do not create real users, issue emails, or move money.

## Full authenticated staging journey (required before launch)

**Prerequisites:** staging-only Supabase project, deployed migration 0040, staging email provider/sink, two synthetic participant identities, a published staging campaign, isolated staging browser profiles, sandbox payout method and provider credentials. Never use production keys. Seed and cleanup scripts must check project ID and reject production.

| Gate | Scenario | Evidence |
|---|---|---|
| 1 | A signs up, receives email, manually confirms OTP via POST, lands on dashboard | screenshot, auth event, participant linked |
| 2 | B signs up in separate context, confirms email | screenshot, distinct auth user ID |
| 3 | A invites B, B accepts, both see one canonical pair | screenshots, pair_members count = 2 |
| 4 | Retry invite and acceptance; self-link, wrong campaign, already paired are rejected | response codes, no duplicate active pair |
| 5 | Readiness and consent unlock work; submission persists and is visible to both | run state, consent version, audit events |
| 6 | Admin approves test submission; earning posted once | QA event, ledger entry, amount reconciliation |
| 7 | Verified sandbox payout method, payout request and retry with same idempotency key | one reservation, same payout ID, no duplicate debit |
| 8 | Failure recovery: expired token, rapid email requests, rejected work and zero balance | expected 4xx, state unchanged |
| 9 | 20 consecutive synthetic journeys pass, no unexplained console errors | per-run JSON, screenshots, database assertions |

## Execution order

1. Merge auth PR #25 only after full CI; deploy migration 0040 to staging.
2. Merge test PR #26 after its smoke/browser CI passes.
3. Provision a dedicated staging fixture campaign and synthetic accounts. Verify all email links use staging hostname.
4. Automate login using a staging-only email sink or approved Supabase testing method; do not bypass auth or log token hashes.
5. Add authenticated browser assertions and database verification for gates 1–8; run 20 iterations in isolated transactions/fixtures.
6. Require an explicit release decision after security, finance and operations review.

## Launch decision

**NO-GO** if any auth redirect, identity isolation, double pairing, duplicate payout, unapproved payout, ledger mismatch or uncontrolled production side effect occurs. Passing anonymous smoke checks is not launch approval.
