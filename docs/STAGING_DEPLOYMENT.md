# PairVoice Staging Deployment — staging.pairvoice.com

## Purpose
This is the deployment handoff for the certified Phase 2 branch. Staging must use isolated infrastructure and must satisfy the same release-readiness checks as production before controlled real-pair acceptance.

## Certified source
- Repository: Kohronburton/PairVoice
- Branch: `phase-2-production-workflow`
- Pull request: #9
- Latest certified engineering baseline before staging-only changes: PairVoice Verify #183
- Staging changes must also have a green PairVoice Verify run before deployment.

## Target
- Application hostname: `https://staging.pairvoice.com`
- Preferred app runtime: Node 22
- Build command: `npm install && npm run build`
- Start command: `npm start`
- Health check: `/`
- Auto-deploy: enabled for `phase-2-production-workflow` while PR #9 is the staging release branch.

## Infrastructure isolation
Staging MUST NOT use the production PairVoice Supabase database.

Preferred database strategy:
1. Supabase development branch from the PairVoice project, if available/approved.
2. Otherwise a separate Supabase staging project.
3. Apply the repository migrations in order.
4. Seed only controlled staging campaign/configuration data. Never copy participant payout destinations or production secrets.

## Required environment variables
See `.env.staging.example`.

Required before `/admin/readiness` can pass:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
- SUPABASE_SERVICE_ROLE_KEY
- NEXT_PUBLIC_SITE_URL=https://staging.pairvoice.com
- PAIRVOICE_CREDENTIAL_ENCRYPTION_KEY
- PAIRVOICE_INTERNAL_SECRET or CRON_SECRET
- RESEND_API_KEY
- PAIRVOICE_EMAIL_FROM

Admin bootstrap:
- PAIRVOICE_ADMIN_USER
- PAIRVOICE_ADMIN_PASSWORD

## DNS / custom hostname
The staging application host must first be deployed and produce its provider hostname, for example:
`pairvoice-staging.onrender.com`

Then Cloudflare should contain:
- Type: CNAME
- Name: staging
- Target: <staging service hostname>
- Proxy: enabled only after the hosting provider has accepted/validated the custom hostname.
- SSL/TLS: Full (strict) once the origin certificate is active.

Do not point `staging.pairvoice.com` to the production service.

## Cloudflare connector status
No Cloudflare plugin/connector is currently available in the ChatGPT plugin directory for this account. DNS therefore requires either:
- Cloudflare web UI through ChatGPT Work/Cloud Browser, or
- one manual Cloudflare DNS change after the staging origin hostname is known.

## Database deployment
For an isolated Supabase staging branch/project:
1. Create branch/project.
2. Apply all `supabase/migrations/*.sql` in repository order.
3. Run security/performance advisors.
4. Verify all expected tables/providers/controls exist.
5. Confirm the staging application only references the staging project URL/keys.

## App deployment
1. Create staging web service from `https://github.com/Kohronburton/PairVoice`.
2. Branch: `phase-2-production-workflow`.
3. Runtime: Node.
4. Build: `npm install && npm run build`.
5. Start: `npm start`.
6. Set staging environment variables.
7. Deploy.
8. Verify root, auth, dashboard, admin, wallet, privacy, terms.
9. Add/validate `staging.pairvoice.com`.

## Required staging configuration after first deploy
1. Sign in as staging SUPER_ADMIN.
2. Publish reviewed staging Privacy + Terms.
3. Publish reviewed Campaign Terms + Participant Consent for each published staging campaign version.
4. Configure FunCrowd/manual WORK binding.
5. Configure external launch URL.
6. Configure campaign invitation code if required.
7. Load controlled staging credential inventory if the campaign requires it.
8. Verify Resend delivery with staging test addresses.
9. Confirm subsystem controls are enabled except anything intentionally paused.
10. Open `/admin/readiness`; all blocking checks must be green.

## Acceptance
Run `docs/STAGING_ACCEPTANCE_AND_LAUNCH_CERTIFICATION.md`.

Required controlled sequence:
1. staff/internal smoke;
2. 2 controlled real pairs;
3. full source → signup → pair → consent → work → submit → QA → earning → payout reconciliation;
4. mobile acceptance on iPhone Safari and Android Chrome;
5. hostile-network/retry scenarios;
6. 10-approved-pair proof batch;
7. only then consider PR #9 ready to leave draft.

## Rollback
- Keep PR #9 unmerged until staging certification passes.
- Disable WORK or PAYOUT subsystem from admin controls if provider behavior is unsafe.
- Roll back the staging service to the last known-good deploy if application behavior regresses.
- Do not reset/delete participant, pair, ledger or payout history as a recovery method.
