-- The v3 function correctly linked the partner but reported the inviter's
-- timestamp when returning partnerJoined. Wrap it so the partner response
-- also reports the completed pair state.
alter function public.upsert_public_lead_v3(
  text,text,text,text,boolean,text,text[],text,text,text,text,text,text,text,text,text,text,text,text,text,text
) rename to upsert_public_lead_v3_base;

create or replace function public.upsert_public_lead_v3(
  p_email text, p_first_name text, p_market_code text, p_language_code text, p_consent boolean,
  p_detected_locale text, p_detected_languages text[], p_source text, p_campaign_key text,
  p_campaign_slug text, p_source_external_id text, p_landing_path text, p_referrer text,
  p_referral_code text, p_fbclid text, p_gclid text, p_utm_source text, p_utm_medium text,
  p_utm_campaign text, p_utm_content text, p_utm_term text
) returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_result jsonb;
begin
  v_result := public.upsert_public_lead_v3_base(
    p_email,p_first_name,p_market_code,p_language_code,p_consent,p_detected_locale,p_detected_languages,
    p_source,p_campaign_key,p_campaign_slug,p_source_external_id,p_landing_path,p_referrer,p_referral_code,
    p_fbclid,p_gclid,p_utm_source,p_utm_medium,p_utm_campaign,p_utm_content,p_utm_term
  );
  if nullif(trim(coalesce(p_referral_code,'')),'') is not null and v_result->>'referrerEmail' is not null then
    v_result := v_result || jsonb_build_object('partnerJoined',true);
  end if;
  return v_result;
end $$;

revoke all on function public.upsert_public_lead_v3(text,text,text,text,boolean,text,text[],text,text,text,text,text,text,text,text,text,text,text,text,text,text) from public;
grant execute on function public.upsert_public_lead_v3(text,text,text,text,boolean,text,text[],text,text,text,text,text,text,text,text,text,text,text,text,text,text) to anon,authenticated;
