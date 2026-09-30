import{NextRequest,NextResponse}from'next/server';
import{isValidEmail,normalizeEmail,normalizePhone}from'../../../lib/validation';
import{serviceClient}from'../../../lib/supabase-server';

export async function POST(req:NextRequest){
 try{
  const b=await req.json(),email=normalizeEmail(b.email);
  const countryCode=String(b.countryCode||'').toUpperCase();
  const phone=normalizePhone(b.phone,countryCode);
  if(!b.campaign||!b.firstName||!isValidEmail(email)||!countryCode||!b.languageCode||!phone||b.is18Plus!==true||b.consent!==true)
   return NextResponse.json({error:'Campaign, identity, valid phone, eligibility and consent are required.'},{status:400});

  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,edgeSecret=process.env.PAIRVOICE_EDGE_SHARED_SECRET;
  if(!url||!key||!edgeSecret)return NextResponse.json({error:'Signup service is not configured.'},{status:503});

  const response=await fetch(url+'/functions/v1/pairvoice-signup',{
   method:'POST',
   headers:{'content-type':'application/json','apikey':key,'x-pairvoice-edge-secret':edgeSecret},
   body:JSON.stringify({
    campaign:String(b.campaign),
    firstName:String(b.firstName).trim(),
    email,
    phone,
    countryCode,
    languageCode:String(b.languageCode).toLowerCase(),
    is18Plus:true,
    consent:true,
    marketingConsent:b.marketingConsent===true,
    ref:b.ref?String(b.ref).toUpperCase():null,
    partnerCode:b.partnerCode?String(b.partnerCode).trim().toUpperCase():null
   }),
   cache:'no-store'
  });

  const data=await response.json().catch(()=>({error:'Unable to complete signup.'}));
  if(!response.ok)return NextResponse.json({
   error:data.error||'Unable to complete signup.',
   ...(data.code?{code:data.code}:{})
  },{status:response.status});
  let partnerLinkStatus:string|undefined;
  if(b.partnerCode){
   const db=serviceClient();
   const {data:participant}=await db.from('participants').select('id').eq('email',email).maybeSingle();
   if(participant?.id){
    const {error:partnerError}=await db.rpc('request_existing_partner',{
     p_requester_id:participant.id,
     p_target_public_code:String(b.partnerCode).trim().toUpperCase(),
     p_campaign_slug:String(b.campaign)
    });
    if(partnerError){
     console.error('partner invite handoff failed',partnerError.message);
     partnerLinkStatus='NEEDS_RETRY';
    }else partnerLinkStatus='PENDING';
   }else partnerLinkStatus='NEEDS_RETRY';
  }
  return NextResponse.json({...data,...(partnerLinkStatus?{partnerLinkStatus}:{})});
 }catch(e){
  console.error(e);
  return NextResponse.json({error:'Unable to complete signup.'},{status:500});
 }
}
