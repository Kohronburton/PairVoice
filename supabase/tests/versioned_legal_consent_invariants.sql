\set ON_ERROR_STOP on
begin;
do $$
declare c uuid; v uuid; a uuid; b uuid; ea uuid; eb uuid; p uuid; terms uuid; consent uuid; result jsonb;
begin
 insert into campaigns(slug,name,active) values('legal-consent-test','Legal Consent Test',true) returning id into c;
 insert into campaign_versions(campaign_id,version,status,market_code,country_code,language_code,sessions_required,target_seconds_min,target_seconds_max,hard_seconds_min,hard_seconds_max,pair_compensation_cents,currency)
 values(c,1,'PUBLISHED','US','US','en',1,60,120,30,180,6000,'USD') returning id into v;
 insert into participants(first_name,email,country_code,primary_language_code) values('A','legal-a@example.test','US','en') returning id into a;
 insert into participants(first_name,email,country_code,primary_language_code) values('B','legal-b@example.test','US','en') returning id into b;
 insert into campaign_enrollments(campaign_id,campaign_version_id,participant_id,state) values(c,v,a,'QUALIFIED') returning id into ea;
 insert into campaign_enrollments(campaign_id,campaign_version_id,participant_id,state) values(c,v,b,'QUALIFIED') returning id into eb;
 insert into pairs(campaign_id,campaign_version_id,state) values(c,v,'PAIRED') returning id into p;
 insert into pair_members(pair_id,enrollment_id,role) values(p,ea,'A'),(p,eb,'B');

 insert into legal_documents(scope,document_key,campaign_version_id,locale,version,status,title,body_text,content_sha256)
 values('CAMPAIGN','CAMPAIGN_TERMS',v,'en',1,'DRAFT','Campaign terms','Reviewed campaign terms text used only for invariant testing and long enough to pass publication.','sha-terms') returning id into terms;
 insert into legal_documents(scope,document_key,campaign_version_id,locale,version,status,title,body_text,content_sha256)
 values('CAMPAIGN','PARTICIPANT_CONSENT',v,'en',1,'DRAFT','Participant consent','Reviewed participant consent text used only for invariant testing and long enough to pass publication.','sha-consent') returning id into consent;
 perform publish_legal_document(terms,null,'TEST','Invariant test');
 perform publish_legal_document(consent,null,'TEST','Invariant test');

 begin
  update legal_documents set body_text='changed after publication' where id=terms;
  raise exception 'published_document_mutable';
 exception when others then
  if sqlerrm='published_document_mutable' then raise; end if;
  if sqlerrm<>'published_legal_document_is_immutable' then raise; end if;
 end;

 result:=accept_campaign_documents(a,'legal-consent-test',array[terms,consent]);
 if not coalesce((result->>'ok')::boolean,false) then raise exception 'acceptance_failed'; end if;
 if (select accepted_terms_at from campaign_enrollments where id=ea) is null then raise exception 'accepted_terms_timestamp_missing'; end if;
 if (select count(*) from legal_document_acceptances where participant_id=a and enrollment_id=ea)<>2 then raise exception 'exact_document_acceptance_count_wrong'; end if;
 if not exists(select 1 from pair_readiness_gates where pair_id=p and gate_key='CONSENT_A' and status='PASSED' and jsonb_array_length(evidence->'document_ids')=2) then raise exception 'consent_gate_evidence_missing'; end if;
 if exists(select 1 from pair_readiness_gates where pair_id=p and gate_key='CONSENT_B' and status='PASSED') then raise exception 'other_participant_consent_was_inferred'; end if;

 result:=accept_campaign_documents(a,'legal-consent-test',array[terms,consent]);
 if (select count(*) from legal_document_acceptances where participant_id=a and enrollment_id=ea)<>2 then raise exception 'repeat_acceptance_duplicated'; end if;

 begin
  perform accept_campaign_documents(b,'legal-consent-test',array[terms]);
  raise exception 'partial_consent_allowed';
 exception when others then
  if sqlerrm='partial_consent_allowed' then raise; end if;
  if sqlerrm<>'required_campaign_documents_not_accepted' then raise; end if;
 end;
end $$;
rollback;
select 'versioned legal consent invariants passed' result;
