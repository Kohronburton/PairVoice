import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';

const MARKETS:any={
 US_EN:{country:'United States',countryCode:'US',language:'English',languageCode:'en',regionCode:'US'},
 ES_ES:{country:'Spain',countryCode:'ES',language:'Spanish',languageCode:'es',regionCode:'ES'},
 IT_IT:{country:'Italy',countryCode:'IT',language:'Italian',languageCode:'it',regionCode:'IT'},
 AU_EN:{country:'Australia',countryCode:'AU',language:'English',languageCode:'en',regionCode:'AU'},
 GB_EN:{country:'United Kingdom',countryCode:'GB',language:'English',languageCode:'en',regionCode:'GB'},
 MX_ES:{country:'Mexico',countryCode:'MX',language:'Spanish',languageCode:'es',regionCode:'MX'},
 AR_ES:{country:'Argentina',countryCode:'AR',language:'Spanish',languageCode:'es',regionCode:'AR'},
 CO_ES:{country:'Colombia',countryCode:'CO',language:'Spanish',languageCode:'es',regionCode:'CO'}
};

export async function POST(req:NextRequest){
 try{
  const b=await req.json();
  const email=String(b.email||'').trim().toLowerCase();
  const marketCode=String(b.market_code||'').trim();
  const market=MARKETS[marketCode];
  const consent=b.consent===true;
  if(!/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({error:'Enter a valid email address.'},{status:400});
  if(!market) return NextResponse.json({error:'Select a supported market.'},{status:400});
  if(!consent) return NextResponse.json({error:'Consent is required to receive PairVoice opportunities.'},{status:400});
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key) return NextResponse.json({error:'Lead signup is not configured.'},{status:503});
  const db=createClient(url,key,{auth:{persistSession:false}});
  const campaignKey=String(b.campaign_key||b.utm_campaign||'organic').slice(0,120);
  const detectedLocale=String(b.detected_locale||'').slice(0,40)||null;
  const detectedLanguages=Array.isArray(b.detected_languages)?b.detected_languages.map((x:any)=>String(x).slice(0,40)).slice(0,10):[];
  const deviceLanguage=detectedLocale?.split('-')[0]?.toLowerCase()||null;
  const inferredLanguage=deviceLanguage==='es'?'Spanish':deviceLanguage==='it'?'Italian':deviceLanguage==='en'?'English':market.language;
  const payload={
   email,
   country:market.country,
   country_code:market.countryCode,
   market_code:marketCode,
   preferred_language:inferredLanguage,
   language_code:deviceLanguage||market.languageCode,
   region_code:market.regionCode,
   detected_locale:detectedLocale,
   detected_languages:detectedLanguages,
   marketing_consent:true,
   source:b.source||null,
   campaign_key:campaignKey,
   landing_path:b.landing_path||null,
   referrer:b.referrer||null,
   fbclid:b.fbclid||null,
   gclid:b.gclid||null,
   utm_source:b.utm_source||null,
   utm_medium:b.utm_medium||null,
   utm_campaign:b.utm_campaign||null,
   utm_content:b.utm_content||null,
   utm_term:b.utm_term||null,
   updated_at:new Date().toISOString()
  };
  const {data:existing}=await db.from('leads').select('id,status').eq('email',email).maybeSingle();
  if(existing){
   const {error}=await db.from('leads').update({...payload,status:existing.status==='converted'?'converted':'lead'}).eq('id',existing.id);
   if(error) throw error;
   return NextResponse.json({ok:true,existing:true,marketCode,preferredLanguage:inferredLanguage});
  }
  const {error}=await db.from('leads').insert(payload);
  if(error) throw error;
  return NextResponse.json({ok:true,existing:false,marketCode,preferredLanguage:inferredLanguage});
 }catch(e){console.error(e);return NextResponse.json({error:'Unable to join the early-access list.'},{status:500})}
}
