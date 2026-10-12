# Three-pass QA audit — 2026-10-12

## Pass 1 — Browser and auth correctness
- FIXED: test waited for a dashboard URL using a malformed regex and now checks exact staging origin and /dashboard path.
- FIXED: wait for hydrated email input before probing form.
- FIXED: synthetic alias validation now uses anchored format rather than substring.
- OPEN: test uses guessed join success heading; verify in a real CI run.
- OPEN: confirm form may redirect through intermediate endpoints; verify real browser session.
- OPEN: mailbox adapter is not deployed and two fixtures are not provisioned.

## Pass 2 — Safety, privacy and money
- FIXED: diagnostic error strings redact token_hash and Bearer values.
- FIXED: PayPal live-mode prohibition also checks RENDER_SERVICE_NAME and PAIRVOICE_ENV/APP_ENV, not just NEXT_PUBLIC_SITE_URL.
- OPEN HIGH: screenshots and browser traces must never capture authentication tokens; only pre-auth screenshots are currently generated.
- OPEN HIGH: PayPal sandbox credentials and recipient have not been configured or validated; do not invoke payout worker.
- OPEN HIGH: staging environment metadata must be explicitly configured and validated in Render. Fail-closed environment guards must not rely on optional variables alone.
- OPEN: controlled mailbox adapter is specified but not implemented; token response must be short-lived, recipient- and run-bound, and never logged.

## Pass 3 — Evidence and release operations
- FIXED EARLIER: untrusted evidence evaluator cannot return release PASS; forged all-PASS test added.
- OPEN CRITICAL: no signed GitHub artifact provenance verifier, so release remains BLOCKED.
- OPEN CRITICAL: no automated A/B partner acceptance, work QA approval, sandbox payout webhook and idempotency assertions.
- OPEN: PR #28 is stacked atop #27 and is not deployed; do not conflate its code with live staging.
- OPEN: validate workflow syntax, Node tests, build and browser E2E in GitHub Actions before merging.

## Decision
BLOCKED. Code review findings and patches are not equivalent to successful staging tests. No production deploy or real payment is authorized.
