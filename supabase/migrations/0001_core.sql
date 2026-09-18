create extension if not exists pgcrypto;

create type workflow_state as enum ('APPLIED','SCREENING','MANUAL_REVIEW','QUALIFIED','PARTNER_PENDING','PAIRED','TRAINING','FUNCROWD_SETUP','FUNCROWD_TEST','READY','RECORDING','SUBMITTED','EXTERNAL_QA_PENDING','REWORK_REQUIRED','APPROVED','PAYMENT_DUE','PAID','WAITLISTED','REJECTED','ABANDONED','CREDENTIAL_HOLD','PAYMENT_FAILED');

create table campaigns (id uuid primary key default gen_random_uuid(), slug text unique not null, name text not null, active boolean not null default false, created_at timestamptz not null default now());
create table requirement_versions (id uuid primary key default gen_random_uuid(), campaign_id uuid not null references campaigns(id), version integer not null, status text not null check(status in('DRAFT','PUBLISHED','RETIRED')), config jsonb not null, published_at timestamptz, unique(campaign_id,version));
create table participants (id uuid primary key default gen_random_uuid(), campaign_id uuid not null references campaigns(id), requirement_version_id uuid not null references requirement_versions(id), user_id uuid references auth.users(id), public_code text unique not null, name text not null, email text, phone text, ui_locale text not null default 'es', state workflow_state not null default 'APPLIED', acquisition_source text, created_at timestamptz not null default now());
create table screening_responses (id uuid primary key default gen_random_uuid(), participant_id uuid not null references participants(id) on delete cascade, question_key text not null, answer jsonb not null, created_at timestamptz not null default now(), unique(participant_id,question_key));
create table voice_samples (id uuid primary key default gen_random_uuid(), participant_id uuid not null references participants(id), storage_path text not null, review_status text not null default 'PENDING' check(review_status in('PENDING','APPROVED','MANUAL_REVIEW','REJECTED')), reviewer_notes text, created_at timestamptz not null default now());
create table pairs (id uuid primary key default gen_random_uuid(), public_code text unique not null, campaign_id uuid not null references campaigns(id), requirement_version_id uuid not null references requirement_versions(id), participant_a uuid not null references participants(id), participant_b uuid not null references participants(id), state workflow_state not null default 'PAIRED', created_at timestamptz not null default now(), check(participant_a <> participant_b));
create table conversation_sessions (id uuid primary key default gen_random_uuid(), pair_id uuid not null references pairs(id) on delete cascade, session_number integer not null check(session_number between 1 and 50), reported_status text not null default 'NOT_STARTED' check(reported_status in('NOT_STARTED','REPORTED_SUCCESS','PROBLEM_REPORTED','REWORK_REQUIRED')), failure_reason text, reported_at timestamptz, unique(pair_id,session_number));
create table qa_reviews (id uuid primary key default gen_random_uuid(), pair_id uuid not null references pairs(id), decision text not null check(decision in('PENDING','APPROVED','REWORK_REQUIRED','REJECTED')), notes text, created_at timestamptz not null default now());
create table compensation_policies (id uuid primary key default gen_random_uuid(), campaign_id uuid not null references campaigns(id), version integer not null, currency text not null, pair_amount numeric(10,2) not null check(pair_amount>=0), unique(campaign_id,version));
create table payment_obligations (id uuid primary key default gen_random_uuid(), pair_id uuid not null references pairs(id), compensation_policy_id uuid not null references compensation_policies(id), amount numeric(10,2) not null, currency text not null, state text not null check(state in('PAYMENT_DUE','PROCESSING','PAID','PAYMENT_FAILED')), external_reference text, created_at timestamptz not null default now(), unique(pair_id,compensation_policy_id));
create table message_events (id uuid primary key default gen_random_uuid(), participant_id uuid references participants(id), pair_id uuid references pairs(id), template_key text not null, template_version integer not null default 1, channel text not null default 'WHATSAPP', status text not null check(status in('RECOMMENDED','OPENED_FOR_SEND','OPERATOR_CONFIRMED_SENT','SKIPPED','FAILED_TO_OPEN')), opened_at timestamptz, operator_confirmed_sent_at timestamptz, created_at timestamptz not null default now());
create table audit_events (id uuid primary key default gen_random_uuid(), actor_user_id uuid references auth.users(id), entity_type text not null, entity_id uuid, action text not null, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now());

alter table participants enable row level security;
alter table screening_responses enable row level security;
alter table voice_samples enable row level security;
alter table pairs enable row level security;
alter table conversation_sessions enable row level security;
alter table payment_obligations enable row level security;

create policy participant_read_self on participants for select using (auth.uid() = user_id);
create policy participant_update_self on participants for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy screening_self on screening_responses for all using (exists(select 1 from participants p where p.id=participant_id and p.user_id=auth.uid())) with check (exists(select 1 from participants p where p.id=participant_id and p.user_id=auth.uid()));
create policy voice_self_read on voice_samples for select using (exists(select 1 from participants p where p.id=participant_id and p.user_id=auth.uid()));
create policy pair_member_read on pairs for select using (exists(select 1 from participants p where p.user_id=auth.uid() and p.id in(participant_a,participant_b)));
create policy session_pair_read on conversation_sessions for select using (exists(select 1 from pairs x join participants p on p.id in(x.participant_a,x.participant_b) where x.id=pair_id and p.user_id=auth.uid()));

insert into campaigns(slug,name,active) values('spain-spanish','Spain Spanish',true);
with c as(select id from campaigns where slug='spain-spanish') insert into requirement_versions(campaign_id,version,status,config,published_at) select id,1,'PUBLISHED','{"recordingLanguage":"es-ES","nativeSpainSpanishRequired":true,"participantsPerPair":2,"sessions":7,"targetMinutesMin":21,"targetMinutesMax":22,"externalProvider":"FUNCROWD","priorSameProjectAllowed":false}'::jsonb,now() from c;
with c as(select id from campaigns where slug='spain-spanish') insert into compensation_policies(campaign_id,version,currency,pair_amount) select id,1,'USD',50 from c;
