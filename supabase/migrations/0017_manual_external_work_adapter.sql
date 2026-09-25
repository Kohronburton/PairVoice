-- Manual external work adapter for FunCrowd-style campaigns.
-- No FunCrowd API is assumed; PairVoice remains source of truth.

alter table campaign_access add column if not exists launch_url text;

insert into provider_integrations(provider_key,provider_type,display_name,mode,status,config)
values('funcrowd','WORK','FunCrowd','MANUAL','ACTIVE','{"integration":"manual_external"}'::jsonb)
on conflict(provider_key) do update set display_name=excluded.display_name,provider_type='WORK',mode='MANUAL';

insert into campaign_provider_bindings(campaign_id,campaign_version_id,provider_id,purpose,active,settings)
select c.id,cv.id,p.id,'WORK',true,jsonb_build_object('adapter','manual_external')
from campaigns c
join campaign_versions cv on cv.campaign_id=c.id and cv.status='PUBLISHED'
join provider_integrations p on p.provider_key='funcrowd'
where upper(coalesce(c.provider,''))='FUNCROWD'
on conflict(campaign_version_id,purpose) do nothing;

create or replace function prepare_pair_work_access(
 p_pair_id uuid,
 p_idempotency_key text
) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_pair pairs%rowtype; v_provider provider_integrations%rowtype; v_run uuid; v_access campaign_access%rowtype;
begin
 select * into v_pair from pairs where id=p_pair_id for update;
 if not found then raise exception 'pair_not_found'; end if;
 if v_pair.state not in('READY','RECORDING','REWORK_REQUIRED') then raise exception 'pair_not_ready_for_work'; end if;

 select pi.* into v_provider
 from campaign_provider_bindings b
 join provider_integrations pi on pi.id=b.provider_id
 where b.campaign_version_id=v_pair.campaign_version_id and b.purpose='WORK' and b.active=true and pi.status='ACTIVE'
 limit 1;
 if not found then raise exception 'work_provider_not_bound'; end if;

 v_run:=create_work_provider_run(p_pair_id,v_provider.provider_key,p_idempotency_key);
 select * into v_access from campaign_access where campaign_id=v_pair.campaign_id;

 return jsonb_build_object(
  'runId',v_run,
  'providerKey',v_provider.provider_key,
  'providerName',v_provider.display_name,
  'mode',v_provider.mode,
  'launchUrl',v_access.launch_url,
  'invitationCode',v_access.invitation_code,
  'pairState',v_pair.state
 );
end $$;

revoke all on function prepare_pair_work_access(uuid,text) from public,anon,authenticated;
grant execute on function prepare_pair_work_access(uuid,text) to service_role;
