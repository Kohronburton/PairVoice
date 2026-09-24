import {NextRequest,NextResponse} from 'next/server';
import {sessionClient,serviceClient} from '../../../lib/supabase-server';

async function currentParticipant(){
 const auth=await sessionClient(),{data}=await auth.auth.getUser();
 if(!data.user)return null;
 const db=serviceClient();
 const {data:participant}=await db.from('participants').select('id,public_code').eq('auth_user_id',data.user.id).maybeSingle();
 if(!participant)return null;
 return {db,participant};
}

export async function GET(){
 const ctx=await currentParticipant();
 if(!ctx)return NextResponse.json({error:'Sign in required.'},{status:401});
 const {data:requests,error}=await ctx.db.from('campaign_partner_requests')
  .select('id,status,created_at,campaign_id,requester_participant_id,target_participant_id,campaigns(slug,name),requester:participants!campaign_partner_requests_requester_participant_id_fkey(first_name,public_code),target:participants!campaign_partner_requests_target_participant_id_fkey(first_name,public_code)')
  .or(`requester_participant_id.eq.${ctx.participant.id},target_participant_id.eq.${ctx.participant.id}`)
  .eq('status','PENDING').order('created_at',{ascending:false});
 if(error){console.error(error);return NextResponse.json({error:'Unable to load partner requests.'},{status:500})}
 return NextResponse.json({participantCode:ctx.participant.public_code,requests:requests||[]});
}

export async function POST(req:NextRequest){
 const ctx=await currentParticipant();
 if(!ctx)return NextResponse.json({error:'Sign in required.'},{status:401});
 try{
  const b=await req.json(),action=String(b.action||'').toUpperCase();
  if(action==='REQUEST'){
   if(!b.campaignSlug||!b.partnerCode)return NextResponse.json({error:'campaignSlug and partnerCode are required.'},{status:400});
   const {data,error}=await ctx.db.rpc('request_existing_partner',{
    p_requester_id:ctx.participant.id,p_target_public_code:String(b.partnerCode),p_campaign_slug:String(b.campaignSlug)
   });
   if(error){
    const m=String(error.message||'');
    const map:Record<string,string>={
     partner_code_not_found:'We could not find that PairVoice code.',
     target_not_qualified_for_campaign:'That person has not joined or qualified for this gig yet.',
     requester_not_qualified_for_campaign:'Join and qualify for this gig before connecting a partner.',
     target_not_available_for_linking:'That person is no longer available to link for this gig.',
     requester_not_available_for_linking:'Your current campaign pair is no longer available to link.',
     participant_cannot_pair_with_self:'You cannot connect your own account as a partner.',
     matching_paused:'Partner connections are temporarily paused.'
    };
    return NextResponse.json({error:map[m]||'Unable to send partner request.'},{status:409});
   }
   return NextResponse.json({ok:true,requestId:data});
  }
  if(action==='RESPOND'){
   if(!b.requestId||typeof b.accept!=='boolean')return NextResponse.json({error:'requestId and accept are required.'},{status:400});
   const {data,error}=await ctx.db.rpc('respond_existing_partner_request',{
    p_request_id:String(b.requestId),p_target_participant_id:ctx.participant.id,p_accept:b.accept
   });
   if(error){console.error(error);return NextResponse.json({error:error.message},{status:409})}
   return NextResponse.json(data);
  }
  return NextResponse.json({error:'REQUEST or RESPOND action is required.'},{status:400});
 }catch(e){console.error(e);return NextResponse.json({error:'Unable to update partner connection.'},{status:500})}
}
