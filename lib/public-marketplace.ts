export type PublicOpportunity={
 slug:string;name:string;countryCode:string;languageCode:string;locale:string|null;
 accentTarget:string|null;participantCount:number;sessionCount:number|null;
 sessionMinutesMin:number|null;sessionMinutesMax:number|null;deviceRequirement:string|null;
 participantPayoutCents:number|null;payoutCurrency:string;payoutUnit:'PAIR';
 jobFamily:string|null;recordingMode:string|null;requiresPair:boolean;requirements:Record<string,unknown>;
};

type RawOpportunity={
 slug:string;name:string;country_code:string;language_code:string;locale:string|null;
 accent_target:string|null;participant_count:number;sessions_required:number|null;
 target_seconds_min:number|null;target_seconds_max:number|null;device_requirement:string|null;
 pair_compensation_cents:number|null;currency:string|null;job_family:string|null;
 recording_mode:string|null;requires_pair:boolean;rules:Record<string,unknown>|null;
};

export async function getPublicOpportunities():Promise<PublicOpportunity[]>{
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)return [];
 try{
  const response=await fetch(url+'/rest/v1/rpc/public_opportunities',{
   method:'POST',
   headers:{apikey:key,Authorization:'Bearer '+key,'content-type':'application/json'},
   body:'{}',
   next:{revalidate:60}
  });
  if(!response.ok)return [];
  const rows=await response.json() as RawOpportunity[];
  return rows.map(r=>({
   slug:r.slug,name:r.name,countryCode:r.country_code,languageCode:r.language_code,locale:r.locale,
   accentTarget:r.accent_target,participantCount:r.participant_count,sessionCount:r.sessions_required,
   sessionMinutesMin:r.target_seconds_min?Math.round(r.target_seconds_min/60):null,
   sessionMinutesMax:r.target_seconds_max?Math.round(r.target_seconds_max/60):null,
   deviceRequirement:r.device_requirement,participantPayoutCents:r.pair_compensation_cents??null,
   payoutCurrency:r.currency||'USD',payoutUnit:'PAIR',jobFamily:r.job_family??null,
   recordingMode:r.recording_mode??null,requiresPair:Boolean(r.requires_pair),requirements:r.rules||{}
  }));
 }catch{return []}
}
