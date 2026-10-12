# PairVoice — ten additional QA passes (2026-10-12)

Review scope: PR #28 E2E script, GitHub Actions workflow, confirmation routes, Resend email, PayPal payout/webhook, admin work/payout routes, release evaluator. Static review only; no browser run or sandbox transfer.

| Pass | Area | Finding | Action |
|---|---|---|---|
| 1 | Playwright readiness | `isVisible({timeout})` does not wait for a late element; signup success and confirmation can falsely fail | FIXED: `waitFor({state:'visible'})` |
| 2 | Mailbox isolation | Adapter accepted any matching URL regardless of recipient, run, or age | FIXED: require recipient, runId, receivedAt newer than test start |
| 3 | Browser error evidence | Raw `pageerror` messages could leak secrets into artifacts | FIXED: sanitize pageerror and redact console error details |
| 4 | Auth scanner safety | GET confirmation is inert and POST consumes OTP; token still appears in URL, so prohibit post-auth traces/screenshots | Confirmed architecture; OPEN: test actual redirect/cookie behavior |
| 5 | Signup identity | Signup is dependent on Edge Function, distinct valid phones, campaign eligibility, Resend and Supabase Auth; fixtures absent | BLOCKED: isolated fixtures and staging live execution |
| 6 | Partner linkage | Existing partner API requires two authenticated sessions, qualified campaign membership, REQUEST and RESPOND; runner never calls it | OPEN: implement separate A/B authenticated contexts and assertions |
| 7 | Work approval | Admin work transitions require admin role and provider run; no isolated synthetic admin or work fixture exists | OPEN: isolated admin/fixture workflow and negative authorization checks |
| 8 | Payout request | Stable idempotency key and verified payout method required; no test for duplicate keys or insufficient balance | OPEN: sandbox ledger tests |
| 9 | PayPal webhook | Signature verified, but webhook replay and event reconciliation race behavior have not been demonstrated in CI | OPEN: replay/concurrency tests with sandbox |
| 10 | Release integrity | Evaluator rejects untrusted evidence, but no attestation verifier; PR #28 not merged into staging | BLOCKED: trusted CI provenance and full E2E proof |

## Additional concerns
- The adapter service must return JSON with `confirmUrl`, `recipient`, `runId`, and ISO `receivedAt`. Binding a runId requires a provider-backed correlation strategy; no such service has been provisioned.
- The test checks URL transition but does not independently assert authenticated Supabase identity and row-level isolation. A redirect alone is not a release gate.
- Current PayPal guard relies on environment signals that must be configured and verified on Render. This guard is not a substitute for isolating credentials and enforcing provider sandbox restrictions.
- The test runner deliberately exits BLOCKED even if both auth journeys succeed because pairing/work/payout are missing.

## Release decision
BLOCKED. Code changes were committed, but there is no successful live E2E evidence. No production merge, real payout, or release approval.
