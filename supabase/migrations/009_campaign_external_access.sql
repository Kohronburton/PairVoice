create table if not exists public.campaign_external_access (
  campaign_id uuid primary key references public.campaigns(id) on delete cascade,
  provider text not null,
  invitation_code text,
  reveal_state text not null default 'FUNCROWD_SETUP',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint campaign_external_access_provider_nonempty check (length(trim(provider)) > 0),
  constraint campaign_external_access_code_nonempty check (
    invitation_code is null or length(trim(invitation_code)) >= 4
  )
);

alter table public.campaign_external_access enable row level security;

comment on table public.campaign_external_access is
  'Campaign-level external-provider access settings. Invitation codes are shared by campaign, never by PairVoice pair, and are server/admin only.';

comment on column public.campaign_external_access.invitation_code is
  'External provider invitation code. Do not expose through public campaign reads.';

comment on column public.campaign_external_access.reveal_state is
  'Earliest operational workflow state at which the server may reveal the external invitation code to an eligible pair.';
