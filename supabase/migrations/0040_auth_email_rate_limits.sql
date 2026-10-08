-- Auth email issuance rate limits: atomic per-email and per-client windows.
create table if not exists public.auth_email_rate_limits (
  bucket_key text primary key,
  window_start timestamptz not null,
  attempts integer not null check (attempts >= 0),
  updated_at timestamptz not null default now()
);
alter table public.auth_email_rate_limits enable row level security;
revoke all on public.auth_email_rate_limits from public, anon, authenticated;
create or replace function public.consume_auth_email_limit(p_key text, p_max integer, p_window_seconds integer)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_attempts integer;
begin
 if p_key is null or length(p_key) > 150 or p_max < 1 or p_window_seconds < 1 then
  raise exception 'invalid_rate_limit';
 end if;
 insert into public.auth_email_rate_limits(bucket_key,window_start,attempts,updated_at)
 values(p_key,now(),1,now())
 on conflict(bucket_key) do update set
  attempts = case when auth_email_rate_limits.window_start <= now() - make_interval(secs => p_window_seconds)
    then 1 else auth_email_rate_limits.attempts + 1 end,
  window_start = case when auth_email_rate_limits.window_start <= now() - make_interval(secs => p_window_seconds)
    then now() else auth_email_rate_limits.window_start end,
  updated_at = now()
 returning attempts into v_attempts;
 return v_attempts <= p_max;
end $$;
revoke all on function public.consume_auth_email_limit(text,integer,integer) from public,anon,authenticated;
grant execute on function public.consume_auth_email_limit(text,integer,integer) to service_role;
