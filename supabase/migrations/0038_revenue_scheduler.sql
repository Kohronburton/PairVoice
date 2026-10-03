-- Revenue Release C: schedule lifecycle and payout workers from Supabase.
-- Secrets/URLs are stored per environment in Supabase Vault as:
--   pairvoice_worker_secret
--   pairvoice_site_url
-- No secret values are committed to source control.

do $extensions$
begin
 if not exists(select 1 from pg_extension where extname='pg_net') then
  execute 'create extension pg_net with schema extensions';
 end if;
 if not exists(select 1 from pg_extension where extname='pg_cron') then
  execute 'create extension pg_cron with schema pg_catalog';
 end if;
end
$extensions$;

do $cleanup$
declare r record;
begin
 for r in select jobid from cron.job where jobname in ('pairvoice-outbox-worker','pairvoice-payout-worker')
 loop
  perform cron.unschedule(r.jobid);
 end loop;
end
$cleanup$;

select cron.schedule(
 'pairvoice-outbox-worker',
 '*/5 * * * *',
 $outbox$
 select net.http_post(
  url := (select decrypted_secret from vault.decrypted_secrets where name='pairvoice_site_url') || '/api/internal/outbox',
  headers := jsonb_build_object(
   'Content-Type','application/json',
   'Authorization','Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name='pairvoice_worker_secret')
  ),
  body := '{}'::jsonb,
  timeout_milliseconds := 10000
 ) as request_id;
 $outbox$
);

select cron.schedule(
 'pairvoice-payout-worker',
 '*/5 * * * *',
 $payout$
 select net.http_post(
  url := (select decrypted_secret from vault.decrypted_secrets where name='pairvoice_site_url') || '/api/internal/payouts',
  headers := jsonb_build_object(
   'Content-Type','application/json',
   'Authorization','Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name='pairvoice_worker_secret')
  ),
  body := '{}'::jsonb,
  timeout_milliseconds := 10000
 ) as request_id;
 $payout$
);
