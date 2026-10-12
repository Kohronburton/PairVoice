# Launch test findings — 2026-10-12

## Verified from GitHub Actions
- Launch HTTP smoke run 38202462128: **6/7 PASS**. Staging `/auth/confirm` returned **404**. The release expectation is a safe redirect for missing token; this is a **deployment mismatch/blocker**, not a test to waive.
- Two-context mobile browser workflow runs 38202462120 and 38202449340 reported **SUCCESS**, but the old assertion accepted a 404 confirmation page as long as the user did not reach dashboard. This is a **false-positive test**.
- The auth route exists in the unmerged scanner-safe auth PR #25. Deploy PR #25 to staging and apply migration 0040 before re-running. Do not deploy to production.

## Changes on this fix branch
1. HTTP smoke test reports a specific deployment-drift diagnosis while retaining failure.
2. Browser simulation now fails if the confirmation page is missing (404), instead of incorrectly passing.
3. No authorization bypass, payment transfer, production deployment or user-data modification.

## Next steps
1. Run CI for this branch and inspect both workflows.
2. Merge auth PR #25 into staging only after release review; deploy Supabase migration 0040 and Render staging.
3. Re-run both test workflows. Confirm `/auth/confirm` redirects safely and browser test passes.
4. Add real authenticated two-participant staging fixtures and sandbox payout tests; current anonymous checks are not complete E2E launch acceptance.
