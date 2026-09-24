-- Forward repair for databases that already applied the early-access RPC
-- while preserving clean installs that use leads.campaign_key.
alter table public.leads add column if not exists campaign_key text;

do $$
begin
  if exists(
    select 1 from information_schema.columns
    where table_schema='public' and table_name='leads' and column_name='marketing_campaign_key'
  ) then
    execute 'update public.leads set campaign_key=coalesce(campaign_key,marketing_campaign_key) where campaign_key is null';
  end if;
end $$;

do $$
declare
  v_signature regprocedure;
  v_definition text;
begin
  v_signature:=to_regprocedure(
    'public.upsert_public_lead_v3_base(text,text,text,text,boolean,text,text[],text,text,text,text,text,text,text,text,text,text,text,text,text,text)'
  );
  if v_signature is not null then
    select pg_get_functiondef(v_signature) into v_definition;
    if position('marketing_campaign_key' in v_definition)>0 then
      execute replace(v_definition,'marketing_campaign_key','campaign_key');
    end if;
  end if;
end $$;
