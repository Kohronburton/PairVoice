import {NextRequest,NextResponse} from 'next/server';
import {sessionClient,serviceClient} from '../../../lib/supabase-server';

export async function GET(req:NextRequest){
 const u=new URL(req.url),code=u.searchParams.get('code'),requested=u.searchParams.get('next')||'/dashboard';
 const next=requested.startsWith('/')&&!requested.startsWith('//')?requested:'/dashboard';
 if(!code)return NextResponse.redirect(new URL('/?auth=invalid',u.origin));
 try{
  const auth=await sessionClient();
  const {data,error}=await auth.auth.exchangeCodeForSession(code);
  if(error||!data.user?.email)throw error||new Error('Missing authenticated email');
  const admin=serviceClient();
  const {error:claimError}=await admin.rpc('claim_pairvoice_identity',{p_auth_user_id:data.user.id,p_email:data.user.email});
  if(claimError){
   if(String(claimError.message).includes('early_access_identity_not_found')){
    return NextResponse.redirect(new URL('/?auth=join-first',u.origin));
   }
   throw claimError;
  }
  return NextResponse.redirect(new URL(next,u.origin));
 }catch(e){console.error(e);return NextResponse.redirect(new URL('/?auth=failed',u.origin))}
}
