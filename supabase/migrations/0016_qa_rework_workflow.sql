-- Auditable, idempotent QA/rework workflow.

create or replace function record_pair_review(
 p_pair_id uuid,
 p_stage review_stage,
 p_decision review_decision,
 p_notes text,
 p_external_reference text,
 p_actor_user_id uuid,
 p_actor_label text,
 p_idempotency_key text
) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_pair pairs%rowtype; v_response jsonb; v_review_id uuid;
begin
 select response into v_response from idempotency_records where key=p_idempotency_key and operation='PAIR_REVIEW';
 if found then return v_response; end if;

 select * into v_pair from pairs where id=p_pair_id for update;
 if not found then raise exception 'pair_not_found'; end if;

 if p_stage='INTERNAL' then
  if v_pair.state='SUBMITTED' then
   update pairs set state='INTERNAL_QA' where id=p_pair_id returning * into v_pair;
  elsif v_pair.state<>'INTERNAL_QA' then
   raise exception 'pair_not_in_internal_qa';
  end if;
 elsif p_stage='CLIENT' then
  if v_pair.state<>'CLIENT_QA' then raise exception 'pair_not_in_client_qa'; end if;
 end if;

 insert into reviews(pair_id,stage,decision,notes,external_reference,actor_user_id)
 values(p_pair_id,p_stage,p_decision,nullif(trim(coalesce(p_notes,'')),''),nullif(trim(coalesce(p_external_reference,'')),''),p_actor_user_id)
 returning id into v_review_id;

 if p_stage='INTERNAL' then
  if p_decision='APPROVED' then
   update pairs set state='CLIENT_QA' where id=p_pair_id;
  elsif p_decision='REWORK_REQUIRED' then
   update pairs set state='REWORK_REQUIRED' where id=p_pair_id;
  elsif p_decision='REJECTED' then
   update pairs set state='REJECTED' where id=p_pair_id;
  end if;
 elsif p_stage='CLIENT' then
  if p_decision='APPROVED' then
   perform approve_pair_and_create_earnings(p_pair_id,p_idempotency_key||':approval',p_actor_label);
  elsif p_decision='REWORK_REQUIRED' then
   update pairs set state='REWORK_REQUIRED' where id=p_pair_id;
  elsif p_decision='REJECTED' then
   update pairs set state='REJECTED' where id=p_pair_id;
  end if;
 end if;

 insert into activity_events(actor_type,actor_user_id,action,entity_type,entity_id,campaign_id,pair_id,metadata)
 values('ADMIN',p_actor_user_id,'PAIR_REVIEW_'||p_stage||'_'||p_decision,'PAIR',p_pair_id,v_pair.campaign_id,p_pair_id,
  jsonb_build_object('review_id',v_review_id,'stage',p_stage,'decision',p_decision));

 insert into audit_events(actor_user_id,actor_label,operation,resource_type,resource_id,reason,after_data)
 values(p_actor_user_id,p_actor_label,'PAIR_REVIEW','PAIR',p_pair_id,coalesce(nullif(trim(coalesce(p_notes,'')),''),'QA decision'),
  jsonb_build_object('review_id',v_review_id,'stage',p_stage,'decision',p_decision));

 v_response:=jsonb_build_object('ok',true,'reviewId',v_review_id,'pairId',p_pair_id,'stage',p_stage,'decision',p_decision);
 insert into idempotency_records(key,operation,response) values(p_idempotency_key,'PAIR_REVIEW',v_response)
 on conflict(key) do nothing;
 return v_response;
end $$;

revoke all on function record_pair_review(uuid,review_stage,review_decision,text,text,uuid,text,text) from public,anon,authenticated;
grant execute on function record_pair_review(uuid,review_stage,review_decision,text,text,uuid,text,text) to service_role;
