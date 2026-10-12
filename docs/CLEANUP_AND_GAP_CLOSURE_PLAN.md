# PairVoice — Cleanup, Organization and Gap-Closure Plan

Living checklist. Update the checkboxes and the "Scan log" as work lands. Written 2026-10-12 from a scan of `main` at `c95f8dc` plus the remote branch list.

Companion document: `docs/CODE_REVIEW.md` (27 active code-level findings, `CR-nn`). Items below reference it.

Status key: `[ ]` open · `[~]` in progress · `[x]` done · `[?]` needs a decision from the owner.

---

## 0. How to resume (read this first)

1. `git fetch --prune origin` and note `main`'s SHA. If it is not `c95f8dc`, the snapshot below is stale: run the scan commands in section 7 and update section 2.
2. Work phases in order (P0 → P5). Within a phase, take the first unchecked item.
3. When an item is done, tick it, add one line to the Scan log (section 8) with the date and evidence (commit, CI run, command output).
4. Re-run the section 7 scan after each phase. A phase is done only when its "Exit check" passes.
5. Anything marked `[?]` is blocked on the owner. Do not guess; ask.

---

## 1. What the project is (one paragraph)

Next.js 16 / React 19 app on Supabase, deployed to Render. Recruits participants for paid conversational speech-data projects and runs them through: signup → pairing → readiness → recording → internal QA → client approval → earnings → payout (PayPal Payouts). Server-authoritative, idempotent, append-only ledger and audit. See `docs/ARCHITECTURE.md` for the 14 invariants.

Size: ~85 source files (`app`, `lib`, `components`, `modules`), ~30 API routes, 7 admin pages, 39 migrations on `main` (0040 exists on `phase-2-production-workflow`), 23 SQL invariant test files, 6 unit test files (16 tests), 2 Supabase Edge Functions, 20 docs files.

---

## 2. Snapshot (what is true today)

| Item | State |
|---|---|
| `main` | `c95f8dc`, 207 commits, 3 root commits (see G-01) |
| CI on `main` | Green at last check (typecheck, 16 unit tests, build, production `npm audit`, migrations + 23 SQL invariants, backup/restore drill) |
| `phase-2-production-workflow` | Ahead of `main` by 6 commits (auth hardening, migration `0040_auth_email_rate_limits.sql`, merge of PR #25); behind by 2 |
| Staging | Render service `pairvoice-staging` (`srv-daqin049v7es73darq4g`) tracks `phase-2-production-workflow`, `autoDeployTrigger: checksPass` in `render.yaml` |
| Production | Render service `pairvoice` tracks `main`, `autoDeployTrigger: commit` |
| Remote branches | 36 (see section 5) |
| Local backup | Tag `backup/main-pre-rewrite-2026-10-08` exists only in the container that did the rewrite |

---

## 3. Findings (gaps), by severity

Evidence is from reading code, docs, CI config and git state. Nothing here was exercised against live staging or production.

### Critical

- **G-01 — History rewrite disconnected the other branches from `main`.**
  On 2026-10-08 `main` and `phase-2-production-workflow` were rewritten to remove AI attribution. The rewrite changed the hash of every one of the 207 commits (0 commits are shared between the old and new `main`) because the message filter normalized all messages, not only the ones with trailers. That was avoidable: the oldest attributed commit (`3d8945c`) sat only 6 commits below the old tip, so a precise rewrite would have kept the first ~200 commits byte-identical. Result today: ~28 older branches (`staging`, `staging-current`, `v2.5-*`, `feat/*`, `archive/*`, …) share no history with `main` and show "ahead N / behind 207". Branches created after the rewrite (`feat/real-user-release-gates-20261012`, `fix/launch-test-reliability-20261012`, `test/launch-simulations-20261012`, `v2.5-auth-rebased-20261011`) are based on the new history and are fine. Anyone with a clone or open work on old hashes must re-clone or rebase.
  Decision needed: see D-01.

- **G-02 — `main` lacks the auth rate-limit hardening that exists on `phase-2-production-workflow`.**
  Migration `0040_auth_email_rate_limits.sql` and the `app/auth/confirm*`, `lib/email.ts`, `app/api/auth/magic-link/route.ts` changes are 6 commits ahead on the staging branch. Production auth emails currently have only what `main` has.

- **G-03 — Launch gates are documented but not demonstrated.**
  `docs/STAGING_ACCEPTANCE_AND_LAUNCH_CERTIFICATION.md` and `docs/TESTING.md` require a controlled-pair end-to-end run, reviewed legal documents published, and a green acceptance record. CI has no browser end-to-end tests on `main`. Work exists on `test/launch-simulations-20261012` and `fix/launch-test-reliability-20261012` but is not merged.

### High

- **G-04 — Production env and secrets are not fully declared or verified.**
  `render.yaml` production service does not declare `PAIRVOICE_EDGE_SHARED_SECRET`, `PAIRVOICE_CREDENTIAL_ENCRYPTION_KEY`, `CRON_SECRET`. `sync: false` values are not applied to an already-provisioned Render service, so each must be set by hand. `PAYPAL_MODE` is no longer hard-coded; production must be set to `live` by hand (the code falls back to `sandbox` if unset).
- **G-05 — Migration `0039` and any later migration are not applied automatically to production.** Nothing in CI or Render applies migrations. Production DB state is unverified.
- **G-06 — Admin area uses a single shared Basic Auth credential in middleware** (`middleware.ts`): non-constant-time string compare, no lockout or rate limit, no per-person identity. `lib/admin-server.ts` has a proper role model (`admin_memberships`, six roles) and every admin API route also calls `requireAdmin` (so the APIs are double-gated; see CR-16). Only three admin pages call it at page level. Needs a decision on whether Basic Auth is the intended long-term gate (D-03).
- **G-07 — Public endpoints with no rate limiting.** Unauthenticated: `app/api/analytics`, `app/api/lead`, `app/api/opportunities`, `app/api/signup`, `app/api/pair`, `app/api/auth/magic-link`. The only limiter anywhere is Supabase's own email send limit, which the magic-link route reports; nothing in the app limits requests. `app/api/analytics` writes caller-supplied `metadata` (any object) into `funnel_events` with the service-role client, so it can be used to fill the table with junk or large JSON. Signed-in participant routes (`consent`, `existing-partner`, `partner-pool`, `payout-method`, `payout`, `work/access`) require a session and are lower risk, but `existing-partner` is also an account-lookup oracle (CR-07), so give it a limit too.
- **G-08 — Old Claude/AI attribution remains in places a rewrite can't reach.** GitHub keeps old commits reachable through the merged PR pages (#23, #24) and `refs/pull/*`. The branch `claude/modest-ptolemy-vcw5kz` still exists remotely (the git proxy blocked deletion from the session). The #23 merge commit message still names that branch. Comments posted by the assistant carry a required footer.

### Medium

- **G-09 — Docs are stale and partly contradictory.**
  `docs/IMPLEMENTATION_PROGRESS.md` (1,083 lines) ends at 2026-09-24: says PR #9 is a draft, staging has migrations 0001–0025, and lists staging blockers as open. The repo is at 0039/0040 and PR #9 is long gone. `docs/DATABASE.md` (15 lines), `docs/STATE_MACHINE.md` (6), `docs/TROUBLESHOOTING.md` (9), `docs/SYSTEM_PLAN.md` (12) are thin. `README.md` says "pre-production… one clean schema" while there are 39 migrations. `docs/STAGING_DEPLOYMENT.md` names `https://staging.pairvoice.com`; `docs/IMPLEMENTATION_PROGRESS.md` and `render.yaml` use the Render hostname.
- **G-10 — Duplicate migration versions.** Two `0010_*` and two `0011_*` files. They apply in filename order in CI, so it works there. The Supabase CLI tracks migrations by version prefix, so it cannot track both files with the same version and may skip or reject one. This blocks adopting `supabase db push` as the repeatable production step (P1) until it is reconciled.
- **G-11 — `PAIRVOICE_SITE_URL` is undocumented.** Used by `scripts/run-revenue-workers.mjs` and the cron service, absent from `.env.example` and `.env.staging.example`. The cron service in `render.yaml` is pinned to `main` and the production URL; there is no staging worker.
- **G-12 — Test coverage is thin on the TypeScript side.** 6 unit test files / 16 tests cover validation, matching, workflow, funnel, partner-invite, credential crypto. No tests for any API route, admin auth, PayPal webhook verification, or the outbox/payout workers. The SQL invariants are the real safety net.
- **G-13 — `next.config.ts` disables Next's TypeScript CLI** (`experimental.useTypeScriptCli:false`) as a workaround for a TS 5.9 / Next 16.3.6 incompatibility. Revisit when upgrading.
- **G-14 — Dev-only dependency advisories.** `npm audit` (without `--omit=dev`) reports additional issues in the `vitest` toolchain (including a critical `tinypool` one) that CI ignores because it audits production deps only. A fix needs `vitest@5` (breaking).

### Low / hygiene

- **G-15 — 36 remote branches, most stale** (oldest 2026-09-16). No tags or releases other than the local backup tag.
- **G-16 — Code style is dense** (minified-looking single-line TypeScript, e.g. `middleware.ts`, `lib/admin-server.ts`). No linter or formatter configured; no ESLint/Prettier step in CI.
- **G-17 — `README.md` is 43 lines and has no setup, env, or deploy instructions;** those live in `docs/STAGING_DEPLOYMENT.md` and `.env*.example`.
- **G-18 — No CODEOWNERS, PR template, or CONTRIBUTING file.** Review rules exist only as habit.

---

## 4. Plan

### P0 — Repository integrity and history (do first; everything else assumes a stable base)

- [?] **D-01 Resolve G-01.** Pick one:
  - **A. Redo the rewrite precisely from the original history.** Start from the pre-rewrite tip of `main` (it must be recovered from a branch or clone that still has the old hashes, e.g. `archive/*` or `v2.5-stabilization`; the container-local backup tag is gone), and rewrite only `3d8945c` and its ~6 descendants (author, trailers). Everything older keeps its original hash, so old branches reconnect to `main` at the last unchanged commit. A commit's hash depends on its parents, so those ~7 commits (and anything built on them, including the Oct 11–12 branches and the 6 new commits on `phase-2-production-workflow`) get new hashes and must be rebased onto the result. One more force-push to `main` and `phase-2-production-workflow`.
  - **B. Keep the current `main` and rebase/recreate the old branches** you still want. Archive the rest.
  - **C. Keep as is and treat old branches as archives only** (do not merge them).
  Recommendation: C for anything older than 2026-10-01 (already stale), and A only if branches such as `v2.5-stabilization`, `v2.5-passkeys*`, `staging-current` are still needed as live work. Before choosing A, confirm that an old-hash copy of `main` still exists.
- [ ] Record the decision and the final branch map in this file (section 5).
- [ ] Delete `claude/modest-ptolemy-vcw5kz` from the GitHub branches page (merged; the session's git proxy blocks deletes).
- [ ] Optional: scrub the PR #23 merge message branch name (requires another force-push; see D-02).
- [ ] Create a tag at the final `main` (`v2.5.0-prod-candidate`) and push it so there is a durable restore point that is not a container-local tag.
- **Exit check:** `git merge-base origin/main origin/<each kept branch>` returns a SHA for every branch you keep.

### P1 — Close launch gaps (production safety)

- [ ] **Payout path (CR-01, CR-02, CR-03):** fix the default-method gap and the ciphertext-to-PayPal bug, make the worker retry-safe, then run one sandbox payout end to end on staging. Until this passes, payouts cannot work regardless of the other items.
- [ ] **Privacy (CR-04):** stop `/api/lead` returning the referrer's email.
- [ ] **G-02:** Merge `phase-2-production-workflow` (with `0040`) into `main` via PR after CI passes. As of 2026-10-12 `main` was merged into the staging branch cleanly (no conflicts), so the promotion is a normal merge; the earlier worry that it would reintroduce the scrubbed contract terms is unfounded (the staging branch simply lacked the scrub).
- [ ] **G-05:** Apply migrations through the latest to the production Supabase project; record the applied list. Add a documented, repeatable migration step so this stops being manual. Before using the Supabase CLI, reconcile the duplicate `0010`/`0011` versions (G-10): compare the live `supabase_migrations` history with the repo, then either give each logical migration a unique version with a tested repair procedure or use a script that applies files by full filename. Until then, apply by filename in order, as CI does.
- [ ] **G-04:** Set on Render production: `PAYPAL_MODE=live`, `PAIRVOICE_EDGE_SHARED_SECRET` (also in Supabase Edge Functions), `PAIRVOICE_CREDENTIAL_ENCRYPTION_KEY` (production-only), `PAIRVOICE_INTERNAL_SECRET` (the cron worker `scripts/run-revenue-workers.mjs` reads only this variable; the internal routes accept either it or `CRON_SECRET`, so use `PAIRVOICE_INTERNAL_SECRET` on the cron service or first update the worker to honor `CRON_SECRET`), `PAIRVOICE_SITE_URL` on the cron service. Same list for staging with staging-only values, plus `SUPABASE_SERVICE_ROLE_KEY`, admin credentials, `RESEND_API_KEY`.
- [ ] Add `PAIRVOICE_EDGE_SHARED_SECRET`, `PAIRVOICE_CREDENTIAL_ENCRYPTION_KEY`, `CRON_SECRET` to the production service in `render.yaml` as `sync: false` (declaration only).
- [ ] **G-03:** Merge the launch-test branches (`test/launch-simulations-20261012`, `fix/launch-test-reliability-20261012`, `feat/real-user-release-gates-20261012`) after review; run the staging acceptance once and store the record under `docs/`.
- [ ] Publish reviewed legal documents (staging and production) and confirm `/admin/legal`, `/terms`, `/privacy` show them.
- [ ] Confirm PayPal: webhook ID set, webhook URL registered, sandbox payout round-trip on staging, `live` credentials only on production.
- **Exit check:** production `/api/health` is OK; `/api/admin/release-readiness` reports all checks passing; one controlled pair completes the full path on staging with evidence.

### P2 — Security hardening

- [ ] **G-07:** Add per-IP/session rate limiting and body-size limits to the public routes; constrain `metadata` in `app/api/analytics` to a small allow-listed shape.
- [?] **G-06 / D-03:** Decide the admin gate. Options: keep Basic Auth but use constant-time compare + lockout/rate limit; or move `/admin` onto `requireAdmin()` (Supabase session + `admin_memberships`) so every admin action has a named person and role. Recommendation: move to `requireAdmin()` and keep Basic Auth only as an extra outer layer.
- [ ] **Code review privacy/abuse items:** CR-06 (escape email HTML), CR-07 (`eq` instead of `ilike`), CR-08 (no writes on GET), CR-09 (uniform signup/sign-in responses), CR-10 (rate limits), CR-22 (`https:` only launch URLs), CR-24 (timing-safe compares).
- [ ] Add tests: admin auth (401/503/role denial), PayPal webhook (bad signature → 400, duplicate event → no-op), internal worker secret checks, public-route rate limits.
- [ ] Run Supabase security + performance advisors on staging and production; record results here.
- [ ] Run `/security-review` (or equivalent) over `app/api/**` and `lib/**`, focusing on: service-role usage, RLS gaps, credential handling (`lib/credential-crypto.ts`), PII in logs, CSRF on cookie-authenticated POST routes.
- [ ] **G-14:** Plan the `vitest@5` upgrade (dev only) and re-audit.
- **Exit check:** advisors clean (informational only), new tests green in CI, `npm audit` clean for production deps.

### P3 — Documentation reset

- [ ] **G-09:** Archive `docs/IMPLEMENTATION_PROGRESS.md` to `docs/archive/IMPLEMENTATION_PROGRESS_2026-09.md`; start a short current `docs/STATUS.md` (what is live, what is blocked, next 3 actions).
- [ ] Rewrite `README.md`: what it is, local setup, env vars (point to `.env*.example`), scripts, deploy model (staging branch → Render staging, `main` → production), where the docs are.
- [ ] Expand `docs/DATABASE.md` (schema map by domain, how to add a migration, numbering rule) and `docs/STATE_MACHINE.md` (the pair lifecycle with allowed transitions from `lib/workflow.ts`).
- [ ] Add `docs/RUNBOOK.md`: deploy, rollback, rotate secrets, apply migrations, payout failure handling, outbox stuck, restore from backup (use `scripts/verify-backup-restore.sh`).
- [ ] Reconcile hostnames (`staging.pairvoice.com` vs `pairvoice-staging.onrender.com`) in all docs.
- [ ] Add `PAIRVOICE_SITE_URL` to `.env.example` and `.env.staging.example` (**G-11**).
- [ ] Fix or document the duplicate `0010`/`0011` migrations (**G-10**): list the real application order in `docs/DATABASE.md`. Do not renumber applied migrations blindly.
- **Exit check:** a new person can go from clone to running app and to a staging deploy using only `README.md` and `docs/RUNBOOK.md`.

### P4 — Quality and tests

- [ ] **G-16:** Add ESLint + Prettier (or Biome), format once in a single mechanical commit, add a CI step.
- [ ] **G-12:** Add API-route tests with a mocked Supabase client for the highest-risk routes: payouts, approve, credentials assign/release, signup, pair, work access.
- [ ] **Code review correctness items:** CR-11 (aggregate in SQL, not by loading tables), CR-12 (wallet totals), CR-13 (partner-invite form), CR-14 (guarded state update), CR-15, CR-17 – CR-21, CR-23.
- [ ] Add the generic database invariants from `docs/CODE_REVIEW.md` section 5 (no unlisted anon/authenticated execute grants; every `SECURITY DEFINER` pins `search_path`).
- [ ] Keep the SQL invariants as the source of truth; add one for every new migration.
- [ ] **G-13:** Remove the `useTypeScriptCli:false` workaround when Next/TS versions allow; keep a note in `docs/TROUBLESHOOTING.md` until then.
- **Exit check:** CI runs lint, typecheck, unit + API tests, build, audit, SQL invariants, backup drill; all green.

### P5 — Organization and housekeeping

- [ ] **G-15:** Apply the branch disposition in section 5 (delete merged/obsolete branches; move keepers to a clear naming scheme: `feat/`, `fix/`, `test/`, `archive/`).
- [ ] **G-18:** Add `.github/CODEOWNERS`, `.github/pull_request_template.md` (summary, test evidence, migration yes/no, env changes yes/no, rollback), and a short `CONTRIBUTING.md`.
- [ ] Turn on branch protection for `main` and `phase-2-production-workflow` (require PR + passing `app` and `database` checks, block force-push).
- [ ] Create GitHub releases/tags for each production deploy.
- [ ] Add Dependabot (or Renovate) for npm and GitHub Actions; bump actions off Node 20 (CI warns).
- **Exit check:** ≤ 8 remote branches, all with a purpose listed in section 5; `main` protected.

---

## 5. Branch map (remote, as of the snapshot)

"Ahead/behind" is against the rewritten `main`. Branches showing "behind 207" share no history with `main` (see G-01). Dispositions are **proposals**.

| Branch | Last commit | Proposed disposition |
|---|---|---|
| `main` | 2026-10-08 | Keep. Production. Protect. |
| `phase-2-production-workflow` | 2026-10-12 | Keep. Staging. Merge into `main` after P1 checks. |
| `feat/real-user-release-gates-20261012` | 2026-10-12 | Keep; review and merge (launch gates). |
| `fix/launch-test-reliability-20261012` | 2026-10-12 | Keep; review and merge. |
| `test/launch-simulations-20261012` | 2026-10-12 | Keep; review and merge. |
| `v2.5-auth-rebased-20261011` | 2026-10-11 | Already merged into staging via PR #25; delete. |
| `v2.5-auth-guardrails` | 2026-10-11 | Superseded by the rebased branch; archive then delete. |
| `v2.5-stabilization` | 2026-10-04 | Merged via PR #21 (old hashes); delete. |
| `v2.5-passkeys`, `v2.5-passkeys-ready` | 2026-10-04 | [?] Decide: is passkey work still wanted? If yes, rebase onto `main`; if no, archive. |
| `staging-current`, `ux/reduce-scroll-friction` | 2026-10-03 (same tip) | Superseded by staging branch; archive then delete. |
| `feat/production-onboarding-core` | 2026-10-03 | Merged earlier (PR #7 content is in `main`); delete. |
| `archive/phase2-before-scroll-ux-2026-10-03` | 2026-10-02 | Keep as archive or tag it, then delete the branch. |
| `legal-p0-multilingual-v1`, `prod-legal-p0-multilingual-v1` | 2026-10-02 | [?] Confirm legal work is in `main`; otherwise port. |
| `revenue-release-2026-10-02`, `revenue-scheduler-supabase` | 2026-10-02 | Revenue/scheduler content is in `main` (migrations 0036–0038); verify then delete. |
| `locked/early-access-2026-09-23`, `setup/resend-bilingual-welcome` | 2026-09-23 | Same tip; archive then delete. |
| `phase-0-1-identity-matching` | 2026-09-23 | Merged via PR #8; delete. |
| `archive/early-release-2026-09-30`, `codex/fix-pr9-all`, `replace-current-early-access`, `feature/production-email-system` | 2026-09-24 | Archive via tags, then delete. |
| `staging`, `preview`, `coming-soon` | 2026-09-17/18 | Stale; the CI workflow still lists `staging`. Delete and update `.github/workflows/build.yml` branch filters. |
| `feat/catalog-v2-clean`, `feat/core-redesign-clean-baseline`, `feat/public-v2-redesign`, `feat/spain-campaign-external-code`, `feat/signup-first-launch`, `feat/production-landing-sites`, `feat/v1-foundation` | 2026-09-16 → 09-20 | Stale feature branches; confirm content is in `main`, then delete. |
| `claude/modest-ptolemy-vcw5kz` | 2026-10-08 | Delete (merged; manual). |

Before deleting anything, create a tag for it (`git tag archive/<name> origin/<name> && git push origin archive/<name>`) unless it is clearly merged.

---

## 6. Open decisions

| ID | Question | Recommendation |
|---|---|---|
| D-01 | Re-do the history rewrite precisely (A), rebase old branches (B), or archive them (C)? | C for old branches; A only if specific old branches are live work. |
| D-02 | Scrub "claude" from the #23 merge message and the remote branch name? | Delete the branch; leave the merge message unless it matters publicly. |
| D-03 | Admin gate: Basic Auth only, or `requireAdmin()` roles? | Roles, with Basic Auth as an outer layer. |
| D-04 | Passkeys (`v2.5-passkeys*`): ship, defer, or drop? | Owner call. |
| D-05 | Do you want a staging revenue worker (cron) or keep staging manual? | Add one, pointed at the staging URL, with a staging secret. |

---

## 7. Completeness scan (repeatable)

Run these from the repo root after `git fetch --prune origin`. Paste anything new into section 3.

```bash
# 1. Branch map and history health
for b in $(git for-each-ref --format='%(refname:short)' refs/remotes/origin | grep -v HEAD | sed 's|origin/||'); do
  [ "$b" = main ] && continue
  read behind ahead < <(git rev-list --left-right --count origin/main...origin/$b)
  printf '%s | ahead %s behind %s | %s | merge-base:%s\n' "$b" "$ahead" "$behind" \
    "$(git log -1 --format=%cd --date=short origin/$b)" "$(git merge-base origin/main origin/$b | cut -c1-8)"
done

# 2. Attribution / banned strings in history and files
git log origin/main --format='%an|%cn|%B' | grep -ciE 'co-authored-by|claude-session|noreply@anthropic|claude\.ai/code'
git grep -n -iE 'claude|anthropic' origin/main -- . ':!package-lock.json'

# 3. Env vars: used in code vs declared
grep -rhoE 'process\.env\.[A-Z0-9_]+' app lib modules middleware.ts scripts | sed 's/process.env.//' | sort -u > /tmp/used.txt
grep -oE 'key: [A-Z0-9_]+' render.yaml | sed 's/key: //' | sort -u > /tmp/render.txt
grep -ohE '^[A-Z0-9_]+' .env.example .env.staging.example | sort -u > /tmp/example.txt
comm -23 /tmp/used.txt /tmp/render.txt     # used, not in render.yaml
comm -23 /tmp/used.txt /tmp/example.txt    # used, not in .env examples

# 4. Routes and their auth
find app/api -name route.ts | sort
grep -L -E 'requireAdmin|INTERNAL_SECRET|CRON_SECRET|getUser|serviceClient|verifyPayPalWebhook' $(find app/api -name route.ts)

# 5. Migrations: duplicates and latest
ls supabase/migrations | cut -c1-4 | uniq -d
ls supabase/migrations | tail -1

# 6. Build health
npm ci && npm run typecheck && npm test && npm run build
npm audit --omit=dev --audit-level=high
npm audit            # includes dev deps (G-14)

# 7. Docs freshness: newest dated heading in the long progress file
grep -n '^## ' docs/IMPLEMENTATION_PROGRESS.md | tail -3
grep -rn 'TODO\|FIXME' app lib components modules
```

### Coverage of the 2026-10-12 scan

| Area | Covered | Not yet covered (do in P2/P4) |
|---|---|---|
| Repo layout, README, 20 docs (headings and key files read; long files skimmed) | Yes | Full line-by-line read of `IMPLEMENTATION_PROGRESS.md`, `PAIRVOICE_LIVING_MASTER_CONTEXT.md`, `STAGING_*` docs |
| CI workflow and scripts | Yes | Running the backup/restore drill locally |
| API routes (list, methods, auth surface) | Yes | Per-route logic review |
| `middleware.ts`, `lib/admin-server.ts`, PayPal webhook, analytics route | Read | `lib/credential-crypto.ts`, `lib/paypal.ts`, `lib/email.ts`, `modules/messaging`, `app/api/internal/*` bodies |
| React pages and components | Listed only | Accessibility, copy, mobile behavior |
| Migrations (39 + 0040) | Names and duplicates only | Content review, RLS policies, grants, functions |
| Supabase Edge Functions | Listed only | Review of `pairvoice-signup`, `pairvoice-lead` |
| SQL invariant tests | Listed only | Coverage vs. the 14 architecture invariants |
| Git history and branches | Yes (map, roots, attribution) | Per-branch content diff against `main` |
| Live systems (Render, Supabase, PayPal, Resend, Cloudflare) | No access | Everything in P1 that touches dashboards |

---

## 8. Scan log

| Date | What | Result |
|---|---|---|
| 2026-10-12 | Initial scan, written from `main` `c95f8dc` | Findings G-01 … G-18, plan P0–P5 created |
| 2026-10-12 | Review fixes | Option A (D-01) corrected: only the ~7 commits at the tip need new hashes; CLI vs duplicate migration versions (G-10); cron worker reads `PAIRVOICE_INTERNAL_SECRET` only |
| 2026-10-12 | Full code review | `docs/CODE_REVIEW.md` added (27 active findings, 4 high). Staging branch re-synced with `main`. Plan P1/P2/P4 updated with the new items; G-06 corrected |
