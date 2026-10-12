# Run PairVoice Launch Tests

## One-click run
After this workflow is available on the repository's default branch, open **GitHub → Actions → PairVoice Launch Test → Run workflow → Run workflow**. Select the branch containing the latest test code. No URL, credentials, or command-line setup required.

**Results:** open the run → **Summary** to see each check's PASS/FAIL, HTTP status, and duration. Download the `pairvoice-launch-smoke-report` artifact for Markdown and JSON reports. Every check is recorded even if another fails.

## What it tests
Seven read-only staging checks: homepage, join entry, unauthenticated dashboard, missing confirmation token, invalid invite, missing work pair ID, and unauthenticated payout rejection.

**Safety:** only `https://staging.pairvoice.com` or the staging Render host are allowed by the script. No account creation, real email, approvals, or payment processing.

## Developer run
`node scripts/launch-http-smoke.mjs` (Node 22+). Results are written to `test-results/`. Run against a deployed staging site.

## What remains for launch approval
The existing PairVoice Verify workflow tests TypeScript, unit behavior, migrations and SQL invariants. A separate staging browser/sandbox test must still prove two-person signup/verification, existing-user partner acceptance, gig submission and approval, and payout ledger/idempotency without real money. Twenty consecutive successful journeys remain an acceptance goal; these seven HTTP checks do not satisfy that goal.
