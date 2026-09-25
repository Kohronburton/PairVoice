import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {isValidEmail,normalizeEmail} from '../../../../lib/validation';

function publicOrigin(req:NextRequest){
 const configured=(process.env.NEXT_PUBLIC_SITE_URL||'').replace(/\/$/,'');
 if(configured&&!/localhost/i.test(configured))return configured;
 const host=(req.headers.get('x-forwarded-host')||req.headers.get('host')||'').split(',')[0].trim();
 const proto=(req.headers.get('x-forwarded-proto')||'https').split(',')[0].trim();
 if(host&&!/^(localhost|127\.0\.0\.1)(:|$)/i.test(host))return `${proto}://${host}`;
 return req.nextUrl.origin;
}

export async function POST(req:NextRequest){
 try{
  const b=await req.json(),email=normalizeEmail(b.email),next=String(b.next||'/dashboard');
  if(!isValidEmail(email))return NextResponse.json({error:'Enter a valid email.'},{status:400});
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if(!url||!key)return NextResponse.json({error:'Sign in is not configured.'},{status:503});
  const safeNext=next.startsWith('/')&&!next.startsWith('//')?next:'/dashboard';
  const origin=publicOrigin(req);
  const redirectTo=`${origin}/auth/callback?next=${encodeURIComponent(safeNext)}`;
  const shouldCreateUser=b.intent==='signup'||b.flow==='signup'||b.shouldCreateUser===true;

  const db=createClient(url,key,{auth:{persistSession:false}});
  const {error}=await db.auth.signInWithOtp({email,options:{emailRedirectTo:redirectTo,shouldCreateUser}});
  if(error){
   console.error('magic-link error',error);
   const code=String((error as {code?:string}).code||'');
   const status=Number((error as {status?:number}).status||0);
   if(status===429||code==='over_email_send_rate_limit'){
    return NextResponse.json({
     error:'A sign-in email was sent recently. Check your inbox or try again in a few minutes.',
     code:'EMAIL_RATE_LIMITED',retryAfterSeconds:60
    },{status:429,headers:{'Retry-After':'60'}});
   }
   if(status===400&&!shouldCreateUser){
    return NextResponse.json({error:'No PairVoice sign-in exists for that email yet. Please complete signup first.'},{status:404});
   }
   return NextResponse.json({error:'Unable to send sign-in link.'},{status:500});
  }
  return NextResponse.json({ok:true,redirectHost:origin,createdAllowed:shouldCreateUser});
 }catch(e){
  console.error('magic-link route failure',e);
  return NextResponse.json({error:'Unable to send sign-in link.'},{status:500});
 }
}
