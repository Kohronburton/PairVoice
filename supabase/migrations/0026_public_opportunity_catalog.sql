-- Public read-only opportunity catalog. Exposes only fields intentionally shown on the marketplace.
create or replace function public.public_opportunities()
returns table(
  slug text,
  name text,
  country_code text,
  language_code text,
  locale text,
  accent_target text,
  participant_count integer,
  sessions_required integer,
  target_seconds_min integer,
  target_seconds_max integer,
  device_requirement text,
  pair_compensation_cents integer,
  currency text,
  job_family text,
  recording_mode text,
  requires_pair boolean,
  rules jsonb
)
language sql
stable
security definer
set search_path=public
as $$
  select
    c.slug,
    c.name,
    v.country_code,
    v.language_code,
    c.locale,
    c.accent_target,
    c.participant_count,
    v.sessions_required,
    v.target_seconds_min,
    v.target_seconds_max,
    c.device_requirement,
    v.pair_compensation_cents,
    v.currency,
    f.name as job_family,
    f.recording_mode::text,
    coalesce(f.requires_pair,false),
    coalesce(v.rules,'{}'::jsonb)
  from campaigns c
  join campaign_versions v on v.campaign_id=c.id and v.status='PUBLISHED'
  left join job_families f on f.id=c.job_family_id and f.active=true
  where c.active=true
  order by c.name;
$$;

revoke all on function public.public_opportunities() from public;
grant execute on function public.public_opportunities() to anon,authenticated,service_role;
