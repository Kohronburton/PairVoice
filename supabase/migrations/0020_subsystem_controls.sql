-- Production subsystem controls and failure isolation.

create table subsystem_controls(
 subsystem text primary key check(subsystem in('MATCHING','WORK','PAYOUT','MESSAGING','REFERRAL')),
 enabled boolean not null default true,
 reason text,
 updated_by uuid references auth.users(id),
 updated_at timestamptz not null default now()
);
insert into subsystem_controls(subsystem,enabled) values
 ('MATCHING',true),('WORK',true),('PAYOUT',true),('MESSAGING',true),('REFERRAL',true)
on conflict(subsystem) do nothing;

alter table subsystem_controls enable row level security;
revoke all on subsystem_controls from anon,authenticated;

create or replace function subsystem_is_enabled(p_subsystem text)
returns boolean language sql stable security definer set search_path=public as $$
 select coalesce((select enabled from subsystem_controls where subsystem=upper(p_subsystem)),false)
$$;
revoke all on function subsystem_is_enabled(text) from public,anon,authenticated;
grant execute on function subsystem_is_enabled(text) to service_role;

create or replace function set_subsystem_control(
 p_subsystem text,p_enabled boolean,p_reason text,p_actor_user_id uuid,p_actor_label text
) returns void language plpgsql security definer set search_path=public as $$
declare v_before subsystem_controls%rowtype;
begin
 if upper(p_subsystem) not in('MATCHING','WORK','PAYOUT','MESSAGING','REFERRAL') then raise exception 'invalid_subsystem'; end if;
 if trim(coalesce(p_reason,''))='' then raise exception 'control_reason_required'; end if;
 select * into v_before from subsystem_controls where subsystem=upper(p_subsystem) for update;
 insert into subsystem_controls(subsystem,enabled,reason,updated_by,updated_at)
 values(upper(p_subsystem),p_enabled,p_reason,p_actor_user_id,now())
 on conflict(subsystem) do update set enabled=excluded.enabled,reason=excluded.reason,updated_by=excluded.updated_by,updated_at=now();

 insert into audit_events(actor_user_id,actor_label,operation,resource_type,resource_id,before_data,after_data,reason)
 values(p_actor_user_id,p_actor_label,'SUBSYSTEM_CONTROL_CHANGED','SUBSYSTEM',null,
  jsonb_build_object('subsystem',upper(p_subsystem),'enabled',v_before.enabled),
  jsonb_build_object('subsystem',upper(p_subsystem),'enabled',p_enabled),p_reason);
end $$;
revoke all on function set_subsystem_control(text,boolean,text,uuid,text) from public,anon,authenticated;
grant execute on function set_subsystem_control(text,boolean,text,uuid,text) to service_role;

-- Referral disablement must never block core approval: skip reward processing while disabled.
create or replace function referral_pair_approved_trigger()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 if old.state<>new.state and new.state='APPROVED' and subsystem_is_enabled('REFERRAL') then
  perform process_referrals_for_approved_pair(new.id);
 end if;
 return new;
end $$;
