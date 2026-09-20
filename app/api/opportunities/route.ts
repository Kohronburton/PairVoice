import {NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';

export async function GET(){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)return NextResponse.json({error:'Not configured'},{status:503});

 const db=createClient(url,key,{auth:{persistSession:false}});
 const {data,error}=await db
  .from('campaigns')
  .select('slug,name,country_code,language_code,locale,accent_target,participant_count,session_count,session_minutes_min,session_minutes_max,device_requirement,participant_payout_cents,payout_currency,payout_unit,status,requirements,job_families(name,recording_mode,requires_pair)')
  .eq('active',true)
  .eq('status','OPEN')
  .order('country_code');

 if(error){
  console.error(error);
  return NextResponse.json({error:'Unable to load opportunities.'},{status:500});
 }

 const opportunities=(data||[]).map((row:any)=>({
  slug:row.slug,
  name:row.name,
  countryCode:row.country_code,
  languageCode:row.language_code,
  locale:row.locale,
  accentTarget:row.accent_target,
  participantCount:row.participant_count,
  sessionCount:row.session_count,
  sessionMinutesMin:row.session_minutes_min,
  sessionMinutesMax:row.session_minutes_max,
  deviceRequirement:row.device_requirement,
  participantPayoutCents:row.participant_payout_cents,
  payoutCurrency:row.payout_currency,
  payoutUnit:row.payout_unit,
  jobFamily:row.job_families?.name??null,
  recordingMode:row.job_families?.recording_mode??null,
  requiresPair:Boolean(row.job_families?.requires_pair),
  requirements:row.requirements??{}
 }));

 return NextResponse.json({opportunities});
}
