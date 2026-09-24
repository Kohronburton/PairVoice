import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {isValidEmail,normalizeEmail} from '../../../../lib/validation';

export async function POST(req:NextRequest){
 try{
  const b=await req.json(),email=normalizeEmail(b.email),next=String(b.next||'/dashboard');
  if(!isValidEmail(email))return NextResponse.json({error:'Enter a valid email.'},{status:400});
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if(!url||!key)return NextResponse.json({error:'Sign in is not configured.'},{status:503});
  const safeNext=next.startsWith('/')&&!next.startsWith('//')?next:'/dashboard';
  const origin=process.env.NEXT_PUBLIC_SITE_URL||new URL(req.url).origin;
  const db=createClient(url,key,{auth:{persistSession:false}});
  const {error}=await db.auth.signInWithOtp({email,options:{emailRedirectTo:`${origin}/auth/callback?next=${encodeURIComponent(safeNext)}`,shouldCreateUser:true}});
  if(error){console.error(error);return NextResponse.json({error:'Unable to send sign-in link.'},{status:500})}
  return NextResponse.json({ok:true});
 }catch{return NextResponse.json({error:'Unable to send sign-in link.'},{status:500})}
}
