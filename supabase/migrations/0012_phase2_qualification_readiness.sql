-- Phase 2 slice 1-3: eligibility evidence, versioned voice qualification, pair readiness.
create type voice_sample_status as enum ('NOT_STARTED','RECORDED','PROCESSING','REVIEW_PENDING','PASSED','RETEST_REQUIRED','FAILED');
create type readiness_gate_status as enum ('PENDING','PASSED','BLOCKED','WAIVED');

create table voice_sample_prompts(
 id uuid primary key default gen_random_uuid(),
 campaign_version_id uuid references campaign_versions(id),
 language_code text not null,
 version integer not null check(version>0),
 prompt_text text not null,
 active boolean not null default true,
 created_at timestamptz not null default now(),
 unique(campaign_version_id,language_code,version)
);

create table voice_samples(
 id uuid primary key default gen_random_uuid(),
 participant_id uuid not null references participants(id),
 campaign_id uuid references campaigns(id),
 campaign_version_id uuid references campaign_versions(id),
 prompt_id uuid not null references voice_sample_prompts(id),
 version integer not null check(version>0),
 status voice_sample_status not null default 'NOT_STARTED',
 storage_reference text,
 duration_ms integer check(duration_ms is null or duration_ms>0),
 content_type text,
 sha256 text,
 device_metadata jsonb not null default '{}'::jsonb,
 qa_metadata jsonb not null default '{}'::jsonb,
 reviewer_user_id uuid references auth.users(id),
 decision_reason text,
 recorded_at timestamptz,
 reviewed_at timestamptz,
 created_at timestamptz not null default now(),
 unique(participant_id,prompt_id,version)
);
create index voice_samples_participant_idx on voice_samples(participant_id,created_at desc);

create table eligibility_evaluations(
 id uuid primary key default gen_random_uuid(),
 participant_id uuid not null references participants(id),
 campaign_id uuid not null references campaigns(id),
 campaign_version_id uuid not null references campaign_versions(id),
 eligible boolean not null,
 rule_version text not null,
 facts jsonb not null,
 results jsonb not null,
 evaluated_at timestamptz not null default now(),
 unique(participant_id,campaign_version_id,rule_version)
);

create table pair_readiness_gates(
 id uuid primary key default gen_random_uuid(),
 pair_id uuid not null references pairs(id) on delete cascade,
 gate_key text not null check(gate_key in('PARTNER_ACCEPTED','ELIGIBILITY_A','ELIGIBILITY_B','SAMPLE_A','SAMPLE_B','CONSENT_A','CONSENT_B','PARTICIPATION_HISTORY','CAPACITY','CREDENTIAL')),
 status readiness_gate_status not null default 'PENDING',
 evidence jsonb not null default '{}'::jsonb,
 checked_at timestamptz,
 updated_at timestamptz not null default now(),
 unique(pair_id,gate_key)
);

create table capacity_reservations(
 id uuid primary key default gen_random_uuid(),
 campaign_id uuid not null references campaigns(id),
 campaign_version_id uuid not null references campaign_versions(id),
 pair_id uuid not null unique references pairs(id),
 status text not null default 'RESERVED' check(status in('RESERVED','CONSUMED','RELEASED','EXPIRED')),
 reserved_at timestamptz not null default now(),
 expires_at timestamptz,
 released_at timestamptz,
 idempotency_key text not null unique
);

create trigger pair_readiness_updated before update on pair_readiness_gates for each row execute function set_updated_at();

create or replace function next_voice_sample_version(p_participant uuid,p_prompt uuid)
returns integer language sql stable as $$
 select coalesce(max(version),0)+1 from voice_samples where participant_id=p_participant and prompt_id=p_prompt
$$;

create or replace function evaluate_pair_readiness(p_pair_id uuid,p_actor_label text default 'SYSTEM')
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_pair pairs%rowtype; v_missing text[]; v_ready boolean;
begin
 select * into v_pair from pairs where id=p_pair_id for update;
 if not found then raise exception 'pair_not_found'; end if;
 if v_pair.state not in('PAIRED','READINESS_PENDING','READY') then raise exception 'pair_not_in_readiness'; end if;

 select array_agg(req.gate_key order by req.gate_key) into v_missing
 from (values('PARTNER_ACCEPTED'),('ELIGIBILITY_A'),('ELIGIBILITY_B'),('SAMPLE_A'),('SAMPLE_B'),
             ('CONSENT_A'),('CONSENT_B'),('PARTICIPATION_HISTORY'),('CAPACITY'),('CREDENTIAL')) req(gate_key)
 left join pair_readiness_gates g on g.pair_id=p_pair_id and g.gate_key=req.gate_key and g.status in('PASSED','WAIVED')
 where g.id is null;
 v_ready:=coalesce(array_length(v_missing,1),0)=0;

 if v_ready and v_pair.state<>'READY' then
   if v_pair.state='PAIRED' then update pairs set state='READINESS_PENDING' where id=p_pair_id; end if;
   update pairs set state='READY' where id=p_pair_id;
 elsif not v_ready and v_pair.state='PAIRED' then
   update pairs set state='READINESS_PENDING' where id=p_pair_id;
 end if;

 insert into activity_events(actor_type,action,entity_type,entity_id,campaign_id,pair_id,metadata)
 values('SYSTEM','PAIR_READINESS_EVALUATED','PAIR',p_pair_id,v_pair.campaign_id,p_pair_id,
        jsonb_build_object('ready',v_ready,'missing',coalesce(to_jsonb(v_missing),'[]'::jsonb)));
 return jsonb_build_object('ready',v_ready,'missing',coalesce(to_jsonb(v_missing),'[]'::jsonb));
end $$;

alter table voice_sample_prompts enable row level security;
alter table voice_samples enable row level security;
alter table eligibility_evaluations enable row level security;
alter table pair_readiness_gates enable row level security;
alter table capacity_reservations enable row level security;

create policy voice_samples_read_self on voice_samples for select using(
 exists(select 1 from participants p where p.id=participant_id and p.auth_user_id=auth.uid())
);
create policy eligibility_read_self on eligibility_evaluations for select using(
 exists(select 1 from participants p where p.id=participant_id and p.auth_user_id=auth.uid())
);
revoke all on pair_readiness_gates,capacity_reservations from anon,authenticated;
grant select on voice_sample_prompts to authenticated;
grant select on voice_samples,eligibility_evaluations to authenticated;
revoke all on function evaluate_pair_readiness(uuid,text) from public,anon,authenticated;
