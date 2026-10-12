# PairVoice — Full Code Review

Date: 2026-10-12. Reviewed: `main` at `c48291b` and `phase-2-production-workflow` at `d077c27` (6 commits ahead: auth hardening, migration `0040`). Companion to `docs/CLEANUP_AND_GAP_CLOSURE_PLAN.md`; finding IDs here are `CR-nn`, plan IDs are `G-nn`.

Status key: `[ ]` open · `[~]` in progress · `[x]` fixed · `[-]` accepted / won't fix (say why).

---

## 1. Scope and method

**Read in full:** `middleware.ts`, every file in `lib/` (11 modules), all 35 API routes under `app/api`, `app/auth/callback`, both Supabase Edge Functions, `scripts/`, `modules/messaging`, `app/join`, `app/pair/[code]`, `app/dashboard`, `app/wallet`, `components/WalletActions.tsx`, `components/WorkAccessCard.tsx`, `render.yaml`, `.github/workflows/build.yml`, the CI backup/restore script, and `supabase/tests/security_surface_invariants.sql`.

**Scanned structurally (not line by line):** the 39 migrations (214 KB of SQL): RLS coverage, `SECURITY DEFINER` hygiene, `anon` grants, and the final definitions of the payout RPCs (`request_participant_payout`). The other 22 SQL invariant files, the remaining pages and components (`app/page.tsx`, `app/admin/*`, `app/invite/*`, `ExistingPartnerLink`, `CampaignConsentCard`, `PartnerPoolButton`, `InviteShareButtons`, `PublicLegalPage`), CSS, and `docs/*` other than the ones listed in the plan.

**Verified by running:** `npm ci`, `tsc --noEmit` (clean), `vitest run` (16/16 pass), `next build` (compiles), `npm audit --omit=dev` (0 after the 2026-10-08 lockfile fix).

**Not possible from here:** live Render, Supabase, PayPal, Resend and Cloudflare. Every "never sets", "never called" claim below is from the repository only; confirm against the staging database before acting.

---

## 2. Summary

| Severity | Count | Meaning |
|---|---|---|
| High | 4 | Blocks payouts, risks money, or leaks personal data |
| Medium | 8 | Real bug or abuse path with a bounded impact |
| Low | 10 | Hygiene, correctness at the edges, hardening |
| Info | 6 | Observations and decisions for the owner |

**Top five, in fix order (CR-01 to CR-04 are high):**
1. **CR-01** No code path ever makes a payout method the default, so no participant can request a payout.
2. **CR-02** The payout worker sends the encrypted recipient string to PayPal instead of the email.
3. **CR-03** A failed database write after PayPal accepts a payout can mark it FAILED while the money was sent.
4. **CR-04** `/api/lead` returns the referrer's email address to whoever supplies a referral code.
5. **CR-06** (medium) The partner-joined email puts an unescaped first name into HTML.

CR-01 and CR-02 together mean the payout flow has probably never worked end to end outside the SQL tests. Run one sandbox payout on staging before anything else on this list.

---

## 3. What is good

- **Server authority is real.** Participants talk to the database through the session client (RLS) for reads; every mutation goes through a `SECURITY DEFINER` RPC. The service-role key never reaches the browser.
- **Database hygiene is strong:** RLS is enabled on all 55 tables; all 68 `SECURITY DEFINER` functions pin `search_path`; anon execute grants are limited to the public catalog and legacy lead functions; signup and pair-join RPCs are service-role only and tested.
- **Money design is sound:** the ledger is append-only (trigger raises `immutable_record`), `request_participant_payout` locks the participant row, checks the balance and is idempotent, and payout attempts have explicit reconciliation states with manual-review outcomes.
- **Crypto is done correctly:** AES-256-GCM, random 12-byte IV, auth tag, versioned prefix, key length enforced.
- **Auth redirects are safe:** `next` is restricted to same-origin paths in both the magic-link and callback routes; outbound link origins ignore forwarded-host headers.
- **Consistent admin model:** every admin API route calls `requireAdmin` with an explicit role list, on top of the Basic Auth gate in middleware; sensitive reads (recipient reveal) write an audit event.
- **Operational controls:** per-subsystem kill switches (matching, work, payout, messaging, referral) are checked in the routes, plus a release-readiness endpoint that checks env, legal documents, providers and inventory.
- **CI is meaningful:** migrations are applied to a clean Postgres, 23 invariant files run, and a backup/restore drill proves the ledger stays immutable after restore.

---

## 4. Findings

Locations are `file:line` where the line is stable, otherwise `file` and function.

### High

#### CR-01 — Payout methods can never become the default, so payouts are unreachable `[ ]`
- **Where:** `app/api/payout-method/route.ts:31` inserts `is_default:false`; `app/api/admin/payout-methods/route.ts` (PATCH) sets only `status`; `supabase/migrations/0030_release_integrity_fixes.sql:21` requires `status='VERIFIED' and is_default=true`; `components/WalletActions.tsx:9-10` shows the verified/pending states only when `is_default` is true.
- **Evidence:** a repository-wide search finds no code or migration that sets `is_default` to true (column default is false, `0010`). The partial unique index on default methods (`0010:71`) implies it was meant to be set somewhere.
- **Impact:** a participant saves a method, an admin verifies it, and the wallet still shows "Set up payouts" / never "Verification in progress"; `request_participant_payout` raises `verified_default_payout_method_required`. Unless someone sets the flag by hand in SQL, nobody can be paid.
- **Fix:** set the first non-disabled method to default on insert (or on verification, in the admin PATCH, inside one transaction that clears any previous default). Add an invariant: after verification, exactly one default exists for the participant.
- **Confirm first:** query staging for any row with `is_default = true`; check for a trigger the migrations search missed.

#### CR-02 — The PayPal worker sends ciphertext as the recipient `[ ]`
- **Where:** `app/api/payout-method/route.ts:31` stores `encryptSecret(reference)`; `app/api/internal/payouts/route.ts:39` passes `String(method.provider_recipient_reference)` straight to `createPayPalPayout`. `decryptSecret` is called only in `app/api/admin/payout-methods/[id]/recipient/route.ts:15`.
- **Impact:** every payout for a method created through the app is submitted with receiver `v1:…:…:…`. PayPal rejects it, the attempt is marked FAILED, and participants' balances stay stuck.
- **Fix:** decrypt in the worker (with the same plaintext fallback the admin route uses for legacy rows), validate that the result is an email for PAYPAL, and add a unit test with a mocked PayPal call asserting the receiver.

#### CR-03 — A lost write after PayPal accepts a payout can turn into a recorded failure `[ ]`
- **Where:** `app/api/internal/payouts/route.ts:46` updates `provider_payout_attempts.provider_reference` without checking `error`.
- **Failure path:** PayPal accepts the batch → the database update fails or times out → the attempt stays `PROCESSING` with a null reference → the next cron run resubmits with the same `sender_batch_id` (`pairvoice-<attempt id>`) → PayPal returns a duplicate-batch error → the `catch` calls `reconcile_payout_attempt(... 'FAILED')` → the participant is told the payout failed while the money was sent, and a retry could pay twice.
- **Fix:** check the update result; if it fails, do not mark FAILED — mark `UNKNOWN`/`MANUAL_REVIEW` and alert. Treat a PayPal duplicate-batch error as "already submitted" and look the batch up by `sender_batch_id` instead of failing. Never reconcile to FAILED from a submit-stage exception unless PayPal definitely did not accept the batch.

#### CR-04 — `/api/lead` leaks the referrer's email address `[ ]`
- **Where:** `app/api/lead/route.ts:60` returns `{...result, inviteUrl, ...}`; `result` includes `referrerEmail`, `referrerFirstName`, `referrerLanguage` from the lead RPC (`supabase/migrations/0004:105`).
- **Impact:** anyone who posts a lead with someone's `referral_code` receives that person's email address and first name in the response. Invite codes are shared in links, so they are not secret.
- **Fix:** destructure the referrer fields out of `result` before responding; use them only server-side for the partner-joined email. The current join page never sends a referral code, but the endpoint is public.

### Medium

#### CR-06 — HTML injection in the partner-joined email `[ ]`
- `lib/email.ts` `sendPartnerJoinedEmail` builds `html` from a template that includes `firstName` without escaping (`lib/email.ts:44`). `referrerFirstName` is whatever the referrer typed at signup. A hostile first name puts arbitrary HTML into a message sent from the PairVoice domain. `sendLifecycleEmail` escapes correctly; use the same helper.

#### CR-07 — `ilike` partner lookup accepts wildcards `[ ]`
- `app/api/existing-partner/route.ts:35`: `.ilike('email', email)` with user input. `%` and `_` are wildcards, so `a%@gmail.com` can match one participant and reveal their public code. The column is `citext`, so plain `.eq('email', email)` is already case-insensitive. Also add a rate limit; the endpoint is an account-lookup oracle for any signed-in user.

#### CR-08 — A GET page render performs a write `[ ]`
- `app/dashboard/page.tsx:23` calls `request_existing_partner` during server render whenever `?campaign=…&partnerCode=…` is present. A crafted link makes a signed-in user send a partner request on page load (CSRF-style), and every refresh repeats it. Move it to an explicit user action (POST from a confirm button); keep the link only to pre-fill the form.

#### CR-09 — Account and phone enumeration, and a sign-in email trigger `[ ]`
- `/api/signup` returns `ALREADY_ENROLLED` and `PHONE_ALREADY_REGISTERED`; `app/join/page.tsx` then automatically requests a sign-in email for the entered address on `ALREADY_ENROLLED`. `/api/auth/magic-link` with `intent:'recover-existing'` returns 404 for unknown emails. Together these confirm whether an email or phone has an account and let anyone trigger sign-in emails to it (mitigated only by Supabase's built-in limit; migration `0040` on the staging branch adds more).
- **Fix:** return one generic response for signup/sign-in attempts and put the specifics in the email; rate limit per IP and per address.

#### CR-10 — No rate limiting on public endpoints `[ ]`
- `/api/analytics`, `/api/lead`, `/api/signup`, `/api/pair`, `/api/consent` (GET), `/api/opportunities`, `/api/existing-partner`. `/api/analytics` also stores a caller-supplied `metadata` object of any size (`app/api/analytics/route.ts`). See plan item G-07.

#### CR-11 — Admin metrics read whole tables and hit the 1,000-row default `[ ]`
- `app/api/admin/stats`, `…/funnel`, `…/pairs`, `…/release-readiness` select without aggregation or pagination. PostgREST returns at most 1,000 rows by default, so counts and revenue silently stop growing after 1,000 rows, and each call loads every row (including participant emails in `…/pairs`) into server memory.
- **Fix:** database views or RPCs that aggregate (`count`, `sum`, `group by`), `limit/offset` or keyset paging for lists.

#### CR-12 — Wallet totals are computed from a truncated window `[ ]`
- `app/wallet/page.tsx:14-15`: "EARNED" is summed from the latest 20 ledger rows and "PAID" from the latest 10 payouts. After 20 entries the numbers are wrong. Also only the first currency is used (`currencies[0]`). Use an aggregate RPC per currency; the available balance already comes from `participant_available_balance`.

#### CR-13 — Partner invite signup contradicts itself `[ ]`
- `app/pair/[code]/page.tsx` labels the phone field optional and sends `null` when empty, but `/api/pair` requires a valid normalized phone and returns `INVALID_PHONE`. Everyone who skips it gets an error.
- The same page calls `getBrowserSupabase().auth.signInWithOtp({shouldCreateUser:true})` directly from the browser (line 33), bypassing the server route's origin handling and PKCE cookie flow, and redirects to `/dashboard` instead of `/auth/callback`.
- **Fix:** make phone required in the form, and call `/api/auth/magic-link` like `/join` does.

### Low

#### CR-14 — Admin pair transition is read-then-write `[ ]`
- `app/api/admin/pairs/transition/route.ts`: reads state, checks `canTransitionPair`, then updates by id only. Two admins (or a double click) can race. Add `.eq('state', pair.state)` to the update and treat zero rows as a conflict. The database may also guard it (migrations `0031`/`0034`); the route should not depend on that.

#### CR-15 — RPC error text is returned to the browser `[ ]`
- `approve`, `qa`, `work`, `controls`, `payouts`, `legal-documents` return `error.message` from Postgres. Admin-only, but map to stable codes.

#### CR-16 — Admin page gating is uneven `[ ]`
- Middleware Basic Auth covers all `/admin` and `/api/admin`; all API routes also call `requireAdmin`. Only `admin/readiness`, `admin/funnel`, `admin/operations` also call it at page level; `admin/page`, `legal`, `payments`, `qa` rely on Basic Auth plus their API calls failing. Correction to plan item G-06: admin APIs are double-gated, not Basic-Auth-only.

#### CR-17 — Health check reports a constant `[ ]`
- `app/api/health/route.ts` hard-codes `environment:'production'` and only checks that env vars exist, never database reachability. Render uses it as the health check, so a dead database passes. Add a cheap `select 1`-style RPC and report `NODE_ENV`/deployment name.

#### CR-18 — `/api/work/access` GET returns a constant pair state `[ ]`
- `app/api/work/access/route.ts:27` returns `pairState:'READY'` regardless of the real state. Return the actual state or drop the field.

#### CR-19 — Dead and buggy WhatsApp module `[ ]`
- `modules/messaging/whatsapp.ts` is imported nowhere. `phone?.replace(/\\D/g,'')` (line 4) matches a literal backslash-D instead of non-digits, so phone numbers are not cleaned. Delete it or fix to `/\D/g` and wire it up.

#### CR-20 — Dashboard logic nits `[ ]`
- `partnerPairs` and `pendingPairs` are identical filters. "approved gigs" counts only `APPROVED` (not `PAYABLE`/`PAID`) and the count query is not filtered by participant (it relies on RLS). Make the intent explicit.

#### CR-21 — Static `lang="en"` `[ ]`
- `app/layout.tsx:16`. Spanish pages fix it client-side after load (`pair/[code]`). Set it per request from the chosen language for screen readers and SEO.

#### CR-22 — Launch URLs are not scheme-checked `[ ]`
- `app/api/admin/campaigns/[slug]/access` PATCH stores `launchUrl`, `androidLaunchUrl`, `iosLaunchUrl` as given; `WorkAccessCard` renders them as `href`. An admin typo or a compromised admin session could store `javascript:`. Accept only `https:` (and the specific app-store hosts).

#### CR-23 — Idempotent payout replay ignores the amount `[ ]`
- `request_participant_payout` returns the existing payout for a key without checking that amount and currency match. Reject a mismatch.

### Info

#### CR-05 — PayPal webhook body handling `[-]` withdrawn
- Originally filed as a risk that `req.json()` re-serialization could break signature verification. Withdrawn after review: `lib/paypal.ts` calls PayPal's `verify-webhook-signature` REST API, which takes the parsed event as the JSON `webhook_event` field, so formatting differences from parsing do not apply. No change needed. Keep a sandbox-event test in the payout test suite so a real regression would be caught.

#### CR-24 — Secret comparisons are not constant-time `[ ]`
- `middleware.ts` (Basic Auth), `app/api/internal/*` (Bearer), both Edge Functions (`x-pairvoice-edge-secret`). Use `crypto.timingSafeEqual`. Low practical risk.

#### CR-25 — Style and typing `[ ]`
- Many routes and pages are single-line or very dense TypeScript (`admin/catalog`, `admin/pairs`, `admin/stats`, `admin/credentials/*`), heavy use of `any`, no linter or formatter. Reviewability is the main cost. See plan item G-16.

#### CR-26 — Consent and messaging `[ ]`
- `app/join/page.tsx` collects one checkbox covering email, SMS and WhatsApp communications; a separate `marketingConsent` is supported by the API but never sent by this UI. Have counsel confirm this satisfies SMS/WhatsApp consent rules in each launch market (US and Spain).

#### CR-27 — Funnel events are client-controlled `[ ]`
- `trackFunnelEvent('signup_completed', …)` is fired by the browser and accepted by an unauthenticated endpoint, so client-side funnel numbers can be inflated. The server-side business events (`business_funnel_events`) are the trustworthy ones; label the admin dashboard accordingly.

#### CR-28 — Sensitive values remain in source and history `[ ]`
- Commit `c95f8dc` removed the provider invitation code and some contract text from the current tree, but earlier commits still contain them. Rotate the code if it is sensitive.
- The current tree is not clean either: `supabase/migrations/0001_baseline.sql` still seeds the client revenue per pair and the participant compensation amounts (the `client_revenue_cents` and `pair_compensation_cents` columns). Decide whether those are acceptable in source; if not, seed placeholders and set the real values through a new published campaign version, and consider a history scrub as a separate decision. Do not describe the repository as free of contract terms until this is resolved.

---

## 5. Test and CI gaps

- No tests for any API route, `requireAdmin`, the PayPal webhook, the internal workers, rate limits or the email HTML builders. CR-01 to CR-05 are all in untested code.
- `supabase/tests/security_surface_invariants.sql` checks a fixed list of functions. Add a generic invariant that fails if any function in `public` is executable by `anon` or `authenticated` unless it is on an explicit allowlist, and one that fails on any `SECURITY DEFINER` function without `search_path`. (A scan today finds 0 such functions; the test keeps it that way.)
- No end-to-end browser test on `main`; launch-test branches exist (see plan G-03).
- Suggested first tests: payout worker with mocked PayPal (CR-02, CR-03), a sandbox webhook event through `/api/paypal/webhook` (regression guard), `/api/lead` response shape (CR-04), wallet aggregates (CR-12).

---

## 6. Fix order

| Order | Items | Why |
|---|---|---|
| 1 | CR-01, CR-02 | Nothing can be paid until these work; run a sandbox payout end to end |
| 2 | CR-03 | Make a payout safe to retry and reconcilable |
| 3 | CR-04, CR-06, CR-07, CR-08, CR-09 | Privacy and abuse |
| 4 | CR-10, CR-11, CR-12 | Abuse limits; correct numbers |
| 5 | CR-13, CR-14 – CR-23 | Correctness and hardening |
| 6 | CR-24 – CR-28 | Hygiene and decisions |

Each fix should ship with the test named in section 5 and, for database changes, a new invariant file.

---

## 7. Review log

| Date | Scope | Result |
|---|---|---|
| 2026-10-12 | First full pass (sections 1–6) | 28 findings; no code changed |
| 2026-10-12 | Review of this document | CR-05 withdrawn (PayPal's verify API takes the parsed event). 27 active findings |
