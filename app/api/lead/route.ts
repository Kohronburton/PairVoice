import {NextRequest,NextResponse} from 'next/server';
import {clampText,isValidEmail,normalizeEmail,normalizeMarket,normalizePhone} from '../../../lib/validation';
import {sendEarlyAccessWelcome,sendPartnerJoinedEmail} from '../../../lib/email';

export async function POST(req:NextRequest){
 try{
  const b=await req.json(),email=normalizeEmail(b.email),market=normalizeMarket(b.market_code);
  const phone=normalizePhone(b.phone,market);
  if(!isValidEmail(email))return NextResponse.json({error:'Enter a valid email address.'},{status:400});
  if(!String(b.first_name||'').trim())return NextResponse.json({error:'Enter your first name.'},{status:400});
  if(!phone)return NextResponse.json({error:'Enter a valid phone number.'},{status:400});
  if(b.consent!==true)return NextResponse.json({error:'Consent is required to create your PairVoice account.'},{status:400});

  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if(!url||!key)return NextResponse.json({error:'Account signup is not configured.'},{status:503});

  const langs=Array.isArray(b.detected_languages)?b.detected_languages.map((x:unknown)=>String(x).slice(0,40)).slice(0,10):[];
  const edge=await fetch(url+'/functions/v1/pairvoice-lead',{
   method:'POST',
   headers:{'content-type':'application/json','apikey':key},
   body:JSON.stringify({
    email,first_name:String(b.first_name).trim().slice(0,80),phone,
    market_code:market,language_code:b.language==='es'?'es':'en',consent:true,
    detected_locale:clampText(b.detected_locale,40),detected_languages:langs,
    source:clampText(b.source,200),
    campaign_key:clampText(b.marketing_campaign_key||b.campaign_key||b.utm_campaign||'organic',120),
    campaign_slug:clampText(b.campaign_slug,120),
    source_external_id:clampText(b.source_posting_external_id,120),
    landing_path:clampText(b.landing_path,500),referrer:clampText(b.referrer,1000),
    referral_code:clampText(b.referral_code,40),fbclid:clampText(b.fbclid,255),gclid:clampText(b.gclid,255),
    utm_source:clampText(b.utm_source,255),utm_medium:clampText(b.utm_medium,255),
    utm_campaign:clampText(b.utm_campaign,255),utm_content:clampText(b.utm_content,255),utm_term:clampText(b.utm_term,255)
   }),
   cache:'no-store'
  });
  const data=await edge.json().catch(()=>({error:'Unable to create account.'}));
  if(!edge.ok)return NextResponse.json({error:data.error||'Unable to create account.'},{status:edge.status});

  const result=(data||{}) as {inviteCode?:string;languageCode?:'en'|'es';partnerJoined?:boolean;referrerEmail?:string;referrerFirstName?:string;referrerLanguage?:'en'|'es'};
  const site=req.nextUrl.origin,inviteUrl=`${site}/invite/${encodeURIComponent(result.inviteCode||'')}`;

  let emailStatus={sent:false,queued:true};
  try{emailStatus=await sendEarlyAccessWelcome({to:email,firstName:String(b.first_name).trim(),language:result.languageCode==='es'?'es':'en',inviteUrl,partnerJoined:result.partnerJoined})}
  catch(e){console.error('welcome email failed',e)}

  if(result.referrerEmail){
   try{await sendPartnerJoinedEmail(result.referrerEmail,result.referrerFirstName||'there',result.referrerLanguage==='es'?'es':'en')}
   catch(e){console.error('partner joined email failed',e)}
  }

  return NextResponse.json({...result,inviteUrl,emailStatus,phoneCaptured:true});
 }catch(e){console.error(e);return NextResponse.json({error:'Unable to create account.'},{status:500})}
}
