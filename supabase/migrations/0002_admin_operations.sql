-- Working admin operations layered on the clean baseline.

create or replace function create_credential_bundle(
 p_campaign_id uuid,
 p_label text,
 p_a_username text,
 p_a_secret_ciphertext text,
 p_b_username text,
 p_b_secret_ciphertext text,
 p_pair_invitation_code_ciphertext text default null,
 p_notes text default null,
 p_actor_label text default 'ADMIN'
) returns uuid
language plpgsql security definer set search_path=public as $$
declare v_bundle uuid;
begin
 if not exists(select 1 from campaigns where id=p_campaign_id) then raise exception 'campaign_not_found'; end if;
 if trim(coalesce(p_label,''))='' or trim(coalesce(p_a_username,''))='' or trim(coalesce(p_b_username,''))='' then raise exception 'credential_fields_required'; end if;
 if lower(trim(p_a_username))=lower(trim(p_b_username)) then raise exception 'credential_usernames_must_differ'; end if;
 if coalesce(p_a_secret_ciphertext,'')='' or coalesce(p_b_secret_ciphertext,'')='' then raise exception 'credential_secrets_required'; end if;

 insert into credential_bundles(campaign_id,label,status,pair_invitation_code_ciphertext,notes)
 values(p_campaign_id,trim(p_label),'AVAILABLE',p_pair_invitation_code_ciphertext,nullif(trim(coalesce(p_notes,'')),''))
 returning id into v_bundle;

 insert into credential_accounts(bundle_id,campaign_id,slot,username,secret_ciphertext) values
 (v_bundle,p_campaign_id,'A',trim(p_a_username),p_a_secret_ciphertext),
 (v_bundle,p_campaign_id,'B',trim(p_b_username),p_b_secret_ciphertext);

 insert into audit_events(actor_label,operation,resource_type,resource_id,reason)
 values(p_actor_label,'CREDENTIAL_BUNDLE_CREATED','CREDENTIAL_BUNDLE',v_bundle,'Admin created credential bundle');

 return v_bundle;
end $$;
revoke all on function create_credential_bundle(uuid,text,text,text,text,text,text,text,text) from public,anon,authenticated;

create or replace function release_credential_bundle(p_pair_id uuid,p_actor_label text default 'ADMIN')
returns uuid
language plpgsql security definer set search_path=public as $$
declare v_pair pairs%rowtype; v_assignment credential_assignments%rowtype; v_bundle credential_bundles%rowtype;
begin
 select * into v_pair from pairs where id=p_pair_id for update;
 if not found then raise exception 'pair_not_found'; end if;
 if v_pair.state<>'READY' and v_pair.state<>'RECORDING' then raise exception 'pair_not_ready_for_release'; end if;

 select * into v_assignment from credential_assignments where pair_id=p_pair_id for update;
 if not found then raise exception 'credential_assignment_not_found'; end if;
 select * into v_bundle from credential_bundles where id=v_assignment.bundle_id for update;

 if v_bundle.status not in('RESERVED','RELEASED','IN_USE') then raise exception 'credential_bundle_not_releasable'; end if;
 if v_bundle.status='RESERVED' then update credential_bundles set status='RELEASED' where id=v_bundle.id; end if;
 update credential_assignments set released_at=coalesce(released_at,now()) where id=v_assignment.id;
 if v_pair.state='READY' then update pairs set state='RECORDING' where id=p_pair_id; end if;

 insert into audit_events(actor_label,operation,resource_type,resource_id,reason)
 values(p_actor_label,'CREDENTIAL_RELEASED','PAIR',p_pair_id,'Admin released reserved credentials');
 return v_assignment.id;
end $$;
revoke all on function release_credential_bundle(uuid,text) from public,anon,authenticated;

create or replace function initialize_sessions_when_ready() returns trigger
language plpgsql as $$
declare v_count integer;
begin
 if new.state='READY' and old.state<>'READY' then
  select sessions_required into v_count from campaign_versions where id=new.campaign_version_id;
  insert into conversation_sessions(pair_id,session_number)
  select new.id,g from generate_series(1,v_count) g
  on conflict(pair_id,session_number) do nothing;
 end if;
 return new;
end $$;

create trigger pair_ready_sessions
after update of state on pairs
for each row execute function initialize_sessions_when_ready();
