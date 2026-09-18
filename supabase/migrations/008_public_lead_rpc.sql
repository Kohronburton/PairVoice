-- Secure public lead capture without exposing privileged database credentials.
create or replace function public.upsert_public_lead(
 p_email text,
 p_market_code text default 'UNKNOWN',
 p_consent boolean default false,
 p_detected_locale text default null,
 p_detected_languages text[] default '{}',
 p_source text default null,
 p_campaign_key text default 'organic',
 p_landing_path text default null,
 p_referrer text default null,
 p_fbclid text default null,
 p_gclid text default null,
 p_utm_source text default null,
 p_utm_medium text default null,
 p_utm_campaign text default null,
 p_utm_content text default null,
 p_utm_term text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
 v_email text:=lower(trim(coalesce(p_email,'')));
 v_market_code text:=upper(trim(coalesce(p_market_code,'UNKNOWN')));
 v_country text; v_country_code text; v_region_code text;
 v_language_code text; v_preferred_language text;
 v_existing_status text; v_existing_id uuid;
begin
 if v_email !~ '^\S+@\S+\.\S+$' then raise exception 'invalid_email'; end if;
 if p_consent is not true then raise exception 'consent_required'; end if;
 case v_market_code
  when 'US' then v_country:='United States';v_country_code:='US';v_region_code:='US';
  when 'ES' then v_country:='Spain';v_country_code:='ES';v_region_code:='ES';
  when 'IT' then v_country:='Italy';v_country_code:='IT';v_region_code:='IT';
  when 'AU' then v_country:='Australia';v_country_code:='AU';v_region_code:='AU';
  when 'GB' then v_country:='United Kingdom';v_country_code:='GB';v_region_code:='GB';
  when 'MX' then v_country:='Mexico';v_country_code:='MX';v_region_code:='MX';
  when 'AR' then v_country:='Argentina';v_country_code:='AR';v_region_code:='AR';
  when 'CO' then v_country:='Colombia';v_country_code:='CO';v_region_code:='CO';
  else v_market_code:='UNKNOWN';v_country:='Unknown';v_country_code:=null;v_region_code:=null;
 end case;
 v_language_code:=lower(split_part(coalesce(p_detected_locale,'en'),'-',1));
 if v_language_code='' then v_language_code:='en'; end if;
 v_preferred_language:=case v_language_code when 'es' then 'Spanish' when 'it' then 'Italian' when 'en' then 'English' else initcap(v_language_code) end;
 select id,status into v_existing_id,v_existing_status from leads where email=v_email;
 insert into leads(email,country,country_code,market_code,preferred_language,language_code,region_code,detected_locale,detected_languages,marketing_consent,source,campaign_key,landing_path,referrer,fbclid,gclid,utm_source,utm_medium,utm_campaign,utm_content,utm_term,updated_at,status)
 values(v_email,v_country,v_country_code,v_market_code,v_preferred_language,v_language_code,v_region_code,nullif(left(coalesce(p_detected_locale,''),40),''),coalesce((select array_agg(left(x,40)) from unnest(coalesce(p_detected_languages,'{}')) x),'{}'),true,left(p_source,200),left(coalesce(p_campaign_key,'organic'),120),left(p_landing_path,500),left(p_referrer,1000),left(p_fbclid,255),left(p_gclid,255),left(p_utm_source,255),left(p_utm_medium,255),left(p_utm_campaign,255),left(p_utm_content,255),left(p_utm_term,255),now(),coalesce(v_existing_status,'lead'))
 on conflict(email) do update set country=excluded.country,country_code=excluded.country_code,market_code=excluded.market_code,preferred_language=excluded.preferred_language,language_code=excluded.language_code,region_code=excluded.region_code,detected_locale=excluded.detected_locale,detected_languages=excluded.detected_languages,marketing_consent=true,source=excluded.source,campaign_key=excluded.campaign_key,landing_path=excluded.landing_path,referrer=excluded.referrer,fbclid=excluded.fbclid,gclid=excluded.gclid,utm_source=excluded.utm_source,utm_medium=excluded.utm_medium,utm_campaign=excluded.utm_campaign,utm_content=excluded.utm_content,utm_term=excluded.utm_term,updated_at=now(),status=case when leads.status='converted' then 'converted' else 'lead' end;
 return jsonb_build_object('ok',true,'existing',v_existing_id is not null,'marketCode',v_market_code,'preferredLanguage',v_preferred_language);
end;
$$;
revoke all on function public.upsert_public_lead(text,text,boolean,text,text[],text,text,text,text,text,text,text,text,text,text,text) from public;
grant execute on function public.upsert_public_lead(text,text,boolean,text,text[],text,text,text,text,text,text,text,text,text,text,text) to anon,authenticated;
