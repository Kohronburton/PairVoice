# PairVoice QA synchronization — 2026-10-12

## Canonical implementation order
1. PR #25 `v2.5-auth-rebased-20261011` → `phase-2-production-workflow`: scanner-safe auth and migration 0040.
2. PR #26 `test/launch-simulations-20261012` → PR #25: HTTP and browser smoke tests.
3. PR #27 `fix/launch-test-reliability-20261012` → PR #26: correct false-positive auth confirmation check and diagnose staging 404.
4. PR #28 `feat/real-user-release-gates-20261012` → PR #27: release policy, evaluator, AI visual review and partial real-user runner.

**All four PRs are drafts and open.** Do not merge out of order. These are stacked PRs; GitHub base branch matters.

## One source of truth
- Policy: `config/release-gates.json`.
- Deterministic evaluator: `scripts/evaluate-release-gates.mjs`.
- Security and Claude instructions: `docs/AI_QA_SAFETY_AND_CLAUDE_REVIEW.md`.
- Acceptance architecture: `docs/REAL_USER_SIMULATION_RELEASE_GATES.md`.
- Latest observed staging failure: missing `/auth/confirm` (404), smoke workflow failure, browser workflow failure.

## Release decision
BLOCKED. Current E2E runner is not a complete authenticated journey. The evidence evaluator has no trusted provenance and must not be used as a production deployment authorization. OpenAI and Claude assessments are advisory only.

## Security update — release evidence
The evaluator now refuses release approval while CI evidence provenance is unverified. Regression tests cover fabricated all-PASS and malformed evidence; the E2E workflow invokes them. This is an interim fail-closed guard, not an attestation implementation.

## Next engineering order
1. Review and safely deploy PR #25 to staging with migration 0040.
2. Confirm staging deployed commit and safe confirmation redirect.
3. Run PR #26/#27 browser and HTTP tests; investigate all failures.
4. Harden evidence provenance and add tests against forged PASS records.
5. Build real A/B signup, delivered email confirmation, partner link, work, QA and sandbox payout journeys.
6. Run independent Claude review and human signoff before production promotion.

## Claude handoff
Read this document, the canonical policy and AI safety review document. Review stacked PR diffs in order. Report verified defects, severity, exact file/line, minimal fix and validation. Treat missing evidence as BLOCKED. Do not merge, deploy, modify production or initiate real payments.
