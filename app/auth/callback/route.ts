import {NextRequest,NextResponse} from 'next/server';
import {sessionClient} from '../../../lib/supabase-server';

function publicOrigin(req:NextRequest){
 const configured=(process.env.NEXT_PUBLIC_SITE_URL||'').replace(/\/$/,'');
 if(configured&&!/localhost|0\.0\.0\.0/i.test(configured))return configured;
 return req.nextUrl.origin;
}

export async function GET(req:NextRequest){
 const u=new URL(req.url),code=u.searchParams.get('code'),requested=u.searchParams.get('next')||'/dashboard';
 const next=requested.startsWith('/')&&!requested.startsWith('//')&&!/[\\\u0000-\u001f\u007f]/.test(requested)?requested:'/dashboard';
 const origin=publicOrigin(req);
 if(!code)return NextResponse.redirect(new URL('/?auth=invalid',origin));
 try{
  const auth=await sessionClient();
  const {data,error}=await auth.auth.exchangeCodeForSession(code);
  if(error||!data.user?.email)throw error||new Error('Missing authenticated email');
  const {error:claimError}=await auth.rpc('claim_pairvoice_identity_self');
  if(claimError){
   if(String(claimError.message).includes('early_access_identity_not_found')){
    return NextResponse.redirect(new URL('/?auth=join-first',origin));
   }
   throw claimError;
  }
  return NextResponse.redirect(new URL(next,origin));
 }catch(e){console.error(e);return NextResponse.redirect(new URL('/?auth=failed',origin))}
}
