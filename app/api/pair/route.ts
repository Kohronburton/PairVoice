import{NextRequest,NextResponse}from'next/server';
import{isValidEmail,normalizeEmail,normalizePhone}from'../../../lib/validation';
import{serviceClient}from'../../../lib/supabase-server';

export async function POST(req:NextRequest){
 try{
  const b=await req.json(),email=normalizeEmail(b.email);
  const countryCode=String(b.countryCode||'').toUpperCase();
  const phone=normalizePhone(b.phone,countryCode);
  if(!b.inviteCode||!String(b.firstName||'').trim()||!isValidEmail(email)||!countryCode||!b.languageCode||!phone||b.is18Plus!==true||b.consent!==true)
   return NextResponse.json({error:'Invite, identity, eligibility and consent are required.'},{status:400});
  const db=serviceClient();
  const{data,error}=await db.rpc('join_pair_invite',{
   p_invite_code:String(b.inviteCode).toUpperCase(),p_first_name:String(b.firstName).trim(),p_email:email,
   p_phone:phone,p_country_code:countryCode,
   p_language_code:String(b.languageCode).toLowerCase(),p_is_18_plus:true,p_consent:true
  });
  if(error){
   const msg=String(error.message||''),status=msg.includes('already_enrolled')||msg.includes('invite_unavailable')?409:msg.includes('eligibility')||msg.includes('pair_with_self')?400:500;
   return NextResponse.json({error:status===409?'This invite is unavailable or the participant is already enrolled.':status===400?'The partner does not meet this campaign requirement.':'Unable to join pair.'},{status});
  }

  try{
   const trusted=serviceClient(),pairCode=String((data as {pairCode?:string})?.pairCode||'');
   if(pairCode){
    const {data:pair}=await trusted.from('pairs').select('id,campaign_id').eq('public_code',pairCode).maybeSingle();
    if(pair){
     await trusted.rpc('record_business_funnel_event',{
      p_event_name:'partner_invite_accepted',p_campaign_id:pair.campaign_id,p_pair_id:pair.id,p_participant_id:null,
      p_idempotency_key:`pair:${pair.id}:invite-accepted`,p_metadata:{source:'invite'}
     });
    }
   }
  }catch(e){console.error('pair milestone telemetry failed',e);}

  return NextResponse.json(data);
 }catch(e){console.error(e);return NextResponse.json({error:'Unable to join pair.'},{status:500})}
}
