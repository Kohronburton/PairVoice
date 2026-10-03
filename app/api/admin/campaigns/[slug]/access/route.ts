import {NextRequest,NextResponse} from 'next/server';
import {requireAdmin} from '../../../../../../lib/admin-server';

const allowedRevealStates=new Set(['PARTNER_PENDING','PAIRED','READY','IN_PROGRESS']);
const storeFallbacks={
 android:'https://play.google.com/store/apps/details?id=com.magicdata.magiccollection',
 ios:'https://apps.apple.com/us/app/funcrowd/id1574837524'
};

export async function GET(_req:NextRequest,{params}:{params:Promise<{slug:string}>}){
 const admin=await requireAdmin(['SUPER_ADMIN','OPERATIONS']);
 if(!admin)return NextResponse.json({error:'Forbidden'},{status:403});
 try{
  const {slug}=await params;
  const {data:campaign,error:campaignError}=await admin.db.from('campaigns').select('id,slug,name,provider').eq('slug',slug).maybeSingle();
  if(campaignError)throw campaignError;if(!campaign)return NextResponse.json({error:'Campaign not found'},{status:404});
  const {data,error}=await admin.db.from('campaign_access')
   .select('provider,invitation_code,launch_url,android_launch_url,ios_launch_url,reveal_state,updated_at')
   .eq('campaign_id',campaign.id).maybeSingle();
  if(error)throw error;
  return NextResponse.json({campaign,access:data?{
   provider:data.provider,invitationCode:data.invitation_code,launchUrl:data.launch_url,
   androidLaunchUrl:data.android_launch_url,iosLaunchUrl:data.ios_launch_url,
   revealState:data.reveal_state,updatedAt:data.updated_at
  }:null,storeFallbacks});
 }catch(e){console.error(e);return NextResponse.json({error:'Unable to load campaign access.'},{status:500})}
}

export async function PATCH(req:NextRequest,{params}:{params:Promise<{slug:string}>}){
 const admin=await requireAdmin(['SUPER_ADMIN','OPERATIONS']);
 if(!admin)return NextResponse.json({error:'Forbidden'},{status:403});
 try{
  const {slug}=await params,body=await req.json();
  const provider=String(body.provider||'').trim().toUpperCase();
  const invitationCode=String(body.invitationCode||'').trim().toUpperCase()||null;
  const launchUrl=String(body.launchUrl||'').trim()||null;
  const androidLaunchUrl=String(body.androidLaunchUrl||'').trim()||null;
  const iosLaunchUrl=String(body.iosLaunchUrl||'').trim()||null;
  const revealState=String(body.revealState||'READY').trim().toUpperCase();
  if(!provider)return NextResponse.json({error:'Provider is required.'},{status:400});
  if(!allowedRevealStates.has(revealState))return NextResponse.json({error:'Invalid reveal state.'},{status:400});
  const {data:campaign,error:campaignError}=await admin.db.from('campaigns').select('id,slug,name').eq('slug',slug).maybeSingle();
  if(campaignError)throw campaignError;if(!campaign)return NextResponse.json({error:'Campaign not found'},{status:404});
  const row={
   campaign_id:campaign.id,provider,invitation_code:invitationCode,launch_url:launchUrl,
   android_launch_url:androidLaunchUrl,ios_launch_url:iosLaunchUrl,
   reveal_state:revealState,updated_at:new Date().toISOString()
  };
  const {data,error}=await admin.db.from('campaign_access').upsert(row,{onConflict:'campaign_id'})
   .select('provider,invitation_code,launch_url,android_launch_url,ios_launch_url,reveal_state,updated_at').single();
  if(error)throw error;
  await admin.db.from('audit_events').insert({
   actor_user_id:admin.user.id,actor_label:`ADMIN:${admin.role}`,role:admin.role,
   operation:'CAMPAIGN_ACCESS_UPDATED',resource_type:'CAMPAIGN',resource_id:campaign.id,
   after_data:{
    provider,reveal_state:revealState,has_invitation_code:Boolean(invitationCode),has_launch_url:Boolean(launchUrl),
    has_android_launch_url:Boolean(androidLaunchUrl),has_ios_launch_url:Boolean(iosLaunchUrl)
   },
   reason:String(body.reason||'Campaign access configuration updated')
  });
  return NextResponse.json({ok:true,access:{
   provider:data.provider,invitationCode:data.invitation_code,launchUrl:data.launch_url,
   androidLaunchUrl:data.android_launch_url,iosLaunchUrl:data.ios_launch_url,
   revealState:data.reveal_state,updatedAt:data.updated_at
  }});
 }catch(e){console.error(e);return NextResponse.json({error:'Unable to update campaign access.'},{status:500})}
}
