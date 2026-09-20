# Testing & Release Gates
Definition of done: code + migration + permissions + errors + audit + tests + docs + staging + smoke test.

Unit: validation/workflow/calculations.
Database: clean migration, constraints, RLS, RPC transactions, credential concurrency, approval idempotency, immutable ledger/audit.
E2E: A registers → B joins → ready → credentials → seven sessions → QA → client approval → one earnings set → one payout.
Security: cross-user access denied, credential inventory denied, payment role enforcement, state skipping denied.
Concurrency: 50 workers / 1 credential = 1 winner; duplicate approval = 1 earnings set; duplicate payout = 1 payout.

CI: npm run typecheck; npm test; npm run build; npm audit --omit=dev --audit-level=high.
