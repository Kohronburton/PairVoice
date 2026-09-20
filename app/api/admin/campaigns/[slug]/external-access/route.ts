import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const db = getDb();
  if (!db) return NextResponse.json({ error: 'Not configured' }, { status: 503 });

  const { slug } = await params;
  const { data: campaign, error: campaignError } = await db
    .from('campaigns')
    .select('id,slug,name')
    .eq('slug', slug)
    .maybeSingle();

  if (campaignError) throw campaignError;
  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });

  const { data, error } = await db
    .from('campaign_external_access')
    .select('provider,invitation_code,reveal_state,updated_at')
    .eq('campaign_id', campaign.id)
    .maybeSingle();

  if (error) throw error;

  return NextResponse.json({
    campaign: { slug: campaign.slug, name: campaign.name },
    externalAccess: data
      ? {
          provider: data.provider,
          invitationCode: data.invitation_code,
          revealState: data.reveal_state,
          updatedAt: data.updated_at,
        }
      : null,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const db = getDb();
    if (!db) return NextResponse.json({ error: 'Not configured' }, { status: 503 });

    const { slug } = await params;
    const body = await req.json();
    const provider = String(body.provider || '').trim().toUpperCase();
    const invitationCode = String(body.invitationCode || '').trim().toUpperCase();
    const revealState = String(body.revealState || 'FUNCROWD_SETUP').trim().toUpperCase();

    if (!provider) return NextResponse.json({ error: 'Provider is required.' }, { status: 400 });
    if (invitationCode.length < 4) {
      return NextResponse.json({ error: 'Invitation code must be at least 4 characters.' }, { status: 400 });
    }

    const { data: campaign, error: campaignError } = await db
      .from('campaigns')
      .select('id,slug,name')
      .eq('slug', slug)
      .maybeSingle();

    if (campaignError) throw campaignError;
    if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });

    const { data, error } = await db
      .from('campaign_external_access')
      .upsert(
        {
          campaign_id: campaign.id,
          provider,
          invitation_code: invitationCode,
          reveal_state: revealState,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'campaign_id' }
      )
      .select('provider,invitation_code,reveal_state,updated_at')
      .single();

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      campaign: { slug: campaign.slug, name: campaign.name },
      externalAccess: {
        provider: data.provider,
        invitationCode: data.invitation_code,
        revealState: data.reveal_state,
        updatedAt: data.updated_at,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Unable to update campaign external access.' }, { status: 500 });
  }
}
