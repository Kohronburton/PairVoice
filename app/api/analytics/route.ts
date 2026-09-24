import{NextRequest,NextResponse}from'next/server';
import{createClient}from'@supabase/supabase-js';
import{funnelEvents}from'../../../lib/funnel';

const canonicalAliases:Partial<Record<(typeof funnelEvents)[number],(typeof funnelEvents)[number]>>={
 opportunity_view:'campaign_view',
 invite_created:'partner_invite_created'
};

export async function POST(req:NextRequest){
 try{
  const b=await req.json(),event=String(b.event||'') as (typeof funnelEvents)[number];
  if(!funnelEvents.includes(event as never)||typeof b.session_id!=='string'||!b.session_id)return NextResponse.json({ok:true});
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)return NextResponse.json({ok:true});
  const db=createClient(url,key,{auth:{persistSession:false}});
  const baseMetadata=typeof b.metadata==='object'&&b.metadata?b.metadata:{};
  const serverMetadata={
   ...baseMetadata,
   request_id:req.headers.get('x-vercel-id')||req.headers.get('x-request-id')||undefined,
   edge_country:req.headers.get('x-vercel-ip-country')||undefined,
   user_agent:req.headers.get('user-agent')?.slice(0,500)||undefined
  };
  const events=[event];
  const alias=canonicalAliases[event];
  if(alias&&!events.includes(alias))events.push(alias);
  if(event==='signup_started'&&String((baseMetadata as Record<string,unknown>).campaign_slug||'')!=='general')events.push('campaign_cta_click');
  const rows=[...new Set(events)].map(eventName=>({
   event_name:eventName,
   session_id:b.session_id.slice(0,80),
   page_path:String(b.page_path||'').slice(0,500),
   language_code:String(b.language_code||'').slice(0,10)||null,
   metadata:serverMetadata
  }));
  const{error}=await db.from('funnel_events').insert(rows);
  if(error)console.error('analytics event error',error.message);
  return NextResponse.json({ok:true});
 }catch{return NextResponse.json({ok:true});}
}
