import {NextRequest,NextResponse} from 'next/server';
import {serviceClient} from '../../../../lib/supabase-server';
import {isValidEmail,normalizeEmail} from '../../../../lib/validation';
import {sendAuthConfirmationEmail} from '../../../../lib/email';

function publicOrigin(req:NextRequest){
 const configured=(process.env.NEXT_PUBLIC_SITE_URL||'').replace(/\/$/,'');
 if(configured&&!/localhost/i.test(configured))return configured;
 return req.nextUrl.origin;
}
function safePath(value:unknown){
 const next=String(value||'/dashboard');
 return next.startsWith('/')&&!next.startsWith('//')&&!/[\\\u0000-\u001f\u007f]/.test(next)?next:'/dashboard';
}
function language(req:NextRequest):'en'|'es'{return (req.headers.get('accept-language')||'').toLowerCase().startsWith('es')?'es':'en'}

export async function POST(req:NextRequest){
 try{
  const b=await req.json(),email=normalizeEmail(b.email),next=safePath(b.next);
  if(!isValidEmail(email))return NextResponse.json({error:'Enter a valid email.'},{status:400});
  const trusted=serviceClient();
  const {data:participant,error:participantError}=await trusted.from('participants').select('id,auth_user_id').eq('email',email).maybeSingle();
  if(participantError)throw participantError;

  const signupIntent=b.intent==='signup';
  const recoveryIntent=b.intent==='recover-existing';
  if(!signupIntent&&!recoveryIntent&&!participant){
   return NextResponse.json({error:'No PairVoice account exists for that email. Create your account first.',code:'PAIRVOICE_ACCOUNT_NOT_FOUND'},{status:404});
  }
  if(recoveryIntent&&!participant){
   return NextResponse.json({error:'We could not find that PairVoice account. Check the email or create an account first.',code:'PAIRVOICE_ACCOUNT_NOT_FOUND'},{status:404});
  }

  // Generate the Supabase token server-side but NEVER place the provider action_link
  // in email. Email scanners may GET our PairVoice landing page safely; only the
  // explicit POST on that page consumes the one-time token.
  let linkType:'magiclink'|'signup'='magiclink';
  if((signupIntent||recoveryIntent)&&participant&&!participant.auth_user_id)linkType='signup';
  const generated=await trusted.auth.admin.generateLink({type:linkType,email,options:{redirectTo:`${publicOrigin(req)}/dashboard`}} as any);
  let generatedData:any=generated.data;
  if(generated.error){
   const message=String(generated.error.message||'');
   // A participant can have an Auth user before auth_user_id has been claimed.
   // In that case signup generation reports that the user exists; retry as magiclink.
   if(linkType==='signup'&&/already|registered|exists/i.test(message)){
    const retry=await trusted.auth.admin.generateLink({type:'magiclink',email,options:{redirectTo:`${publicOrigin(req)}/dashboard`}} as any);
    if(retry.error)throw retry.error;
    generatedData=retry.data;
    linkType='magiclink';
   }else throw generated.error;
  }
  const tokenHash=generatedData?.properties?.hashed_token;
  if(!tokenHash)throw new Error('Auth provider did not return a token hash');

  const confirm=new URL('/auth/confirm',publicOrigin(req));
  confirm.searchParams.set('token_hash',tokenHash);
  confirm.searchParams.set('type',linkType);
  confirm.searchParams.set('next',next);
  await sendAuthConfirmationEmail({to:email,confirmUrl:confirm.toString(),language:language(req)});
  return NextResponse.json({ok:true,redirectHost:publicOrigin(req),scannerSafe:true},{headers:{'Cache-Control':'no-store'}});
 }catch(e){
  console.error('scanner-safe auth route failure',e);
  return NextResponse.json({error:'Unable to send sign-in link.'},{status:500});
 }
}
