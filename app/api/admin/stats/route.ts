import {NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';

export async function GET(){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)return NextResponse.json({error:'Not configured'},{status:503});
 const db=createClient(url,key,{auth:{persistSession:false}});
 const [{count:leads},{count:usLeads},{count:spainLeads},{count:users},{count:pairs},{count:completePairs}]=await Promise.all([
  db.from('leads').select('*',{count:'exact',head:true}).eq('status','lead'),
  db.from('leads').select('*',{count:'exact',head:true}).eq('status','lead').eq('country','United States'),
  db.from('leads').select('*',{count:'exact',head:true}).eq('status','lead').eq('country','Spain'),
  db.from('profiles').select('*',{count:'exact',head:true}),
  db.from('pairs').select('*',{count:'exact',head:true}),
  db.from('pairs').select('*',{count:'exact',head:true}).neq('status','invited')
 ]);
 const total=leads||0,target=20000;
 return NextResponse.json({leads:total,usLeads:usLeads||0,spainLeads:spainLeads||0,users:users||0,pairs:pairs||0,completePairs:completePairs||0,target,progress:Math.round((total/target)*10000)/100});
}
