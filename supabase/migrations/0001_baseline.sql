-- PairVoice clean baseline
-- Fresh-start schema. Legacy migration history was intentionally removed before production.
create extension if not exists pgcrypto;
create extension if not exists citext;

create type campaign_version_status as enum ('DRAFT','PUBLISHED','RETIRED');
create type participant_status as enum ('ACTIVE','SUSPENDED');
create type enrollment_status as enum ('APPLIED','SCREENING','QUALIFIED','INELIGIBLE','ACTIVE','COMPLETED','CANCELLED');
create type pair_state as enum ('PARTNER_PENDING','PAIRED','READINESS_PENDING','READY','RECORDING','SUBMITTED','INTERNAL_QA','CLIENT_QA','REWORK_REQUIRED','APPROVED','PAYABLE','PAID','PAYMENT_FAILED','REJECTED','CANCELLED','ON_HOLD');
create type credential_status as enum ('AVAILABLE','RESERVED','RELEASED','IN_USE','SUBMITTED','CLOSED','REVOKED','PROBLEM','DISABLED');
create type session_status as enum ('NOT_STARTED','IN_PROGRESS','REPORTED_SUCCESS','PROBLEM_REPORTED','REWORK_REQUIRED','APPROVED');
create type review_stage as enum ('INTERNAL','CLIENT');
create type review_decision as enum ('PENDING','APPROVED','REWORK_REQUIRED','REJECTED');
create type referral_status as enum ('PENDING','QUALIFIED','AVAILABLE','PAID','VOID');
create type ledger_entry_type as enum ('CAMPAIGN_EARNING','REFERRAL_EARNING','PAYOUT','ADJUSTMENT','REVERSAL');
create type payout_state as enum ('REQUESTED','PROCESSING','PAID','FAILED','CANCELLED');
create type message_status as enum ('RECOMMENDED','QUEUED','SENT','DELIVERED','FAILED','SKIPPED');
create type outbox_status as enum ('PENDING','PROCESSING','DELIVERED','FAILED','DEAD_LETTER');
create type admin_role as enum ('SUPER_ADMIN','OPERATIONS','QA_REVIEWER','PAYMENTS','SUPPORT','VIEW_ONLY');
create type topic_group as enum ('EXPERT','CASUAL');

create table campaigns (
 id uuid primary key default gen_random_uuid(), slug text not null unique, name text not null,
 active boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table campaign_versions (
 id uuid primary key default gen_random_uuid(), campaign_id uuid not null references campaigns(id) on delete cascade,
 version integer not null check(version>0), status campaign_version_status not null default 'DRAFT',
 market_code text not null, country_code text not null, language_code text not null, native_region text,
 sessions_required integer not null default 7 check(sessions_required between 1 and 50),
 target_seconds_min integer not null check(target_seconds_min>0), target_seconds_max integer not null check(target_seconds_max>=target_seconds_min),
 hard_seconds_min integer not null check(hard_seconds_min>0), hard_seconds_max integer not null check(hard_seconds_max>hard_seconds_min),
 repeat_participation_allowed boolean not null default false, currency text not null default 'USD' check(char_length(currency)=3),
 pair_compensation_cents integer not null check(pair_compensation_cents>=0),
 client_revenue_cents integer check(client_revenue_cents is null or client_revenue_cents>=0),
 referral_commission_cents integer not null default 0 check(referral_commission_cents>=0),
 invitation_code_mode text not null default 'NONE' check(invitation_code_mode in('NONE','CAMPAIGN_DEFAULT','PAIR_SPECIFIC')),
 default_invitation_code text, invitation_code_scope_confirmed boolean not null default false,
 rules jsonb not null default '{}'::jsonb, published_at timestamptz, created_at timestamptz not null default now(),
 unique(campaign_id,version), unique(campaign_id,id),
 check(hard_seconds_min<=target_seconds_min), check(target_seconds_max<=hard_seconds_max),
 check((invitation_code_mode='CAMPAIGN_DEFAULT' and default_invitation_code is not null) or invitation_code_mode<>'CAMPAIGN_DEFAULT')
);
create unique index campaign_one_published_version_idx on campaign_versions(campaign_id) where status='PUBLISHED';

create table participants (
 id uuid primary key default gen_random_uuid(), auth_user_id uuid unique references auth.users(id) on delete set null,
 public_code text not null unique default upper(substr(replace(gen_random_uuid()::text,'-',''),1,10)),
 first_name text not null, email citext not null unique, phone text, country_code text not null, primary_language_code text not null,
 status participant_status not null default 'ACTIVE', marketing_consent boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table campaign_enrollments (
 id uuid primary key default gen_random_uuid(), campaign_id uuid not null references campaigns(id),
 campaign_version_id uuid not null references campaign_versions(id), participant_id uuid not null references participants(id),
 state enrollment_status not null default 'APPLIED', eligibility jsonb not null default '{}'::jsonb,
 accepted_terms_at timestamptz, completed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(campaign_id,participant_id)
);

create table pairs (
 id uuid primary key default gen_random_uuid(), public_code text not null unique default upper(substr(replace(gen_random_uuid()::text,'-',''),1,10)),
 campaign_id uuid not null references campaigns(id), campaign_version_id uuid not null references campaign_versions(id),
 invite_code text not null unique default upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)),
 state pair_state not null default 'PARTNER_PENDING', paired_at timestamptz, submitted_at timestamptz, approved_at timestamptz, paid_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table pair_members (
 id uuid primary key default gen_random_uuid(), pair_id uuid not null references pairs(id) on delete cascade,
 enrollment_id uuid not null references campaign_enrollments(id), role text not null check(role in('A','B')),
 active boolean not null default true, share_basis_points integer not null default 5000 check(share_basis_points between 0 and 10000),
 readiness_completed_at timestamptz, joined_at timestamptz not null default now(), removed_at timestamptz
);
create unique index pair_one_active_role_idx on pair_members(pair_id,role) where active;
create unique index enrollment_one_active_pair_idx on pair_members(enrollment_id) where active;

create table topics (
 id uuid primary key default gen_random_uuid(), campaign_version_id uuid not null references campaign_versions(id) on delete cascade,
 topic_group topic_group not null, name text not null, details text, sensitive boolean not null default false, active boolean not null default true,
 created_at timestamptz not null default now(), unique(campaign_version_id,name)
);

create table credential_bundles (
 id uuid primary key default gen_random_uuid(), campaign_id uuid not null references campaigns(id), label text not null,
 status credential_status not null default 'AVAILABLE', pair_invitation_code_ciphertext text, notes text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(campaign_id,label), unique(id,campaign_id)
);
create table credential_accounts (
 id uuid primary key default gen_random_uuid(), bundle_id uuid not null, campaign_id uuid not null,
 slot text not null check(slot in('A','B')), username citext not null, secret_ciphertext text not null,
 created_at timestamptz not null default now(),
 foreign key(bundle_id,campaign_id) references credential_bundles(id,campaign_id) on delete cascade,
 unique(bundle_id,slot), unique(campaign_id,username)
);
create table credential_assignments (
 id uuid primary key default gen_random_uuid(), pair_id uuid not null unique references pairs(id),
 bundle_id uuid not null unique references credential_bundles(id), reserved_at timestamptz not null default now(),
 released_at timestamptz, submitted_at timestamptz, closed_at timestamptz, revoked_at timestamptz
);

create table conversation_sessions (
 id uuid primary key default gen_random_uuid(), pair_id uuid not null references pairs(id) on delete cascade,
 session_number integer not null check(session_number between 1 and 50), topic_id uuid references topics(id),
 status session_status not null default 'NOT_STARTED', duration_seconds integer check(duration_seconds is null or duration_seconds>0),
 current_attempt integer not null default 0 check(current_attempt>=0), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(pair_id,session_number)
);
create unique index pair_unique_topic_idx on conversation_sessions(pair_id,topic_id) where topic_id is not null;

create table session_attempts (
 id uuid primary key default gen_random_uuid(), session_id uuid not null references conversation_sessions(id) on delete cascade,
 attempt_number integer not null check(attempt_number>0), reported_duration_seconds integer check(reported_duration_seconds is null or reported_duration_seconds>0),
 result session_status not null, notes text, created_at timestamptz not null default now(), unique(session_id,attempt_number)
);

create table reviews (
 id uuid primary key default gen_random_uuid(), pair_id uuid not null references pairs(id), stage review_stage not null,
 decision review_decision not null, notes text, external_reference text, actor_user_id uuid references auth.users(id),
 created_at timestamptz not null default now()
);

create table referral_relationships (
 id uuid primary key default gen_random_uuid(), referrer_participant_id uuid not null references participants(id),
 referred_participant_id uuid not null unique references participants(id), code text not null, created_at timestamptz not null default now(),
 check(referrer_participant_id<>referred_participant_id)
);
create table referral_commissions (
 id uuid primary key default gen_random_uuid(), referral_id uuid not null references referral_relationships(id),
 pair_id uuid not null references pairs(id), amount_cents integer not null check(amount_cents>=0), currency text not null check(char_length(currency)=3),
 status referral_status not null default 'PENDING', created_at timestamptz not null default now(), unique(referral_id,pair_id)
);

create table payouts (
 id uuid primary key default gen_random_uuid(), participant_id uuid not null references participants(id), amount_cents integer not null check(amount_cents>0),
 currency text not null check(char_length(currency)=3), state payout_state not null default 'REQUESTED', provider text, external_reference text unique,
 idempotency_key text not null unique, failure_reason text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table ledger_entries (
 id uuid primary key default gen_random_uuid(), participant_id uuid references participants(id), pair_id uuid references pairs(id),
 referral_commission_id uuid references referral_commissions(id), payout_id uuid references payouts(id),
 entry_type ledger_entry_type not null, amount_cents integer not null check(amount_cents<>0), currency text not null check(char_length(currency)=3),
 idempotency_key text not null unique, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);

create table acquisition_campaigns (
 id uuid primary key default gen_random_uuid(), campaign_key text not null unique, name text not null, channel text not null,
 market_code text, active boolean not null default true, created_at timestamptz not null default now()
);
create table acquisition_spend (
 id uuid primary key default gen_random_uuid(), campaign_key text not null references acquisition_campaigns(campaign_key) on update cascade on delete restrict,
 spend_date date not null, amount_cents integer not null check(amount_cents>=0), impressions integer check(impressions is null or impressions>=0),
 clicks integer check(clicks is null or clicks>=0), notes text, created_at timestamptz not null default now(), unique(campaign_key,spend_date)
);
create table leads (
 id uuid primary key default gen_random_uuid(), email citext not null unique, market_code text not null default 'UNKNOWN',
 country_code text, detected_locale text, detected_languages text[] not null default '{}', preferred_language_code text,
 marketing_consent boolean not null default false, source text, campaign_key text not null default 'organic', landing_path text, referrer text,
 fbclid text,gclid text,utm_source text,utm_medium text,utm_campaign text,utm_content text,utm_term text,
 status text not null default 'LEAD' check(status in('LEAD','CONVERTED','UNSUBSCRIBED')),
 converted_participant_id uuid references participants(id), converted_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index leads_market_idx on leads(market_code);
create index leads_campaign_idx on leads(campaign_key);
create index leads_status_idx on leads(status);
create index leads_created_idx on leads(created_at desc);

create table message_events (
 id uuid primary key default gen_random_uuid(), participant_id uuid references participants(id), pair_id uuid references pairs(id),
 channel text not null, template_key text not null, template_version integer not null default 1, status message_status not null,
 provider_reference text, error text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table outbox_events (
 id uuid primary key default gen_random_uuid(), event_type text not null, dedupe_key text not null unique, payload jsonb not null,
 status outbox_status not null default 'PENDING', attempts integer not null default 0 check(attempts>=0), next_attempt_at timestamptz,
 last_error text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table admin_memberships (
 user_id uuid primary key references auth.users(id) on delete cascade, role admin_role not null, active boolean not null default true,
 created_at timestamptz not null default now()
);
create table activity_events (
 id uuid primary key default gen_random_uuid(), occurred_at timestamptz not null default now(), actor_type text not null,
 actor_user_id uuid references auth.users(id), actor_participant_id uuid references participants(id), action text not null,
 entity_type text not null, entity_id uuid, campaign_id uuid references campaigns(id), pair_id uuid references pairs(id),
 request_id text, metadata jsonb not null default '{}'::jsonb, success boolean not null default true, failure_code text
);
create index activity_pair_idx on activity_events(pair_id,occurred_at desc);
create index activity_campaign_idx on activity_events(campaign_id,occurred_at desc);

create table audit_events (
 id uuid primary key default gen_random_uuid(), occurred_at timestamptz not null default now(),
 actor_user_id uuid references auth.users(id), actor_label text, role admin_role, operation text not null,
 resource_type text not null, resource_id uuid, before_data jsonb, after_data jsonb, reason text, request_id text, integrity_hash text not null
);
create table idempotency_records (
 key text primary key, operation text not null, response jsonb, created_at timestamptz not null default now()
);

create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at=now(); return new; end $$;
create trigger campaigns_updated before update on campaigns for each row execute function set_updated_at();
create trigger participants_updated before update on participants for each row execute function set_updated_at();
create trigger enrollments_updated before update on campaign_enrollments for each row execute function set_updated_at();
create trigger pairs_updated before update on pairs for each row execute function set_updated_at();
create trigger credential_bundles_updated before update on credential_bundles for each row execute function set_updated_at();
create trigger sessions_updated before update on conversation_sessions for each row execute function set_updated_at();
create trigger payouts_updated before update on payouts for each row execute function set_updated_at();
create trigger leads_updated before update on leads for each row execute function set_updated_at();
create trigger messages_updated before update on message_events for each row execute function set_updated_at();
create trigger outbox_updated before update on outbox_events for each row execute function set_updated_at();

create or replace function protect_published_campaign_version() returns trigger language plpgsql as $$
begin
 if tg_op='DELETE' and old.status='PUBLISHED' then raise exception 'published_campaign_version_is_immutable'; end if;
 if tg_op='UPDATE' and old.status='PUBLISHED' then
  if new.status not in('PUBLISHED','RETIRED') then raise exception 'invalid_published_version_transition'; end if;
  if (to_jsonb(new)-array['status','published_at'])<>(to_jsonb(old)-array['status','published_at']) then raise exception 'published_campaign_terms_are_immutable'; end if;
 end if;
 return case when tg_op='DELETE' then old else new end;
end $$;
create trigger campaign_version_guard before update or delete on campaign_versions for each row execute function protect_published_campaign_version();

create or replace function pair_transition_allowed(p_from pair_state,p_to pair_state) returns boolean language sql immutable as $$
select case p_from
 when 'PARTNER_PENDING' then p_to in('PAIRED','CANCELLED','ON_HOLD')
 when 'PAIRED' then p_to in('READINESS_PENDING','CANCELLED','ON_HOLD')
 when 'READINESS_PENDING' then p_to in('READY','CANCELLED','ON_HOLD')
 when 'READY' then p_to in('RECORDING','CANCELLED','ON_HOLD')
 when 'RECORDING' then p_to in('SUBMITTED','REWORK_REQUIRED','CANCELLED','ON_HOLD')
 when 'SUBMITTED' then p_to in('INTERNAL_QA','ON_HOLD')
 when 'INTERNAL_QA' then p_to in('CLIENT_QA','REWORK_REQUIRED','REJECTED','ON_HOLD')
 when 'CLIENT_QA' then p_to in('APPROVED','REWORK_REQUIRED','REJECTED','ON_HOLD')
 when 'REWORK_REQUIRED' then p_to in('RECORDING','SUBMITTED','CANCELLED','ON_HOLD')
 when 'APPROVED' then p_to in('PAYABLE','ON_HOLD')
 when 'PAYABLE' then p_to in('PAID','PAYMENT_FAILED','ON_HOLD')
 when 'PAYMENT_FAILED' then p_to in('PAYABLE','PAID','ON_HOLD')
 when 'ON_HOLD' then p_to in('PARTNER_PENDING','PAIRED','READINESS_PENDING','READY','RECORDING','SUBMITTED','INTERNAL_QA','CLIENT_QA','REWORK_REQUIRED','APPROVED','PAYABLE','CANCELLED')
 else false end $$;
create or replace function guard_pair_transition() returns trigger language plpgsql as $$
begin
 if old.state<>new.state and not pair_transition_allowed(old.state,new.state) then raise exception 'invalid_pair_transition:%->%',old.state,new.state; end if;
 return new;
end $$;
create trigger pair_state_guard before update of state on pairs for each row execute function guard_pair_transition();

create or replace function immutable_financial_audit_rows() returns trigger language plpgsql as $$ begin raise exception 'immutable_record'; end $$;
create trigger ledger_immutable before update or delete on ledger_entries for each row execute function immutable_financial_audit_rows();
create trigger audit_immutable before update or delete on audit_events for each row execute function immutable_financial_audit_rows();

create or replace function set_audit_hash() returns trigger language plpgsql as $$
begin
 new.integrity_hash=encode(digest(coalesce(new.actor_label,'')||'|'||new.operation||'|'||new.resource_type||'|'||
 coalesce(new.resource_id::text,'')||'|'||coalesce(new.before_data::text,'')||'|'||coalesce(new.after_data::text,'')||'|'||
 coalesce(new.reason,'')||'|'||new.occurred_at::text,'sha256'),'hex'); return new;
end $$;
create trigger audit_hash before insert on audit_events for each row execute function set_audit_hash();

create or replace function upsert_public_lead(
 p_email text,p_market_code text default 'UNKNOWN',p_consent boolean default false,p_detected_locale text default null,
 p_detected_languages text[] default '{}',p_source text default null,p_campaign_key text default 'organic',
 p_landing_path text default null,p_referrer text default null,p_fbclid text default null,p_gclid text default null,
 p_utm_source text default null,p_utm_medium text default null,p_utm_campaign text default null,p_utm_content text default null,p_utm_term text default null
) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_email citext:=lower(trim(coalesce(p_email,''))); v_market text:=upper(trim(coalesce(p_market_code,'UNKNOWN')));
 v_lang text:=lower(split_part(replace(coalesce(p_detected_locale,''),'_','-'),'-',1)); v_existing uuid;
begin
 if v_email::text !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'invalid_email'; end if;
 if p_consent is not true then raise exception 'consent_required'; end if;
 if v_market not in('US','ES','IT','AU','GB','MX','AR','CO') then v_market:='UNKNOWN'; end if;
 if v_lang='' then v_lang:=null; end if;
 select id into v_existing from leads where email=v_email;
 insert into leads(email,market_code,country_code,detected_locale,detected_languages,preferred_language_code,marketing_consent,source,campaign_key,landing_path,referrer,fbclid,gclid,utm_source,utm_medium,utm_campaign,utm_content,utm_term)
 values(v_email,v_market,nullif(v_market,'UNKNOWN'),nullif(left(coalesce(p_detected_locale,''),40),''),coalesce(p_detected_languages,'{}'),v_lang,true,left(p_source,200),left(coalesce(p_campaign_key,'organic'),120),left(p_landing_path,500),left(p_referrer,1000),left(p_fbclid,255),left(p_gclid,255),left(p_utm_source,255),left(p_utm_medium,255),left(p_utm_campaign,255),left(p_utm_content,255),left(p_utm_term,255))
 on conflict(email) do update set market_code=excluded.market_code,country_code=excluded.country_code,detected_locale=excluded.detected_locale,
 detected_languages=excluded.detected_languages,preferred_language_code=excluded.preferred_language_code,marketing_consent=true,
 source=excluded.source,campaign_key=excluded.campaign_key,landing_path=excluded.landing_path,referrer=excluded.referrer,fbclid=excluded.fbclid,
 gclid=excluded.gclid,utm_source=excluded.utm_source,utm_medium=excluded.utm_medium,utm_campaign=excluded.utm_campaign,
 utm_content=excluded.utm_content,utm_term=excluded.utm_term,status=case when leads.status='CONVERTED' then 'CONVERTED' else 'LEAD' end;
 return jsonb_build_object('ok',true,'existing',v_existing is not null,'marketCode',v_market,'languageCode',v_lang);
end $$;

create or replace function register_campaign_participant(
 p_campaign_slug text,p_first_name text,p_email text,p_phone text,p_country_code text,p_language_code text,
 p_is_18_plus boolean,p_consent boolean,p_referral_code text default null
) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_campaign campaigns%rowtype; v_version campaign_versions%rowtype; v_participant participants%rowtype;
 v_enrollment campaign_enrollments%rowtype; v_pair pairs%rowtype; v_referrer uuid;
begin
 if trim(coalesce(p_first_name,''))='' then raise exception 'first_name_required'; end if;
 if lower(trim(coalesce(p_email,''))) !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'invalid_email'; end if;
 if p_is_18_plus is not true then raise exception 'age_requirement'; end if;
 if p_consent is not true then raise exception 'consent_required'; end if;
 select * into v_campaign from campaigns where slug=p_campaign_slug and active=true;
 if not found then raise exception 'campaign_unavailable'; end if;
 select * into v_version from campaign_versions where campaign_id=v_campaign.id and status='PUBLISHED';
 if not found then raise exception 'campaign_not_published'; end if;
 if upper(p_country_code)<>upper(v_version.country_code) or lower(p_language_code)<>lower(v_version.language_code) then raise exception 'campaign_eligibility_mismatch'; end if;
 insert into participants(first_name,email,phone,country_code,primary_language_code,marketing_consent)
 values(trim(p_first_name),lower(trim(p_email)),nullif(trim(coalesce(p_phone,'')),''),upper(p_country_code),lower(p_language_code),true)
 on conflict(email) do update set first_name=excluded.first_name,phone=coalesce(excluded.phone,participants.phone),country_code=excluded.country_code,
 primary_language_code=excluded.primary_language_code,marketing_consent=true returning * into v_participant;
 if exists(select 1 from campaign_enrollments where campaign_id=v_campaign.id and participant_id=v_participant.id) then raise exception 'already_enrolled_in_campaign'; end if;
 insert into campaign_enrollments(campaign_id,campaign_version_id,participant_id,state,eligibility,accepted_terms_at)
 values(v_campaign.id,v_version.id,v_participant.id,'QUALIFIED',jsonb_build_object('age18Plus',true,'countryCode',upper(p_country_code),'languageCode',lower(p_language_code)),now())
 returning * into v_enrollment;
 insert into pairs(campaign_id,campaign_version_id,state) values(v_campaign.id,v_version.id,'PARTNER_PENDING') returning * into v_pair;
 insert into pair_members(pair_id,enrollment_id,role,share_basis_points) values(v_pair.id,v_enrollment.id,'A',5000);
 if nullif(trim(coalesce(p_referral_code,'')),'') is not null then
  select id into v_referrer from participants where public_code=upper(trim(p_referral_code));
  if v_referrer is not null and v_referrer<>v_participant.id then
   insert into referral_relationships(referrer_participant_id,referred_participant_id,code)
   values(v_referrer,v_participant.id,upper(trim(p_referral_code))) on conflict(referred_participant_id) do nothing;
  end if;
 end if;
 insert into leads(email,market_code,country_code,preferred_language_code,marketing_consent,status,converted_participant_id,converted_at)
 values(v_participant.email,v_version.market_code,v_version.country_code,v_version.language_code,true,'CONVERTED',v_participant.id,now())
 on conflict(email) do update set status='CONVERTED',converted_participant_id=v_participant.id,converted_at=now();
 insert into activity_events(actor_type,actor_participant_id,action,entity_type,entity_id,campaign_id,pair_id)
 values('PARTICIPANT',v_participant.id,'CAMPAIGN_REGISTERED','PAIR',v_pair.id,v_campaign.id,v_pair.id);
 return jsonb_build_object('ok',true,'participantCode',v_participant.public_code,'pairCode',v_pair.public_code,'inviteCode',v_pair.invite_code);
end $$;

create or replace function join_pair_invite(
 p_invite_code text,p_first_name text,p_email text,p_phone text,p_country_code text,p_language_code text,p_is_18_plus boolean,p_consent boolean
) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_pair pairs%rowtype; v_version campaign_versions%rowtype; v_participant participants%rowtype;
 v_enrollment campaign_enrollments%rowtype; v_a_participant uuid;
begin
 if p_is_18_plus is not true or p_consent is not true then raise exception 'eligibility_confirmation_required'; end if;
 select * into v_pair from pairs where invite_code=upper(trim(p_invite_code)) for update;
 if not found or v_pair.state<>'PARTNER_PENDING' then raise exception 'invite_unavailable'; end if;
 select * into v_version from campaign_versions where id=v_pair.campaign_version_id;
 if upper(p_country_code)<>upper(v_version.country_code) or lower(p_language_code)<>lower(v_version.language_code) then raise exception 'campaign_eligibility_mismatch'; end if;
 select e.participant_id into v_a_participant from pair_members pm join campaign_enrollments e on e.id=pm.enrollment_id
 where pm.pair_id=v_pair.id and pm.role='A' and pm.active=true;
 insert into participants(first_name,email,phone,country_code,primary_language_code,marketing_consent)
 values(trim(p_first_name),lower(trim(p_email)),nullif(trim(coalesce(p_phone,'')),''),upper(p_country_code),lower(p_language_code),true)
 on conflict(email) do update set first_name=excluded.first_name,phone=coalesce(excluded.phone,participants.phone),country_code=excluded.country_code,
 primary_language_code=excluded.primary_language_code,marketing_consent=true returning * into v_participant;
 if v_participant.id=v_a_participant then raise exception 'participant_cannot_pair_with_self'; end if;
 if exists(select 1 from campaign_enrollments where campaign_id=v_pair.campaign_id and participant_id=v_participant.id) then raise exception 'already_enrolled_in_campaign'; end if;
 insert into campaign_enrollments(campaign_id,campaign_version_id,participant_id,state,eligibility,accepted_terms_at)
 values(v_pair.campaign_id,v_pair.campaign_version_id,v_participant.id,'QUALIFIED',jsonb_build_object('age18Plus',true,'countryCode',upper(p_country_code),'languageCode',lower(p_language_code)),now())
 returning * into v_enrollment;
 insert into pair_members(pair_id,enrollment_id,role,share_basis_points) values(v_pair.id,v_enrollment.id,'B',5000);
 update pairs set state='PAIRED',paired_at=now() where id=v_pair.id;
 insert into activity_events(actor_type,actor_participant_id,action,entity_type,entity_id,campaign_id,pair_id)
 values('PARTICIPANT',v_participant.id,'PAIR_FORMED','PAIR',v_pair.id,v_pair.campaign_id,v_pair.id);
 return jsonb_build_object('ok',true,'participantCode',v_participant.public_code,'pairCode',v_pair.public_code);
end $$;

create or replace function assign_next_credential_bundle(p_pair_id uuid,p_actor_label text default 'SYSTEM')
returns uuid language plpgsql security definer set search_path=public as $$
declare v_pair pairs%rowtype; v_bundle credential_bundles%rowtype; v_assignment uuid;
begin
 select * into v_pair from pairs where id=p_pair_id for update;
 if not found then raise exception 'pair_not_found'; end if;
 if v_pair.state<>'READY' then raise exception 'pair_not_ready'; end if;
 if exists(select 1 from credential_assignments where pair_id=p_pair_id) then
  select id into v_assignment from credential_assignments where pair_id=p_pair_id; return v_assignment;
 end if;
 select * into v_bundle from credential_bundles where campaign_id=v_pair.campaign_id and status='AVAILABLE'
 order by created_at,id for update skip locked limit 1;
 if not found then raise exception 'credential_inventory_exhausted'; end if;
 update credential_bundles set status='RESERVED' where id=v_bundle.id;
 insert into credential_assignments(pair_id,bundle_id) values(p_pair_id,v_bundle.id) returning id into v_assignment;
 insert into audit_events(actor_label,operation,resource_type,resource_id,reason)
 values(p_actor_label,'CREDENTIAL_RESERVED','PAIR',p_pair_id,'Automatic next-available credential reservation');
 return v_assignment;
end $$;

create or replace function approve_pair_and_create_earnings(p_pair_id uuid,p_idempotency_key text,p_actor_label text default 'SYSTEM')
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_pair pairs%rowtype; v_version campaign_versions%rowtype; v_member record; v_amount integer; v_total integer:=0;
begin
 if exists(select 1 from idempotency_records where key=p_idempotency_key and operation='APPROVE_PAIR') then
  return(select response from idempotency_records where key=p_idempotency_key);
 end if;
 select * into v_pair from pairs where id=p_pair_id for update;
 if not found then raise exception 'pair_not_found'; end if;
 if v_pair.state not in('CLIENT_QA','APPROVED','PAYABLE') then raise exception 'pair_not_awaiting_client_approval'; end if;
 select * into v_version from campaign_versions where id=v_pair.campaign_version_id;
 if v_pair.state='CLIENT_QA' then update pairs set state='APPROVED',approved_at=now() where id=p_pair_id; end if;
 for v_member in select pm.role,pm.share_basis_points,e.participant_id
  from pair_members pm join campaign_enrollments e on e.id=pm.enrollment_id
  where pm.pair_id=p_pair_id and pm.active=true order by pm.role
 loop
  v_amount:=round(v_version.pair_compensation_cents*v_member.share_basis_points/10000.0); v_total:=v_total+v_amount;
  insert into ledger_entries(participant_id,pair_id,entry_type,amount_cents,currency,idempotency_key,metadata)
  values(v_member.participant_id,p_pair_id,'CAMPAIGN_EARNING',v_amount,v_version.currency,p_idempotency_key||':'||v_member.role,jsonb_build_object('shareBps',v_member.share_basis_points))
  on conflict(idempotency_key) do nothing;
 end loop;
 if v_total<>v_version.pair_compensation_cents then raise exception 'pair_share_total_mismatch'; end if;
 if (select state from pairs where id=p_pair_id)='APPROVED' then update pairs set state='PAYABLE' where id=p_pair_id; end if;
 insert into audit_events(actor_label,operation,resource_type,resource_id,reason)
 values(p_actor_label,'PAIR_APPROVED_EARNINGS_CREATED','PAIR',p_pair_id,'Client approval created participant earnings');
 insert into idempotency_records(key,operation,response)
 values(p_idempotency_key,'APPROVE_PAIR',jsonb_build_object('ok',true,'pairId',p_pair_id,'amountCents',v_total))
 on conflict(key) do nothing;
 return jsonb_build_object('ok',true,'pairId',p_pair_id,'amountCents',v_total);
end $$;

alter table participants enable row level security;
alter table campaign_enrollments enable row level security;
alter table pairs enable row level security;
alter table pair_members enable row level security;
alter table conversation_sessions enable row level security;
alter table session_attempts enable row level security;
alter table reviews enable row level security;
alter table payouts enable row level security;
alter table ledger_entries enable row level security;
alter table credential_bundles enable row level security;
alter table credential_accounts enable row level security;
alter table credential_assignments enable row level security;
alter table leads enable row level security;
alter table acquisition_campaigns enable row level security;
alter table acquisition_spend enable row level security;
alter table admin_memberships enable row level security;
alter table activity_events enable row level security;
alter table audit_events enable row level security;

create policy participant_read_self on participants for select using(auth.uid()=auth_user_id);
create policy participant_update_self on participants for update using(auth.uid()=auth_user_id) with check(auth.uid()=auth_user_id);
create policy enrollment_read_self on campaign_enrollments for select using(exists(select 1 from participants p where p.id=participant_id and p.auth_user_id=auth.uid()));
create policy pair_read_member on pairs for select using(exists(
 select 1 from pair_members pm join campaign_enrollments e on e.id=pm.enrollment_id join participants p on p.id=e.participant_id
 where pm.pair_id=pairs.id and pm.active=true and p.auth_user_id=auth.uid()
));
create policy session_read_member on conversation_sessions for select using(exists(
 select 1 from pair_members pm join campaign_enrollments e on e.id=pm.enrollment_id join participants p on p.id=e.participant_id
 where pm.pair_id=conversation_sessions.pair_id and pm.active=true and p.auth_user_id=auth.uid()
));
create policy ledger_read_self on ledger_entries for select using(exists(select 1 from participants p where p.id=participant_id and p.auth_user_id=auth.uid()));
create policy payout_read_self on payouts for select using(exists(select 1 from participants p where p.id=participant_id and p.auth_user_id=auth.uid()));

revoke all on all tables in schema public from anon;
revoke all on credential_bundles,credential_accounts,credential_assignments,audit_events from authenticated;
grant select,update on participants to authenticated;
grant select on campaign_enrollments,pairs,pair_members,conversation_sessions,session_attempts,reviews,payouts,ledger_entries to authenticated;
grant execute on function upsert_public_lead(text,text,boolean,text,text[],text,text,text,text,text,text,text,text,text,text,text) to anon,authenticated;
grant execute on function register_campaign_participant(text,text,text,text,text,text,boolean,boolean,text) to anon,authenticated;
grant execute on function join_pair_invite(text,text,text,text,text,text,boolean,boolean) to anon,authenticated;
revoke all on function assign_next_credential_bundle(uuid,text) from public,anon,authenticated;
revoke all on function approve_pair_and_create_earnings(uuid,text,text) from public,anon,authenticated;

insert into campaigns(slug,name,active) values
 ('es-spain-v1','Spain Spanish Conversation Recording',true),
 ('us-english-v1','U.S. English Conversation Recording',true);

with c as(select id from campaigns where slug='es-spain-v1')
insert into campaign_versions(campaign_id,version,status,market_code,country_code,language_code,native_region,sessions_required,target_seconds_min,target_seconds_max,hard_seconds_min,hard_seconds_max,repeat_participation_allowed,currency,pair_compensation_cents,client_revenue_cents,referral_commission_cents,invitation_code_mode,default_invitation_code,invitation_code_scope_confirmed,rules,published_at)
select id,1,'PUBLISHED','ES','ES','es','Spain',7,1260,1320,1201,1439,false,'USD',5000,7500,0,'CAMPAIGN_DEFAULT','D43LH547F3',false,
 '{"openingPhrase":"MagicData sound recording","maxSilenceSeconds":40,"maxMonologueSeconds":60,"headphonesAllowed":false,"chargingAllowed":false,"screenOffAllowed":false,"otherAppsAllowed":false,"politicsAllowed":false,"religionAllowed":false,"topicMix":{"expertPct":60,"casualPct":40,"scope":"UNCONFIRMED"}}'::jsonb,now() from c;

with c as(select id from campaigns where slug='us-english-v1')
insert into campaign_versions(campaign_id,version,status,market_code,country_code,language_code,native_region,sessions_required,target_seconds_min,target_seconds_max,hard_seconds_min,hard_seconds_max,repeat_participation_allowed,currency,pair_compensation_cents,client_revenue_cents,referral_commission_cents,invitation_code_mode,invitation_code_scope_confirmed,rules,published_at)
select id,1,'PUBLISHED','US','US','en','United States',7,1260,1320,1201,1439,false,'USD',6000,null,0,'NONE',false,'{}'::jsonb,now() from c;

with v as(select cv.id from campaign_versions cv join campaigns c on c.id=cv.campaign_id where c.slug='es-spain-v1' and cv.version=1)
insert into topics(campaign_version_id,topic_group,name,details,sensitive)
select v.id,x.grp::topic_group,x.name,x.details,x.sensitive from v cross join(values
 ('EXPERT','Educational Training','Education planning, adult education, family education, early-childhood education and studying abroad.',false),
 ('EXPERT','Career Development','Career planning, professional development and entrepreneurship.',false),
 ('EXPERT','Economic & Business','Saving, finance, enterprise, banking, insurance and business development.',false),
 ('EXPERT','Medical & Health','General health experiences, fitness, healthy routines and healthcare experiences; avoid diagnosis or personalized treatment.',false),
 ('EXPERT','Sports','Sports, events and sports experiences.',false),
 ('EXPERT','Humanities & Science','History, civilization, language, nature, science, engineering, technology and philosophy; religion is excluded.',false),
 ('EXPERT','Geographic & Nature','Continents, countries, cities, animals, plants and adventures.',false),
 ('EXPERT','Art & Fine Arts','Architecture, music, fine arts, literature, crafts and fashion.',false),
 ('EXPERT','Digital Products','Electronic and innovative products.',false),
 ('EXPERT','Laws & Regulations','General legal provisions, administrative regulations and judicial systems; avoid political advocacy and sensitive personal cases.',true),
 ('EXPERT','Environment','Climate, weather, natural disasters and pollution.',false),
 ('CASUAL','Media','Movies, TV, video games, reading, audio-visual media and music experiences.',false),
 ('CASUAL','Personality & Characteristics','Leadership, responsibility, habits, appearance and personality traits.',false),
 ('CASUAL','Relationships','Healthy relationships, boundaries, respect and conflict resolution; avoid restricted intimate topics.',false),
 ('CASUAL','Lifestyle','Family, pets, decoration, accommodation, sleep, dressing, travel and dining.',false),
 ('CASUAL','Entertainment','Events and everyday entertainment discussions; avoid sensitive social or political topics.',true)
)as x(grp,name,details,sensitive);