-- Production messaging automation.
-- Pair state commits enqueue durable notification work; provider failures never roll back core state.

create index if not exists outbox_status_retry_idx
  on public.outbox_events(status,next_attempt_at,created_at);

create or replace function public.enqueue_pair_state_email()
returns trigger
language plpgsql
set search_path=public
as $$
declare
  v_from text;
  v_stamp text;
begin
  if tg_op='INSERT' then
    v_from := null;
    if new.state<>'PARTNER_PENDING' then return new; end if;
    v_stamp := extract(epoch from new.created_at)::text;
  else
    if new.state=old.state then return new; end if;
    v_from := old.state::text;
    v_stamp := extract(epoch from new.updated_at)::text;
  end if;

  insert into public.outbox_events(event_type,dedupe_key,payload,status)
  values(
    'PAIR_STATE_EMAIL',
    'pair-state-email:'||new.id::text||':'||new.state::text||':'||v_stamp,
    jsonb_build_object(
      'pairId',new.id,
      'campaignId',new.campaign_id,
      'fromState',v_from,
      'toState',new.state::text
    ),
    'PENDING'
  )
  on conflict(dedupe_key) do nothing;

  return new;
end $$;

drop trigger if exists pair_state_email_outbox on public.pairs;
create trigger pair_state_email_outbox
after insert or update of state on public.pairs
for each row execute function public.enqueue_pair_state_email();

-- Queue a referral notification when a commission becomes available.
create or replace function public.enqueue_referral_email()
returns trigger
language plpgsql
set search_path=public
as $$
begin
  if new.status='AVAILABLE' and (tg_op='INSERT' or old.status is distinct from new.status) then
    insert into public.outbox_events(event_type,dedupe_key,payload,status)
    values(
      'REFERRAL_AVAILABLE_EMAIL',
      'referral-available-email:'||new.id::text,
      jsonb_build_object('referralCommissionId',new.id,'pairId',new.pair_id),
      'PENDING'
    )
    on conflict(dedupe_key) do nothing;
  end if;
  return new;
end $$;

drop trigger if exists referral_available_email_outbox on public.referral_commissions;
create trigger referral_available_email_outbox
after insert or update of status on public.referral_commissions
for each row execute function public.enqueue_referral_email();
