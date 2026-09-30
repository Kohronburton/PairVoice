import type {SupabaseClient} from '@supabase/supabase-js';

export async function subsystemEnabled(db:SupabaseClient,key:'MATCHING'|'WORK'|'PAYOUT'|'MESSAGING'|'REFERRAL'){
 const {data,error}=await db.rpc('subsystem_is_enabled',{p_subsystem:key});
 if(error){console.error('subsystem control read failed',key,error);return false}
 return data===true;
}
