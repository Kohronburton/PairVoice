import{NextRequest,NextResponse}from'next/server';
import{createClient}from'@supabase/supabase-js';
import{isValidEmail,normalizeEmail}from'../../../lib/validation';
import{isValidInviteCode}from'../../../lib/partner-invite';
import{sendPartnerJoinedEmail}from'../../../lib/email';

function serverDb(){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)return null;
 return createClient(url,key,{auth:{persistSession:false}});
}

export async function GET(req:NextRequest){
 try{
  const code=new URL(req.url).searchParams.get('code')?.trim().toUpperCase();
  if(!isValidInviteCode(code))return NextResponse.json({error:'Invalid pair invitation.'},{status:400});
  const db=serverDb();if(!db)return NextResponse.json({error:'Pair service is not configured.'},{status:503});
  const{data:pair,error}=await db.from('pairs').select('id,public_code,state,campaign_id,campaign_version_id').eq('invite_code',code).maybeSingle();
  if(error)throw error;
  if(!pair)return NextResponse.json({error:'Pair invitation not found.'},{status:404});
  const[campaignQ,versionQ]=await Promise.all([
   db.from('campaigns').select('name').eq('id',pair.campaign_id).single(),
   db.from('campaign_versions').select('country_code,language_code').eq('id',pair.campaign_version_id).single()
  ]);
  if(campaignQ.error||versionQ.error)throw campaignQ.error||versionQ.error;
  return NextResponse.json({
   ok:true,available:pair.state==='PARTNER_PENDING',pairState:pair.state,pairCode:pair.public_code,
   campaignName:campaignQ.data.name,countryCode:versionQ.data.country_code,languageCode:versionQ.data.language_code
  });
 }catch(e){
  console.error(e);
  return NextResponse.json({error:'Unable to load pair invitation.'},{status:500});
 }
}

export async function POST(req:NextRequest){
 try{
  const b=await req.json(),email=normalizeEmail(b.email),inviteCode=String(b.inviteCode||'').trim().toUpperCase();
  if(!isValidInviteCode(inviteCode)||!b.firstName||!isValidEmail(email)||!b.countryCode||!b.languageCode||b.is18Plus!==true||b.consent!==true)
   return NextResponse.json({error:'Invite, identity, eligibility and consent are required.'},{status:400});

  const db=serverDb();if(!db)return NextResponse.json({error:'Pair service is not configured.'},{status:503});
  const{data:existingPair}=await db.from('pairs').select('id').eq('invite_code',inviteCode).maybeSingle();
  const{data,error}=await db.rpc('join_pair_invite',{
   p_invite_code:inviteCode,
   p_first_name:String(b.firstName).trim(),
   p_email:email,
   p_phone:b.phone?String(b.phone):null,
   p_country_code:String(b.countryCode).toUpperCase(),
   p_language_code:String(b.languageCode).toLowerCase(),
   p_is_18_plus:true,
   p_consent:true
  });
  if(error){
   const msg=String(error.message||''),status=msg.includes('already_enrolled')||msg.includes('invite_unavailable')?409:msg.includes('eligibility')||msg.includes('pair_with_self')?400:500;
   return NextResponse.json({error:status===409?'This invite is unavailable or the participant is already enrolled.':status===400?'The partner does not meet this campaign requirement.':'Unable to join pair.'},{status});
  }

  if(existingPair?.id){
   try{
    const{data:members}=await db.from('pair_members').select('role,enrollment_id').eq('pair_id',existingPair.id).eq('active',true);
    const a=members?.find(m=>m.role==='A');
    if(a){
     const{data:enrollment}=await db.from('campaign_enrollments').select('participant_id').eq('id',a.enrollment_id).single();
     if(enrollment?.participant_id){
      const{data:participant}=await db.from('participants').select('first_name,email,primary_language_code').eq('id',enrollment.participant_id).single();
      if(participant?.email)await sendPartnerJoinedEmail(participant.email,participant.first_name||'there',participant.primary_language_code==='es'?'es':'en');
     }
    }
   }catch(e){console.error('partner joined email failed',e)}
  }

  return NextResponse.json(data);
 }catch(e){
  console.error(e);
  return NextResponse.json({error:'Unable to join pair.'},{status:500});
 }
}
