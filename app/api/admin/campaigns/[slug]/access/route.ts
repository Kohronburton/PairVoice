import {NextRequest,NextResponse} from 'next/server';
import {requireAdmin} from '../../../../../lib/admin-server';

const allowedRevealStates=new Set(['PARTNER_PENDING','PAIRED','READY','IN_PROGRESS']);

export async function GET(_req:NextRequest,{params}:{params:Promise<{slug:string}>}){
 const admin=await requireAdmin(['SUPER_ADMIN','OPERATIONS']);
 if(!admin)return NextResponse.json({error:'Forbidden'},{status:403});
 try{
  const {slug}=await params;
  const {data:campaign,error:campaignError}=await admin.db.from('campaigns').select('id,slug,name,provider').eq('slug',slug).maybeSingle();
  if(campaignError)throw campaignError;if(!campaign)return NextResponse.json({error:'Campaign not found'},{status:404});
  const {data,error}=await admin.db.from('campaign_access').select('provider,invitation_code,reveal_state,updated_at').eq('campaign_id',campaign.id).maybeSingle();
  if(error)throw error;
  return NextResponse.json({campaign,access:data?{provider:data.provider,invitationCode:data.invitation_code,revealState:data.reveal_state,updatedAt:data.updated_at}:null});
 }catch(e){console.error(e);return NextResponse.json({error:'Unable to load campaign access.'},{status:500})}
}

export async function PATCH(req:NextRequest,{params}:{params:Promise<{slug:string}>}){
 const admin=await requireAdmin(['SUPER_ADMIN','OPERATIONS']);
 if(!admin)return NextResponse.json({error:'Forbidden'},{status:403});
 try{
  const {slug}=await params,body=await req.json();
  const provider=String(body.provider||'').trim().toUpperCase(),invitationCode=String(body.invitationCode||'').trim().toUpperCase()||null,revealState=String(body.revealState||'READY').trim().toUpperCase();
  if(!provider)return NextResponse.json({error:'Provider is required.'},{status:400});
  if(!allowedRevealStates.has(revealState))return NextResponse.json({error:'Invalid reveal state.'},{status:400});
  const {data:campaign,error:campaignError}=await admin.db.from('campaigns').select('id,slug,name').eq('slug',slug).maybeSingle();
  if(campaignError)throw campaignError;if(!campaign)return NextResponse.json({error:'Campaign not found'},{status:404});
  const {data,error}=await admin.db.from('campaign_access').upsert({campaign_id:campaign.id,provider,invitation_code:invitationCode,reveal_state:revealState,updated_at:new Date().toISOString()},{onConflict:'campaign_id'}).select('provider,invitation_code,reveal_state,updated_at').single();
  if(error)throw error;
  await admin.db.from('audit_events').insert({actor_user_id:admin.user.id,actor_label:`ADMIN:${admin.role}`,role:admin.role,operation:'CAMPAIGN_ACCESS_UPDATED',resource_type:'CAMPAIGN',resource_id:campaign.id,after_data:{provider,reveal_state:revealState,has_invitation_code:Boolean(invitationCode)},reason:String(body.reason||'Campaign access configuration updated')});
  return NextResponse.json({ok:true,access:{provider:data.provider,invitationCode:data.invitation_code,revealState:data.reveal_state,updatedAt:data.updated_at}});
 }catch(e){console.error(e);return NextResponse.json({error:'Unable to update campaign access.'},{status:500})}
}