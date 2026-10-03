import{NextResponse}from'next/server';import{createClient}from'@supabase/supabase-js';
export async function GET(){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)return NextResponse.json({error:'Catalog is not configured.'},{status:503});
 const db=createClient(url,key,{auth:{persistSession:false}});
 const{data,error}=await db.rpc('public_opportunities');
 if(error){console.error(error);return NextResponse.json({error:'Unable to load opportunities.'},{status:500})}
 const opportunities=(data||[]).map((r:any)=>({
  slug:r.slug,name:r.name,countryCode:r.country_code,languageCode:r.language_code,locale:r.locale,
  accentTarget:r.accent_target,participantCount:r.participant_count,sessionCount:r.sessions_required,
  sessionMinutesMin:r.target_seconds_min?Math.round(r.target_seconds_min/60):null,
  sessionMinutesMax:r.target_seconds_max?Math.round(r.target_seconds_max/60):null,
  deviceRequirement:r.device_requirement,participantPayoutCents:r.pair_compensation_cents??null,
  payoutCurrency:r.currency||'USD',payoutUnit:'PAIR',jobFamily:r.job_family??null,
  recordingMode:r.recording_mode??null,requiresPair:Boolean(r.requires_pair),requirements:r.rules||{}
 }));
 return NextResponse.json({opportunities});
}