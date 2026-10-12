# Real-user simulation and release gate architecture

## Standard
**Never claim flawless detection.** A release is blocked if a required journey is untested, fails, or lacks verifiable evidence. Keep tests on isolated staging infrastructure, with synthetic accounts and sandbox payments.

## Current evidence (2026-10-12)
- GitHub Actions staging HTTP run 38202657265: FAILED; /auth/confirm returned 404 in preceding run 38202462128.
- Corrected mobile browser run 38202657259: FAILED (inspect its artifacts/logs for individual failures).
- Existing two-session browser runner is anonymous-only; it cannot certify registration, pairing, campaign approval or payouts.
- Scanner-safe auth PR #25 and migration 0040 require staging deployment before authentication acceptance.

## Architecture
1. **Fixture provisioner**: staging-project-ID guard, unique per-run campaign + A/B identities, cleanup by run ID, no production secrets.
2. **Mailbox adapter**: staging-only test inbox to collect real delivered email; no OTP bypass; verify destination hostname and one-time use. Redact tokens from logs/traces.
3. **Playwright user agents**: Chromium desktop/mobile, WebKit iPhone, Android Chrome via browser/device farm; isolated sessions, semantic selectors, actual clicks and form input, screenshots and videos.
4. **State oracle**: compare visible UI and server response with direct read-only staging DB queries for user, pair, work, QA, ledger and payout records.
5. **Fault injector**: network throttling, offline/retry, double-clicks, expired links, concurrent pairing and duplicate payout idempotency.
6. **Accessibility/performance**: axe-core, keyboard, contrast, layout overflow, Web Vitals and error budgets.
7. **Evidence recorder**: per-scenario screenshot, video, trace, console and failed network requests; scrub PII and secrets; signed build/deployment SHA and fixture ID.
8. **Release policy**: fail on critical defect, missing fixture, incomplete scenario, skipped test, missing artifact or unmatched deployment SHA. No waivers for auth, authorization, finance or data integrity.

## Acceptance matrix
| Journey | Assertions |
|---|---|
| A joins | email arrives, token consumed once, auth user linked, dashboard visible |
| B joins | distinct identity, campaign context retained |
| A invites B | correct recipient and campaign, request created once |
| B accepts | exactly one active canonical pair, both dashboards consistent |
| Work | consent and readiness enforced; submitted work survives refresh |
| QA | rejected work cannot earn; approved work credits ledger exactly once |
| Payout | verified sandbox method, funds reserved once, repeated request idempotent |
| Security | cross-user reads and writes denied, self-pair denied, expired token rejected |
| Recovery | errors actionable, refresh/retry preserves consistency |
| Mobile | iPhone WebKit and Android Chrome real-device runs, no clipping/hidden CTA |

## Build sequence
- Phase 0: repair and deploy PR #25/migration 0040 to staging; ensure tests target same deployed SHA.
- Phase 1: fixture guard + inbox adapter + deterministic browser selectors.
- Phase 2: authenticated A/B happy-path browser automation + state oracle.
- Phase 3: work/QA/sandbox payout and negative/security concurrency suites.
- Phase 4: device farm, accessibility, fault injection, screenshots/traces and 20 clean repeat runs.
- Phase 5: enforce branch protection and release status check; production deployment requires explicit signoff.

## Operational rules
- Distinguish **FAIL** (observed defect), **BLOCKED** (missing environment), and **PASS** (all evidence verified); BLOCKED never counts as PASS.
- Test automation itself gets negative tests that intentionally introduce known failures and verify the suite catches them.
- Require a human exploratory pass for novel UI and edge cases; no suite guarantees finding every bug.
- Never seed or clean production data. No live transfers. Avoid storing auth tokens in artifacts.
