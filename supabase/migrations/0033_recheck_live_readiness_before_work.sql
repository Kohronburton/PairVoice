-- READY pairs remain stable, but work preparation must inspect live gates.
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
 elsif not v_ready and v_pair.state='PAIRED' then update pairs set state='READINESS_PENDING' where id=p_pair_id;
 end if;
 insert into activity_events(actor_type,action,entity_type,entity_id,campaign_id,pair_id,metadata)
 values('SYSTEM','PAIR_READINESS_EVALUATED','PAIR',p_pair_id,v_pair.campaign_id,p_pair_id,jsonb_build_object('ready',v_ready,'missing',coalesce(to_jsonb(v_missing),'[]'::jsonb)));
 return jsonb_build_object('ready',v_ready,'missing',coalesce(to_jsonb(v_missing),'[]'::jsonb));
end $$;

create or replace function public.prepare_pair_work_access(p_pair_id uuid,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_pair pairs%rowtype; v_provider provider_integrations%rowtype; v_run uuid; v_access campaign_access%rowtype;
begin
 select * into v_pair from pairs where id=p_pair_id for update;
 if not found then raise exception 'pair_not_found'; end if;
 if v_pair.state not in('READY','RECORDING','REWORK_REQUIRED') then raise exception 'pair_not_ready_for_work'; end if;
 if exists(select 1 from (values('PARTNER_ACCEPTED'),('ELIGIBILITY_A'),('ELIGIBILITY_B'),('SAMPLE_A'),('SAMPLE_B'),('CONSENT_A'),('CONSENT_B'),('PARTICIPATION_HISTORY'),('CAPACITY'),('CREDENTIAL')) req(gate_key)
  where not exists(select 1 from pair_readiness_gates g where g.pair_id=p_pair_id and g.gate_key=req.gate_key and g.status in('PASSED','WAIVED'))) then raise exception 'readiness_gates_incomplete'; end if;
 select pi.* into v_provider from campaign_provider_bindings b join provider_integrations pi on pi.id=b.provider_id
 where b.campaign_version_id=v_pair.campaign_version_id and b.purpose='WORK' and b.active=true and pi.status='ACTIVE' limit 1;
 if not found then raise exception 'work_provider_not_bound'; end if;
 v_run:=create_work_provider_run(p_pair_id,v_provider.provider_key,p_idempotency_key);
 select * into v_access from campaign_access where campaign_id=v_pair.campaign_id;
 return jsonb_build_object('runId',v_run,'providerKey',v_provider.provider_key,'providerName',v_provider.display_name,'mode',v_provider.mode,'launchUrl',v_access.launch_url,'invitationCode',v_access.invitation_code,'pairState',v_pair.state);
end $$;
