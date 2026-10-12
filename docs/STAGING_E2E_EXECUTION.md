# PairVoice staging full-journey execution contract

## Verified staging baseline
- Render deployment `dep-db661b6k1f9s73f05p9g` for `d077c270` is LIVE.
- Staging Supabase auth email rate-limit migration applied and verified.
- This does NOT certify actual email delivery or user journeys.

## Controlled synthetic identities
Provision two fresh distinct `+e2e-` email aliases in an approved isolated test mailbox, not real participant addresses. Set `PAIRVOICE_E2E_EMAIL_A` and `PAIRVOICE_E2E_EMAIL_B` as GitHub environment variables. Never commit addresses, OTPs or link tokens. Fixture campaign must be staging-only and approved for test traffic.

## Mailbox adapter contract (not implemented)
Provision a dedicated HTTPS endpoint under `*.pairvoice.com`, protected by `PAIRVOICE_E2E_MAILBOX_ADAPTER_TOKEN`, which returns only test messages for explicitly allowlisted synthetic addresses. Bind to run ID, reject other inboxes, limit retention, prevent redirect/SSRF and redact raw auth tokens from logs and CI artifacts. Use a dedicated email provider test domain/inbox. The E2E runner now polls `GET /v1/test-messages/latest?recipient=...&runId=...` using a Bearer token. A 204 or 404 means not yet delivered; a successful response must contain `confirmUrl` with origin `https://staging.pairvoice.com` and path `/auth/confirm`. The adapter service is **not yet provisioned**, so email verification is not certified.

## Payout sandbox
- Configure `PAYPAL_MODE=sandbox` on staging; provision sandbox-only PayPal client credentials and webhook ID in Render secrets, never GitHub code.
- Verify no production recipient can be selected in synthetic fixtures.
- Do not call `/api/internal/payouts` until provider credentials, synthetic payout recipient, approved-work ledger and webhook replay checks are verified.
- A new code guard blocks `PAYPAL_MODE=live` when `NEXT_PUBLIC_SITE_URL` points to staging.pairvoice.com. This guard is in PR #28 and is **not deployed**.
- Sandbox transfers still cause stateful effects in staging; require explicit fixture isolation and cleanup.

## Required acceptance flow
A signs up -> receives email -> explicitly confirms -> authenticated dashboard; B repeats independently; A requests B for the same campaign; B accepts; verify exact pair and tenant isolation; complete eligible work and QA approval; request payout with stable idempotency key; submit to PayPal sandbox; verify signed webhook and ledger reconciliation; retry duplicate key and webhook and confirm no double charge. Test denied, expired, wrong-user and cross-campaign cases.

## Release evidence
The existing release evaluator deliberately blocks all untrusted evidence until CI provenance verification is implemented. AI review is advisory. A browser screenshot alone never proves backend completion.

## Outstanding blockers
1. Actual mailbox adapter and provider configuration, plus two isolated test phone numbers in `PAIRVOICE_E2E_PHONE_A/B`.
2. Authenticated Playwright submission and email verification.
3. Isolated fixture campaign, accounts and partner acceptance.
4. Work/QA workflow orchestration and sandbox PayPal test recipient/credentials.
5. Signed CI provenance verification, negative tests and end-to-end run.
