import{NextResponse}from'next/server';import{createClient}from'@supabase/supabase-js';
export async function GET(){
 try{
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)return NextResponse.json({error:'Not configured.'},{status:503});
  const db=createClient(url,key,{auth:{persistSession:false}}),since=new Date(Date.now()-30*86400000).toISOString();
  const{data,error}=await db.from('funnel_events').select('event_name,session_id,created_at').gte('created_at',since);
  if(error)throw error;const rows=data||[],events=Object.fromEntries(['landing_view','opportunity_view','signup_started','signup_submitted','signup_completed','email_queued','invite_created','invite_view','partner_signup_started','partner_signup_completed','share_clicked'].map(e=>[e,rows.filter(r=>r.event_name===e).length]));
  const uniqueSessions=new Set(rows.map(r=>r.session_id)).size;return NextResponse.json({days:30,uniqueSessions,events});
 }catch(e){console.error(e);return NextResponse.json({error:'Unable to load funnel.'},{status:500});}
}
