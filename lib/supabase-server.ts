import {cookies} from 'next/headers';
import {createServerClient} from '@supabase/ssr';
import {createClient} from '@supabase/supabase-js';

export async function sessionClient(){
 const store=await cookies();
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)throw new Error('Supabase public configuration missing');
 return createServerClient(url,key,{cookies:{getAll:()=>store.getAll(),setAll(items:{name:string;value:string;options?:Record<string,unknown>}[]){for(const i of items)store.set(i.name,i.value,i.options)}}});
}
export function serviceClient(){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)throw new Error('Supabase service configuration missing');
 return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
