-- Revenue Release A: platform-aware FunCrowd handoff.
-- Safe to deploy independently of payout automation.

alter table public.campaign_access
 add column if not exists android_launch_url text,
 add column if not exists ios_launch_url text;

-- Verified public app-store fallbacks. Create missing access rows; preserve any existing codes/deep links.
insert into public.campaign_access(campaign_id,provider,reveal_state,android_launch_url,ios_launch_url)
select c.id,'FUNCROWD','READY',
       'https://play.google.com/store/apps/details?id=com.magicdata.magiccollection',
       'https://apps.apple.com/us/app/funcrowd/id1574837524'
from public.campaigns c
where c.active=true and upper(coalesce(c.provider,''))='FUNCROWD'
on conflict(campaign_id) do update
set android_launch_url=coalesce(campaign_access.android_launch_url,excluded.android_launch_url),
    ios_launch_url=coalesce(campaign_access.ios_launch_url,excluded.ios_launch_url),
    updated_at=now();

-- Return generic and platform-specific provider destinations to authenticated pair members.
create or replace function public.prepare_pair_work_access(
 p_pair_id uuid,
 p_idempotency_key text
) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_pair pairs%rowtype; v_provider provider_integrations%rowtype; v_run uuid; v_access campaign_access%rowtype;
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

 v_run:=create_work_provider_run(p_pair_id,v_provider.provider_key,p_idempotency_key);
 select * into v_access from campaign_access where campaign_id=v_pair.campaign_id;

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
