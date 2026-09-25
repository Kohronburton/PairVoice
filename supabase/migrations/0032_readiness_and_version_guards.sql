-- Re-evaluate readiness in both directions and enforce campaign-version pairing.
create or replace function public.evaluate_pair_readiness(p_pair_id uuid,p_actor_label text default 'SYSTEM')
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_pair pairs%rowtype; v_missing text[]; v_ready boolean;
begin
 select * into v_pair from pairs where id=p_pair_id for update;
 if not found then raise exception 'pair_not_found'; end if;
 if v_pair.state not in('PAIRED','READINESS_PENDING','READY') then raise exception 'pair_not_in_readiness'; end if;
 select array_agg(req.gate_key order by req.gate_key) into v_missing from
 (values('PARTNER_ACCEPTED'),('ELIGIBILITY_A'),('ELIGIBILITY_B'),('SAMPLE_A'),('SAMPLE_B'),('CONSENT_A'),('CONSENT_B'),('PARTICIPATION_HISTORY'),('CAPACITY'),('CREDENTIAL')) req(gate_key)
 where not exists(select 1 from pair_readiness_gates g where g.pair_id=p_pair_id and g.gate_key=req.gate_key and g.status in('PASSED','WAIVED'));
 v_ready:=coalesce(array_length(v_missing,1),0)=0;
 if v_ready and v_pair.state in('PAIRED','READINESS_PENDING') then update pairs set state='READY' where id=p_pair_id;
 elsif not v_ready and v_pair.state='READY' then update pairs set state='READINESS_PENDING' where id=p_pair_id;
 elsif not v_ready and v_pair.state='PAIRED' then update pairs set state='READINESS_PENDING' where id=p_pair_id;
 end if;
 insert into activity_events(actor_type,action,entity_type,entity_id,campaign_id,pair_id,metadata)
 values('SYSTEM','PAIR_READINESS_EVALUATED','PAIR',p_pair_id,v_pair.campaign_id,p_pair_id,jsonb_build_object('ready',v_ready,'missing',coalesce(to_jsonb(v_missing),'[]'::jsonb)));
 return jsonb_build_object('ready',v_ready,'missing',coalesce(to_jsonb(v_missing),'[]'::jsonb));
end $$;

create or replace function public.enforce_pair_member_campaign_version()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 if not exists(select 1 from pairs p join campaign_enrollments e on e.id=new.enrollment_id
   where p.id=new.pair_id and p.campaign_version_id=e.campaign_version_id) then
  raise exception 'pair_campaign_version_mismatch';
 end if;
 return new;
end $$;
drop trigger if exists pair_member_campaign_version_guard on public.pair_members;
create trigger pair_member_campaign_version_guard before insert or update on public.pair_members
for each row execute function public.enforce_pair_member_campaign_version();
