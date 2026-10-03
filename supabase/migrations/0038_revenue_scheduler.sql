-- Revenue Release C: schedule lifecycle and payout workers from Supabase.
-- Hosted Supabase provides pg_cron, pg_net and Vault. Generic PostgreSQL CI
-- intentionally skips scheduler installation when those extensions are unavailable.
-- Vault names expected per environment:
--   pairvoice_worker_secret
--   pairvoice_site_url
-- No secret values are committed to source control.

do $scheduler$
declare r record;
begin
 if exists(select 1 from pg_available_extensions where name='pg_net')
    and exists(select 1 from pg_available_extensions where name='pg_cron') then

  if not exists(select 1 from pg_extension where extname='pg_net') then
   execute 'create extension pg_net with schema extensions';
  end if;
  if not exists(select 1 from pg_extension where extname='pg_cron') then
   execute 'create extension pg_cron with schema pg_catalog';
  end if;

  for r in execute 'select jobid from cron.job where jobname in (''pairvoice-outbox-worker'',''pairvoice-payout-worker'')'
  loop
   execute format('select cron.unschedule(%s)',r.jobid);
  end loop;

  execute $install_outbox$
   select cron.schedule(
    'pairvoice-outbox-worker',
    '*/5 * * * *',
    $command$
     select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name='pairvoice_site_url') || '/api/internal/outbox',
      headers := jsonb_build_object(
       'Content-Type','application/json',
       'Authorization','Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name='pairvoice_worker_secret')
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 10000
     ) as request_id;
    $command$
   )
  $install_outbox$;

  execute $install_payout$
   select cron.schedule(
    'pairvoice-payout-worker',
    '*/5 * * * *',
    $command$
     select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name='pairvoice_site_url') || '/api/internal/payouts',
      headers := jsonb_build_object(
       'Content-Type','application/json',
       'Authorization','Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name='pairvoice_worker_secret')
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 10000
     ) as request_id;
    $command$
   )
  $install_payout$;
 end if;
end
$scheduler$;
