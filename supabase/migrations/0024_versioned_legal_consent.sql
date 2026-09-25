-- Versioned legal/campaign documents and exact participant acceptance evidence.
-- Product infrastructure only: legal text must be supplied/reviewed before publication.

create table legal_documents(
 id uuid primary key default gen_random_uuid(),
 scope text not null check(scope in('SITE','CAMPAIGN')),
 document_key text not null check(document_key in('PRIVACY','TERMS','CAMPAIGN_TERMS','PARTICIPANT_CONSENT')),
 campaign_version_id uuid references campaign_versions(id),
 locale text not null default 'en',
 version integer not null check(version>0),
 status text not null default 'DRAFT' check(status in('DRAFT','PUBLISHED','RETIRED')),
 title text not null,
 body_text text not null,
 content_sha256 text not null,
 published_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check((scope='SITE' and campaign_version_id is null and document_key in('PRIVACY','TERMS'))
    or (scope='CAMPAIGN' and campaign_version_id is not null and document_key in('CAMPAIGN_TERMS','PARTICIPANT_CONSENT'))),
 unique(scope,document_key,campaign_version_id,locale,version)
);
create unique index legal_documents_one_site_published
 on legal_documents(document_key,locale) where scope='SITE' and status='PUBLISHED';
create unique index legal_documents_one_campaign_published
 on legal_documents(campaign_version_id,document_key,locale) where scope='CAMPAIGN' and status='PUBLISHED';
create trigger legal_documents_updated before update on legal_documents for each row execute function set_updated_at();

create or replace function protect_published_legal_document()
returns trigger language plpgsql as $$
begin
 if tg_op='DELETE' and old.status='PUBLISHED' then raise exception 'published_legal_document_is_immutable'; end if;
 if tg_op='UPDATE' and old.status='PUBLISHED' then
  if new.status not in('PUBLISHED','RETIRED') then raise exception 'invalid_published_legal_transition'; end if;
  if (to_jsonb(new)-array['status','updated_at'])<>(to_jsonb(old)-array['status','updated_at']) then
   raise exception 'published_legal_document_is_immutable';
  end if;
 end if;
 return case when tg_op='DELETE' then old else new end;
end $$;
create trigger legal_documents_guard before update or delete on legal_documents for each row execute function protect_published_legal_document();

create table legal_document_acceptances(
 id uuid primary key default gen_random_uuid(),
 participant_id uuid not null references participants(id),
 enrollment_id uuid references campaign_enrollments(id),
 document_id uuid not null references legal_documents(id),
 accepted_at timestamptz not null default now(),
 context jsonb not null default '{}'::jsonb,
 unique(participant_id,document_id)
);
create index legal_acceptance_enrollment_idx on legal_document_acceptances(enrollment_id,accepted_at desc);

alter table legal_documents enable row level security;
alter table legal_document_acceptances enable row level security;
revoke all on legal_documents,legal_document_acceptances from anon;
revoke insert,update,delete on legal_documents,legal_document_acceptances from authenticated;
create policy legal_documents_published_read on legal_documents for select using(status='PUBLISHED');
create policy legal_acceptances_read_self on legal_document_acceptances for select using(
 exists(select 1 from participants p where p.id=participant_id and p.auth_user_id=auth.uid())
);

create or replace function accept_campaign_documents(
 p_participant_id uuid,p_campaign_slug text,p_document_ids uuid[]
) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_campaign campaigns%rowtype; v_enrollment campaign_enrollments%rowtype; v_participant participants%rowtype;
 v_required uuid[]; v_missing integer; v_member record; v_gate text; v_pair_state pair_state;
begin
 select * into v_participant from participants where id=p_participant_id for update;
 if not found then raise exception 'participant_not_found'; end if;
 select * into v_campaign from campaigns where slug=p_campaign_slug and active=true;
 if not found then raise exception 'campaign_unavailable'; end if;
 select * into v_enrollment from campaign_enrollments
  where campaign_id=v_campaign.id and participant_id=p_participant_id for update;
 if not found then raise exception 'campaign_enrollment_not_found'; end if;
 if v_enrollment.state not in('QUALIFIED','ACTIVE') then raise exception 'campaign_enrollment_not_qualified'; end if;

 select array_agg(id order by document_key) into v_required
 from legal_documents
 where scope='CAMPAIGN' and campaign_version_id=v_enrollment.campaign_version_id
   and locale=v_participant.primary_language_code and status='PUBLISHED'
   and document_key in('CAMPAIGN_TERMS','PARTICIPANT_CONSENT');

 if coalesce(array_length(v_required,1),0)<>2 then raise exception 'required_campaign_documents_not_published'; end if;
 select count(*) into v_missing from unnest(v_required) d where not(d=any(coalesce(p_document_ids,'{}'::uuid[])));
 if v_missing>0 then raise exception 'required_campaign_documents_not_accepted'; end if;

 insert into legal_document_acceptances(participant_id,enrollment_id,document_id,context)
 select p_participant_id,v_enrollment.id,d,jsonb_build_object('campaign_version_id',v_enrollment.campaign_version_id)
 from unnest(v_required) d
 on conflict(participant_id,document_id) do nothing;
 update campaign_enrollments set accepted_terms_at=coalesce(accepted_terms_at,now()) where id=v_enrollment.id;

 for v_member in
  select pm.pair_id,pm.role,p.state
  from pair_members pm join pairs p on p.id=pm.pair_id
  where pm.enrollment_id=v_enrollment.id and pm.active=true
 loop
  v_gate:=case when v_member.role='A' then 'CONSENT_A' else 'CONSENT_B' end;
  insert into pair_readiness_gates(pair_id,gate_key,status,evidence,checked_at)
  values(v_member.pair_id,v_gate,'PASSED',
    jsonb_build_object('document_ids',to_jsonb(v_required),'accepted_at',now(),'campaign_version_id',v_enrollment.campaign_version_id),now())
  on conflict(pair_id,gate_key) do update set status='PASSED',evidence=excluded.evidence,checked_at=excluded.checked_at,updated_at=now();
  if v_member.state in('PAIRED','READINESS_PENDING','READY') then
   perform evaluate_pair_readiness(v_member.pair_id,'PARTICIPANT_CONSENT');
  end if;
 end loop;

 insert into activity_events(actor_type,actor_participant_id,action,entity_type,entity_id,campaign_id,metadata)
 values('PARTICIPANT',p_participant_id,'CAMPAIGN_DOCUMENTS_ACCEPTED','ENROLLMENT',v_enrollment.id,v_campaign.id,
  jsonb_build_object('document_ids',to_jsonb(v_required),'campaign_version_id',v_enrollment.campaign_version_id));
 return jsonb_build_object('ok',true,'documentIds',to_jsonb(v_required),'acceptedAt',(select accepted_terms_at from campaign_enrollments where id=v_enrollment.id));
end $$;
revoke all on function accept_campaign_documents(uuid,text,uuid[]) from public,anon,authenticated;
grant execute on function accept_campaign_documents(uuid,text,uuid[]) to service_role;


create or replace function publish_legal_document(
 p_document_id uuid,p_actor_user_id uuid,p_actor_label text,p_reason text
) returns void language plpgsql security definer set search_path=public as $$
declare v_doc legal_documents%rowtype;
begin
 if trim(coalesce(p_reason,''))='' then raise exception 'publish_reason_required'; end if;
 select * into v_doc from legal_documents where id=p_document_id for update;
 if not found then raise exception 'legal_document_not_found'; end if;
 if v_doc.status='PUBLISHED' then return; end if;
 if v_doc.status<>'DRAFT' then raise exception 'only_draft_document_can_be_published'; end if;
 if length(trim(v_doc.body_text))<40 then raise exception 'legal_document_body_too_short'; end if;

 update legal_documents set status='RETIRED'
 where status='PUBLISHED' and scope=v_doc.scope and document_key=v_doc.document_key and locale=v_doc.locale
   and campaign_version_id is not distinct from v_doc.campaign_version_id;

 update legal_documents set status='PUBLISHED',published_at=now() where id=p_document_id;

 insert into audit_events(actor_user_id,actor_label,operation,resource_type,resource_id,reason,after_data)
 values(p_actor_user_id,p_actor_label,'LEGAL_DOCUMENT_PUBLISHED','LEGAL_DOCUMENT',p_document_id,p_reason,
  jsonb_build_object('scope',v_doc.scope,'document_key',v_doc.document_key,'locale',v_doc.locale,'version',v_doc.version,'sha256',v_doc.content_sha256));
end $$;
revoke all on function publish_legal_document(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function publish_legal_document(uuid,uuid,text,text) to service_role;
