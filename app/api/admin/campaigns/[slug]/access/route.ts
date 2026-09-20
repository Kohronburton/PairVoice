import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';

const allowedRevealStates=new Set(['PARTNER_PENDING','PAIRED','READY','IN_PROGRESS']);

function db(){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 return url&&key?createClient(url,key,{auth:{persistSession:false}}):null;
}

export async function GET(_req:NextRequest,{params}:{params:Promise<{slug:string}>}){
 try{
  const client=db();
  if(!client)return NextResponse.json({error:'Not configured'},{status:503});
  const {slug}=await params;
  const {data:campaign,error:campaignError}=await client.from('campaigns').select('id,slug,name,provider').eq('slug',slug).maybeSingle();
  if(campaignError)throw campaignError;
  if(!campaign)return NextResponse.json({error:'Campaign not found'},{status:404});
  const {data,error}=await client.from('campaign_access').select('provider,invitation_code,reveal_state,updated_at').eq('campaign_id',campaign.id).maybeSingle();
  if(error)throw error;
  return NextResponse.json({campaign,access:data?{
   provider:data.provider,
   invitationCode:data.invitation_code,
   revealState:data.reveal_state,
   updatedAt:data.updated_at
  }:null});
 }catch(e){
  console.error(e);
  return NextResponse.json({error:'Unable to load campaign access.'},{status:500});
 }
}

export async function PATCH(req:NextRequest,{params}:{params:Promise<{slug:string}>}){
 try{
  const client=db();
  if(!client)return NextResponse.json({error:'Not configured'},{status:503});
  const {slug}=await params;
  const body=await req.json();
  const provider=String(body.provider||'').trim().toUpperCase();
  const invitationCode=String(body.invitationCode||'').trim().toUpperCase()||null;
  const revealState=String(body.revealState||'READY').trim().toUpperCase();

  if(!provider)return NextResponse.json({error:'Provider is required.'},{status:400});
  if(!allowedRevealStates.has(revealState))return NextResponse.json({error:'Invalid reveal state.'},{status:400});

  const {data:campaign,error:campaignError}=await client.from('campaigns').select('id,slug,name').eq('slug',slug).maybeSingle();
  if(campaignError)throw campaignError;
  if(!campaign)return NextResponse.json({error:'Campaign not found'},{status:404});

  const {data,error}=await client.from('campaign_access').upsert({
   campaign_id:campaign.id,
   provider,
   invitation_code:invitationCode,
   reveal_state:revealState,
   updated_at:new Date().toISOString()
  },{onConflict:'campaign_id'}).select('provider,invitation_code,reveal_state,updated_at').single();

  if(error)throw error;
  return NextResponse.json({ok:true,access:{
   provider:data.provider,
   invitationCode:data.invitation_code,
   revealState:data.reveal_state,
   updatedAt:data.updated_at
  }});
 }catch(e){
  console.error(e);
  return NextResponse.json({error:'Unable to update campaign access.'},{status:500});
 }
}
