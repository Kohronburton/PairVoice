import {NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';

export async function GET(){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)return NextResponse.json({error:'Not configured'},{status:503});
 const db=createClient(url,key,{auth:{persistSession:false}});

 const [
  {data:families,error:familyError},
  {data:campaigns,error:campaignError},
  {data:postings,error:postingError},
  {data:observations,error:observationError},
  {data:access,error:accessError},
  {data:enrollments,error:enrollmentError},
  {data:pairs,error:pairError}
 ]=await Promise.all([
  db.from('job_families').select('id,slug,name,recording_mode,requires_pair,active').order('name'),
  db.from('campaigns').select('id,job_family_id,slug,name,country_code,language_code,participant_count,session_count,session_minutes_min,session_minutes_max,device_requirement,provider,participant_payout_cents,payout_currency,payout_unit,client_base_revenue_cents,client_referral_revenue_cents,status,active').order('country_code'),
  db.from('source_postings').select('id,campaign_id,platform,external_job_id,url,title,compensation_type,observed_rate_cents,observed_currency,status,first_observed_at').order('first_observed_at',{ascending:false}),
  db.from('source_contract_observations').select('id,source_posting_id,worker_display_name,observed_hours,hourly_rate_cents,observed_month').order('observed_month',{ascending:false}),
  db.from('campaign_access').select('campaign_id,provider,invitation_code,reveal_state,updated_at'),
  db.from('campaign_enrollments').select('campaign_id,status'),
  db.from('pairs').select('campaign_id,status')
 ]);

 const firstError=familyError||campaignError||postingError||observationError||accessError||enrollmentError||pairError;
 if(firstError){
  console.error(firstError);
  return NextResponse.json({error:'Unable to load campaign catalog.'},{status:500});
 }

 const familyById=new Map((families||[]).map((f:any)=>[f.id,f]));
 const observationsByPosting=new Map<string,any[]>();
 for(const o of observations||[]){
  const list=observationsByPosting.get(o.source_posting_id)||[];
  list.push(o);observationsByPosting.set(o.source_posting_id,list);
 }
 const postingsByCampaign=new Map<string,any[]>();
 for(const p of postings||[]){
  const list=postingsByCampaign.get(p.campaign_id)||[];
  list.push({...p,observations:observationsByPosting.get(p.id)||[]});
  postingsByCampaign.set(p.campaign_id,list);
 }
 const accessByCampaign=new Map((access||[]).map((a:any)=>[a.campaign_id,a]));

 const countStatuses=(rows:any[],campaignId:string)=>{
  const out:Record<string,number>={};
  for(const row of rows||[])if(row.campaign_id===campaignId)out[row.status]=(out[row.status]||0)+1;
  return out;
 };

 return NextResponse.json({
  families,
  campaigns:(campaigns||[]).map((c:any)=>({
   ...c,
   family:familyById.get(c.job_family_id)||null,
   sourcePostings:postingsByCampaign.get(c.id)||[],
   access:accessByCampaign.get(c.id)||null,
   enrollmentCounts:countStatuses(enrollments||[],c.id),
   pairCounts:countStatuses(pairs||[],c.id)
  }))
 });
}
