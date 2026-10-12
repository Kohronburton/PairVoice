-- Work access must not be prepared for a campaign whose published version requires an
-- invitation code until an administrator has configured a real one. Same function as 0036,
-- with the invitation-code guard added before the work run is created.
create or replace function public.prepare_pair_work_access(
 p_pair_id uuid,
 p_idempotency_key text
) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_pair pairs%rowtype; v_provider provider_integrations%rowtype; v_run uuid; v_access campaign_access%rowtype; v_mode text;
begin
 select * into v_pair from pairs where id=p_pair_id for update;
 if not found then raise exception 'pair_not_found'; end if;
 perform public.evaluate_pair_readiness(p_pair_id,'WORK_ACCESS_RECHECK');
 select * into v_pair from pairs where id=p_pair_id for update;
 if v_pair.state not in('READY','RECORDING','REWORK_REQUIRED') then raise exception 'pair_not_ready_for_work'; end if;

 select pi.* into v_provider
 from campaign_provider_bindings b
 join provider_integrations pi on pi.id=b.provider_id
 where b.campaign_version_id=v_pair.campaign_version_id
   and b.purpose='WORK' and b.active=true and pi.status='ACTIVE'
 limit 1;
 if not found then raise exception 'work_provider_not_bound'; end if;

 select * into v_access from campaign_access where campaign_id=v_pair.campaign_id;
 select invitation_code_mode into v_mode from campaign_versions where id=v_pair.campaign_version_id;
 if coalesce(v_mode,'NONE')<>'NONE'
    and (nullif(trim(coalesce(v_access.invitation_code,'')),'') is null or v_access.invitation_code='CONFIGURE_IN_ADMIN') then
  raise exception 'invitation_code_not_configured';
 end if;

 v_run:=create_work_provider_run(p_pair_id,v_provider.provider_key,p_idempotency_key);

 return jsonb_build_object(
  'runId',v_run,
  'providerKey',v_provider.provider_key,
  'providerName',v_provider.display_name,
  'mode',v_provider.mode,
  'launchUrl',v_access.launch_url,
  'androidLaunchUrl',v_access.android_launch_url,
  'iosLaunchUrl',v_access.ios_launch_url,
  'invitationCode',v_access.invitation_code,
  'pairState',v_pair.state
 );
end $$;
revoke all on function public.prepare_pair_work_access(uuid,text) from public,anon,authenticated;
grant execute on function public.prepare_pair_work_access(uuid,text) to service_role;
