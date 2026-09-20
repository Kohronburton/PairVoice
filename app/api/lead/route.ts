import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';

function clean(value:unknown,max:number){
  const text=String(value??'').trim();
  return text ? text.slice(0,max) : null;
}

export async function POST(req:NextRequest){
 try{
  const b=await req.json();
  const email=String(b.email||'').trim().toLowerCase();
  const consent=b.consent===true;

  if(!/^\S+@\S+\.\S+$/.test(email)){
   return NextResponse.json({error:'Enter a valid email address.'},{status:400});
  }
  if(!consent){
   return NextResponse.json({error:'Consent is required to receive PairVoice opportunities.'},{status:400});
  }

  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key){
   return NextResponse.json({error:'Lead signup is not configured.'},{status:503});
  }

  const db=createClient(url,key,{auth:{persistSession:false}});
  const detectedLanguages=Array.isArray(b.detected_languages)
   ? b.detected_languages.map((x:unknown)=>String(x).slice(0,40)).slice(0,10)
   : [];

  let campaignId:string|null=null;
  let sourcePostingId:string|null=null;

  const campaignSlug=clean(b.campaign_slug,120);
  if(campaignSlug){
   const {data}=await db.from('campaigns').select('id').eq('slug',campaignSlug).eq('active',true).maybeSingle();
   campaignId=data?.id??null;
  }

  const sourcePostingExternalId=clean(b.source_posting_external_id,80);
  if(sourcePostingExternalId){
   const {data}=await db.from('source_postings').select('id,campaign_id').eq('external_job_id',sourcePostingExternalId).maybeSingle();
   sourcePostingId=data?.id??null;
   campaignId=campaignId??data?.campaign_id??null;
  }

  const {data:existing}=await db.from('leads').select('status').eq('email',email).maybeSingle();
  const status=existing?.status==='CONVERTED'?'CONVERTED':'LEAD';

  const row={
   email,
   marketing_consent:true,
   market_code:String(b.market_code||'UNKNOWN').trim().toUpperCase().slice(0,20),
   detected_locale:clean(b.detected_locale,40),
   detected_languages:detectedLanguages,
   source:clean(b.source,200),
   marketing_campaign_key:clean(b.marketing_campaign_key||b.utm_campaign||'organic',120),
   campaign_id:campaignId,
   source_posting_id:sourcePostingId,
   landing_path:clean(b.landing_path,500),
   referrer:clean(b.referrer,1000),
   fbclid:clean(b.fbclid,255),
   gclid:clean(b.gclid,255),
   utm_source:clean(b.utm_source,255),
   utm_medium:clean(b.utm_medium,255),
   utm_campaign:clean(b.utm_campaign,255),
   utm_content:clean(b.utm_content,255),
   utm_term:clean(b.utm_term,255),
   status,
   updated_at:new Date().toISOString()
  };

  const {error}=await db.from('leads').upsert(row,{onConflict:'email'});
  if(error){
   console.error('lead upsert error',error);
   return NextResponse.json({error:'Unable to join the PairVoice list.'},{status:500});
  }

  return NextResponse.json({ok:true,campaignMatched:Boolean(campaignId)});
 }catch(e){
  console.error(e);
  return NextResponse.json({error:'Unable to join the PairVoice list.'},{status:500});
 }
}
