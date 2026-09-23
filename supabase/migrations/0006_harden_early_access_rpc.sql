-- Only the wrapper is part of the public signup API. The implementation
-- function must never be callable directly by API roles.
revoke all on function public.upsert_public_lead_v3_base(
  text,text,text,text,boolean,text,text[],text,text,text,text,text,text,text,text,text,text,text,text,text,text
) from public, anon, authenticated;

create index if not exists early_access_email_outbox_lead_idx
  on public.early_access_email_outbox(lead_id);
