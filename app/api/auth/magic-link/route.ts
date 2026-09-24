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

  // Always derive the callback host from the live request so staging/production
  // auth links cannot fall back to a stale localhost environment value.
  const origin=req.nextUrl.origin;
  const redirectTo=`${origin}/auth/callback?next=${encodeURIComponent(safeNext)}`;

  const db=createClient(url,key,{auth:{persistSession:false}});
  const {error}=await db.auth.signInWithOtp({
   email,
   options:{emailRedirectTo:redirectTo,shouldCreateUser:true}
  });
  if(error){console.error('magic-link error',error);return NextResponse.json({error:'Unable to send sign-in link.'},{status:500})}
  return NextResponse.json({ok:true,redirectHost:origin});
 }catch(e){
  console.error('magic-link route failure',e);
  return NextResponse.json({error:'Unable to send sign-in link.'},{status:500})
 }
}
