# PairVoice launch simulations

The existing **PairVoice Verify** workflow already runs all Vitest unit tests, applies all SQL migrations to a disposable PostgreSQL database, and executes every `supabase/tests/*.sql` invariant test. Those database tests cover existing-partner linking, payouts, workflow transitions, and security invariants.

This PR adds a separate read-only HTTP smoke job for staging: homepage, join, protected dashboard, invalid confirmation, invalid invitation, work-access validation, and unauthenticated payout denial. It does **not** create accounts, send emails, approve gigs, or transfer money.

## Launch gates not yet automated

1. Use two isolated browser sessions with staging-only accounts to complete A/B registration, email confirmation, and partner acceptance.
2. Test the gig workflow against a staging-only provider/sandbox fixture; assert each database state transition.
3. Approve a synthetic gig in staging, verify ledger credit, request payout using a sandbox payout method, and verify repeated idempotency key cannot reserve twice.
4. Capture browser screenshots and server/database evidence; repeat 20 consecutive journeys.
5. Keep production credentials and real funds out of the suite.

Run the new workflow from GitHub Actions with the staging URL. Failure of a public endpoint can reflect deployment drift rather than source code failure; do not infer a complete end-to-end pass from HTTP smoke results.
