-- Campaign-specific linking for two existing PairVoice participants.
-- History is preserved: each existing PARTNER_PENDING pair remains in the database;
-- the target's prior empty pair is cancelled rather than deleted/reset.

create table campaign_partner_requests(
 id uuid primary key default gen_random_uuid(),
 campaign_id uuid not null references campaigns(id),
 campaign_version_id uuid not null references campaign_versions(id),
 requester_participant_id uuid not null references participants(id),
 target_participant_id uuid not null references participants(id),
 status text not null default 'PENDING' check(status in('PENDING','ACCEPTED','DECLINED','CANCELLED','EXPIRED')),
 requester_pair_id uuid references pairs(id),
 target_pair_id uuid references pairs(id),
 connected_pair_id uuid references pairs(id),
 created_at timestamptz not null default now(),
 responded_at timestamptz,
 updated_at timestamptz not null default now(),
 check(requester_participant_id<>target_participant_id)
);
create unique index campaign_partner_request_pending_unique
 on campaign_partner_requests(campaign_id,requester_participant_id,target_participant_id)
 where status='PENDING';
create index campaign_partner_request_target_idx
 on campaign_partner_requests(target_participant_id,status,created_at desc);
create trigger campaign_partner_requests_updated before update on campaign_partner_requests for each row execute function set_updated_at();
alter table campaign_partner_requests enable row level security;
revoke all on campaign_partner_requests from anon,authenticated;

create or replace function participant_pending_pair_for_campaign(
 p_participant_id uuid,p_campaign_id uuid
) returns uuid language sql stable security definer set search_path=public as $$
 select p.id
 from campaign_enrollments e
 join pair_members pm on pm.enrollment_id=e.id and pm.active=true
 join pairs p on p.id=pm.pair_id
 where e.participant_id=p_participant_id and e.campaign_id=p_campaign_id
   and p.state='PARTNER_PENDING'
 order by p.created_at asc limit 1
$$;
revoke all on function participant_pending_pair_for_campaign(uuid,uuid) from public,anon,authenticated;
grant execute on function participant_pending_pair_for_campaign(uuid,uuid) to service_role;

create or replace function request_existing_partner(
 p_requester_id uuid,p_target_public_code text,p_campaign_slug text
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_campaign campaigns%rowtype; v_version campaign_versions%rowtype; v_target participants%rowtype;
 v_requester_pair uuid; v_target_pair uuid; v_request uuid;
begin
 if not subsystem_is_enabled('MATCHING') then raise exception 'matching_paused'; end if;
 select * into v_campaign from campaigns where slug=p_campaign_slug and active=true;
 if not found then raise exception 'campaign_unavailable'; end if;
 select * into v_version from campaign_versions where campaign_id=v_campaign.id and status='PUBLISHED';
 if not found then raise exception 'campaign_not_published'; end if;
 select * into v_target from participants where public_code=upper(trim(p_target_public_code)) and status='ACTIVE';
 if not found then raise exception 'partner_code_not_found'; end if;
 if v_target.id=p_requester_id then raise exception 'participant_cannot_pair_with_self'; end if;

 if not exists(select 1 from campaign_enrollments where participant_id=p_requester_id and campaign_id=v_campaign.id and state='QUALIFIED')
  then raise exception 'requester_not_qualified_for_campaign'; end if;
 if not exists(select 1 from campaign_enrollments where participant_id=v_target.id and campaign_id=v_campaign.id and state='QUALIFIED')
  then raise exception 'target_not_qualified_for_campaign'; end if;

 v_requester_pair:=participant_pending_pair_for_campaign(p_requester_id,v_campaign.id);
 v_target_pair:=participant_pending_pair_for_campaign(v_target.id,v_campaign.id);
 if v_requester_pair is null then raise exception 'requester_not_available_for_linking'; end if;
 if v_target_pair is null then raise exception 'target_not_available_for_linking'; end if;

 select id into v_request from campaign_partner_requests
 where campaign_id=v_campaign.id and requester_participant_id=p_requester_id
   and target_participant_id=v_target.id and status='PENDING';
 if found then return v_request; end if;

 insert into campaign_partner_requests(
  campaign_id,campaign_version_id,requester_participant_id,target_participant_id,
  requester_pair_id,target_pair_id
 ) values(
  v_campaign.id,v_version.id,p_requester_id,v_target.id,v_requester_pair,v_target_pair
 ) returning id into v_request;

 insert into activity_events(actor_type,actor_participant_id,action,entity_type,entity_id,campaign_id,metadata)
 values('PARTICIPANT',p_requester_id,'EXISTING_PARTNER_REQUESTED','PARTNER_REQUEST',v_request,v_campaign.id,
  jsonb_build_object('target_participant_id',v_target.id));
 return v_request;
end $$;
revoke all on function request_existing_partner(uuid,text,text) from public,anon,authenticated;
grant execute on function request_existing_partner(uuid,text,text) to service_role;

create or replace function respond_existing_partner_request(
 p_request_id uuid,p_target_participant_id uuid,p_accept boolean
) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_req campaign_partner_requests%rowtype; v_requester_pair pairs%rowtype; v_target_pair pairs%rowtype;
 v_target_enrollment uuid; v_existing_role_b uuid;
begin
 select * into v_req from campaign_partner_requests where id=p_request_id for update;
 if not found then raise exception 'partner_request_not_found'; end if;
 if v_req.target_participant_id<>p_target_participant_id then raise exception 'partner_request_forbidden'; end if;
 if v_req.status<>'PENDING' then
  return jsonb_build_object('ok',true,'status',v_req.status,'pairId',v_req.connected_pair_id);
 end if;

 if not p_accept then
  update campaign_partner_requests set status='DECLINED',responded_at=now() where id=p_request_id;
  return jsonb_build_object('ok',true,'status','DECLINED');
 end if;
 if not subsystem_is_enabled('MATCHING') then raise exception 'matching_paused'; end if;

 select * into v_requester_pair from pairs where id=v_req.requester_pair_id for update;
 select * into v_target_pair from pairs where id=v_req.target_pair_id for update;
 if v_requester_pair.state<>'PARTNER_PENDING' then raise exception 'requester_pair_no_longer_available'; end if;
 if v_target_pair.state<>'PARTNER_PENDING' then raise exception 'target_pair_no_longer_available'; end if;

 if participant_pending_pair_for_campaign(v_req.requester_participant_id,v_req.campaign_id)<>v_requester_pair.id
  then raise exception 'requester_membership_changed'; end if;
 if participant_pending_pair_for_campaign(v_req.target_participant_id,v_req.campaign_id)<>v_target_pair.id
  then raise exception 'target_membership_changed'; end if;

 select e.id into v_target_enrollment
 from campaign_enrollments e
 where e.participant_id=v_req.target_participant_id and e.campaign_id=v_req.campaign_id and e.state='QUALIFIED';
 if not found then raise exception 'target_enrollment_missing'; end if;

 select id into v_existing_role_b from pair_members where pair_id=v_requester_pair.id and role='B' and active=true;
 if found then raise exception 'requester_pair_already_has_partner'; end if;

 update pair_members set active=false,removed_at=now()
 where pair_id=v_target_pair.id and enrollment_id=v_target_enrollment and active=true;

 update pairs set state='CANCELLED' where id=v_target_pair.id;
 insert into pair_members(pair_id,enrollment_id,role,share_basis_points)
 values(v_requester_pair.id,v_target_enrollment,'B',5000);
 update pairs set state='PAIRED',paired_at=now() where id=v_requester_pair.id;

 update campaign_partner_requests
 set status='ACCEPTED',responded_at=now(),connected_pair_id=v_requester_pair.id
 where id=p_request_id;

 update campaign_partner_requests
 set status='CANCELLED',responded_at=now()
 where campaign_id=v_req.campaign_id and status='PENDING' and id<>p_request_id
   and (requester_participant_id in(v_req.requester_participant_id,v_req.target_participant_id)
     or target_participant_id in(v_req.requester_participant_id,v_req.target_participant_id));

 perform record_business_funnel_event(
  'partner_invite_accepted',v_req.campaign_id,v_requester_pair.id,v_req.target_participant_id,
  'existing-partner-request:'||p_request_id,
  jsonb_build_object('source','existing_user','request_id',p_request_id)
 );

 insert into activity_events(actor_type,actor_participant_id,action,entity_type,entity_id,campaign_id,pair_id,metadata)
 values('PARTICIPANT',p_target_participant_id,'EXISTING_PARTNER_CONNECTED','PAIR',v_requester_pair.id,
  v_req.campaign_id,v_requester_pair.id,jsonb_build_object('request_id',p_request_id,'superseded_pair_id',v_target_pair.id));

 return jsonb_build_object('ok',true,'status','ACCEPTED','pairId',v_requester_pair.id,'supersededPairId',v_target_pair.id);
end $$;
revoke all on function respond_existing_partner_request(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function respond_existing_partner_request(uuid,uuid,boolean) to service_role;
