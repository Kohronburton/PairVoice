'use client';
import {createClient,SupabaseClient} from '@supabase/supabase-js';

let client:SupabaseClient|undefined;

export function getBrowserSupabase(){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if(!url||!key) throw new Error('PairVoice sign-in is not configured.');
  if(!client) client=createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  return client;
}
