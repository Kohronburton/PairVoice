import{NextRequest,NextResponse}from'next/server';
import{createClient}from'@supabase/supabase-js';
import{funnelEvents}from'../../../lib/funnel';

export async function POST(req:NextRequest){
 try{
  const b=await req.json(),event=String(b.event||'');
  if(!funnelEvents.includes(event as never)||typeof b.session_id!=='string'||!b.session_id)return NextResponse.json({ok:true});
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)return NextResponse.json({ok:true});
  const db=createClient(url,key,{auth:{persistSession:false}});
  const{error}=await db.from('funnel_events').insert({event_name:event,session_id:b.session_id.slice(0,80),page_path:String(b.page_path||'').slice(0,500),language_code:String(b.language_code||'').slice(0,10)||null,metadata:typeof b.metadata==='object'&&b.metadata?b.metadata:{}});
  if(error)console.error('analytics event error',error.message);
  return NextResponse.json({ok:true});
 }catch{return NextResponse.json({ok:true});}
}
