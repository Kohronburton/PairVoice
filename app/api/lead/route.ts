import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';

export async function POST(req:NextRequest){
 try{
  const b=await req.json();
  const email=String(b.email||'').trim().toLowerCase();
  const country=String(b.country||'').trim();
  const consent=b.consent===true;
  if(!/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({error:'Enter a valid email address.'},{status:400});
  if(!['United States','Spain'].includes(country)) return NextResponse.json({error:'Select United States or Spain.'},{status:400});
  if(!consent) return NextResponse.json({error:'Consent is required to receive PairVoice opportunities.'},{status:400});
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key) return NextResponse.json({error:'Lead signup is not configured.'},{status:503});
  const db=createClient(url,key,{auth:{persistSession:false}});
  const payload={
   email,country,marketing_consent:true,
   source:b.source||null,
   utm_source:b.utm_source||null,
   utm_medium:b.utm_medium||null,
   utm_campaign:b.utm_campaign||null,
   utm_content:b.utm_content||null,
   utm_term:b.utm_term||null,
   updated_at:new Date().toISOString()
  };
  const {data:existing}=await db.from('leads').select('id,status').eq('email',email).maybeSingle();
  if(existing){
   const {error}=await db.from('leads').update({...payload,status:existing.status==='converted'?'converted':'lead'}).eq('id',existing.id);
   if(error) throw error;
   return NextResponse.json({ok:true,existing:true});
  }
  const {error}=await db.from('leads').insert(payload);
  if(error) throw error;
  return NextResponse.json({ok:true,existing:false});
 }catch(e){console.error(e);return NextResponse.json({error:'Unable to join the early-access list.'},{status:500})}
}
