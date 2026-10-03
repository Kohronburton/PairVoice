-- Durable lifecycle messaging outbox.

create or replace function enqueue_pair_lifecycle_messages()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_template text; v_member record;
begin
 if old.state=new.state then return new; end if;
 v_template:=case new.state
  when 'PAIRED' then 'PAIR_FORMED'
  when 'READY' then 'WORK_READY'
  when 'SUBMITTED' then 'SUBMISSION_RECEIVED'
  when 'REWORK_REQUIRED' then 'REWORK_REQUIRED'
  when 'PAYABLE' then 'APPROVED'
  when 'REJECTED' then 'REJECTED'
  else null end;
 if v_template is null then return new; end if;

 for v_member in
  select e.participant_id
  from pair_members pm join campaign_enrollments e on e.id=pm.enrollment_id
  where pm.pair_id=new.id and pm.active=true
 loop
  insert into outbox_events(event_type,dedupe_key,payload,status)
  values('PAIR_LIFECYCLE_EMAIL',
   'pair-lifecycle:'||new.id||':'||new.state||':'||v_member.participant_id,
   jsonb_build_object('participant_id',v_member.participant_id,'pair_id',new.id,'campaign_id',new.campaign_id,
    'template_key',v_template,'pair_state',new.state),
   'PENDING')
  on conflict(dedupe_key) do nothing;
 end loop;
 return new;
end $$;
create trigger pair_lifecycle_message_after_state
 after update of state on pairs
 for each row execute function enqueue_pair_lifecycle_messages();

create or replace function enqueue_payout_lifecycle_message()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 if old.state<>new.state and new.state='PAID' then
  insert into outbox_events(event_type,dedupe_key,payload,status)
  values('PAYOUT_LIFECYCLE_EMAIL','payout-paid:'||new.id,
   jsonb_build_object('participant_id',new.participant_id,'payout_id',new.id,'template_key','PAYOUT_PAID','currency',new.currency),
   'PENDING')
  on conflict(dedupe_key) do nothing;
 end if;
 return new;
end $$;
create trigger payout_lifecycle_message_after_state
 after update of state on payouts
 for each row execute function enqueue_payout_lifecycle_message();

create or replace function claim_message_outbox(p_limit integer default 20)
returns setof outbox_events language plpgsql security definer set search_path=public as $$
begin
 if not subsystem_is_enabled('MESSAGING') then return; end if;
 return query
 with picked as (
  select id from outbox_events
   where event_type in('PAIR_LIFECYCLE_EMAIL','PAYOUT_LIFECYCLE_EMAIL')
     and status in('PENDING','FAILED')
     and attempts<5
     and (next_attempt_at is null or next_attempt_at<=now())
   order by created_at,id
   for update skip locked
   limit greatest(1,least(coalesce(p_limit,20),100))
 ), updated as (
  update outbox_events o
   set status='PROCESSING',attempts=o.attempts+1,updated_at=now()
   from picked p where o.id=p.id
   returning o.*
 )
 select * from updated;
end $$;
revoke all on function claim_message_outbox(integer) from public,anon,authenticated;
grant execute on function claim_message_outbox(integer) to service_role;

create or replace function finish_message_outbox(
 p_event_id uuid,p_success boolean,p_error text
) returns void language plpgsql security definer set search_path=public as $$
declare v_attempts integer;
begin
 select attempts into v_attempts from outbox_events where id=p_event_id for update;
 if not found then raise exception 'outbox_event_not_found'; end if;
 if p_success then
  update outbox_events set status='DELIVERED',last_error=null,next_attempt_at=null,updated_at=now() where id=p_event_id;
 else
  update outbox_events set
   status=case when v_attempts>=5 then 'DEAD_LETTER'::outbox_status else 'FAILED'::outbox_status end,
   last_error=left(coalesce(p_error,'delivery_failed'),1000),
   next_attempt_at=case when v_attempts>=5 then null else now()+(interval '5 minutes' * power(2,greatest(v_attempts-1,0))) end,
   updated_at=now()
  where id=p_event_id;
 end if;
end $$;
revoke all on function finish_message_outbox(uuid,boolean,text) from public,anon,authenticated;
grant execute on function finish_message_outbox(uuid,boolean,text) to service_role;
