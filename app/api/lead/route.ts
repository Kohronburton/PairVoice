import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';

export async function POST(req:NextRequest){
 try{
  const b=await req.json();
  const email=String(b.email||'').trim().toLowerCase();
  const consent=b.consent===true;
  if(!/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({error:'Enter a valid email address.'},{status:400});
  if(!consent) return NextResponse.json({error:'Consent is required to receive PairVoice opportunities.'},{status:400});
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if(!url||!key) return NextResponse.json({error:'Lead signup is not configured.'},{status:503});
  const db=createClient(url,key,{auth:{persistSession:false}});
  const detectedLanguages=Array.isArray(b.detected_languages)?b.detected_languages.map((x:any)=>String(x).slice(0,40)).slice(0,10):[];
  const {data,error}=await db.rpc('upsert_public_lead',{
   p_email:email,
   p_market_code:String(b.market_code||'UNKNOWN').slice(0,20),
   p_consent:true,
   p_detected_locale:String(b.detected_locale||'').slice(0,40)||null,
   p_detected_languages:detectedLanguages,
   p_source:b.source?String(b.source).slice(0,200):null,
   p_campaign_key:String(b.campaign_key||b.utm_campaign||'organic').slice(0,120),
   p_landing_path:b.landing_path?String(b.landing_path).slice(0,500):null,
   p_referrer:b.referrer?String(b.referrer).slice(0,1000):null,
   p_fbclid:b.fbclid?String(b.fbclid).slice(0,255):null,
   p_gclid:b.gclid?String(b.gclid).slice(0,255):null,
   p_utm_source:b.utm_source?String(b.utm_source).slice(0,255):null,
   p_utm_medium:b.utm_medium?String(b.utm_medium).slice(0,255):null,
   p_utm_campaign:b.utm_campaign?String(b.utm_campaign).slice(0,255):null,
   p_utm_content:b.utm_content?String(b.utm_content).slice(0,255):null,
   p_utm_term:b.utm_term?String(b.utm_term).slice(0,255):null
  });
  if(error){
   console.error('lead rpc error',error);
   if(String(error.message).includes('invalid_email')) return NextResponse.json({error:'Enter a valid email address.'},{status:400});
   if(String(error.message).includes('consent_required')) return NextResponse.json({error:'Consent is required to receive PairVoice opportunities.'},{status:400});
   return NextResponse.json({error:'Unable to join the early-access list.'},{status:500});
  }
  return NextResponse.json(data||{ok:true});
 }catch(e){
  console.error(e);
  return NextResponse.json({error:'Unable to join the early-access list.'},{status:500});
 }
}
