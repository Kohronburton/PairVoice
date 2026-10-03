import{NextRequest,NextResponse}from'next/server';
import{isValidEmail,normalizeEmail,normalizePhone}from'../../../lib/validation';
import{serviceClient}from'../../../lib/supabase-server';

export async function POST(req:NextRequest){
 try{
  const b=await req.json(),email=normalizeEmail(b.email);
  const countryCode=String(b.countryCode||'').toUpperCase();
  const phone=normalizePhone(b.phone,countryCode);
  if(!b.campaign)return NextResponse.json({error:'Select a gig before creating your account.',code:'MISSING_CAMPAIGN'},{status:400});
  if(!String(b.firstName||'').trim())return NextResponse.json({error:'Enter your first name.',code:'MISSING_FIRST_NAME'},{status:400});
  if(!isValidEmail(email))return NextResponse.json({error:'Enter a valid email address.',code:'INVALID_EMAIL'},{status:400});
  if(!countryCode||!b.languageCode)return NextResponse.json({error:'This gig is missing country or language settings.',code:'INVALID_GIG_CONFIG'},{status:400});
  if(!phone)return NextResponse.json({error:'Enter a valid phone number for this country.',code:'INVALID_PHONE'},{status:400});
  if(b.is18Plus!==true)return NextResponse.json({error:'Confirm that you are 18 or older.',code:'AGE_REQUIRED'},{status:400});
  if(b.consent!==true)return NextResponse.json({error:'Agree to the required account and gig communications.',code:'CONSENT_REQUIRED'},{status:400});

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
