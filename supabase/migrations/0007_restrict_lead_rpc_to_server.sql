-- Public signup reaches Supabase through the server route. Do not expose the
-- SECURITY DEFINER implementation to browser/API roles.
revoke all on function public.upsert_public_lead_v3(
  text,text,text,text,boolean,text,text[],text,text,text,text,text,text,text,text,text,text,text,text,text,text
) from public, anon, authenticated;
grant execute on function public.upsert_public_lead_v3(
  text,text,text,text,boolean,text,text[],text,text,text,text,text,text,text,text,text,text,text,text,text,text
) to service_role;
