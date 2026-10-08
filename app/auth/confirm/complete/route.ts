import {NextRequest,NextResponse} from 'next/server';
import {sessionClient,serviceClient} from '../../../../lib/supabase-server';

function origin(req:NextRequest){const configured=(process.env.NEXT_PUBLIC_SITE_URL||'').replace(/\/$/,'');return configured&&!/localhost/i.test(configured)?configured:req.nextUrl.origin}
function safe(v:FormDataEntryValue|null){const s=String(v||'/dashboard');return s.startsWith('/')&&!s.startsWith('//')&&!/[\\\u0000-\u001f\u007f]/.test(s)?s:'/dashboard'}

export async function POST(req:NextRequest){
 const base=origin(req);
 try{
  const form=await req.formData(),tokenHash=String(form.get('token_hash')||''),next=safe(form.get('next')),type=form.get('type')==='signup'?'signup':'magiclink';
  if(!tokenHash)return NextResponse.redirect(new URL('/?auth=invalid',base),303);

  const auth=await sessionClient();
  const verified=await auth.auth.verifyOtp({token_hash:tokenHash,type} as any);
  if(verified.error||!verified.data.user?.id||!verified.data.user.email)throw verified.error||new Error('Authenticated identity missing');

  const user=verified.data.user,email=String(verified.data.user.email).trim().toLowerCase();
  const trusted=serviceClient();
  const {data:participant,error:lookupError}=await trusted.from('participants').select('id,auth_user_id').eq('email',email).maybeSingle();
  if(lookupError)throw lookupError;
  if(!participant){
   await auth.auth.signOut();
   return NextResponse.redirect(new URL('/?auth=join-first',base),303);
  }
  if(participant.auth_user_id&&participant.auth_user_id!==user.id){
   console.error('AUTH_IDENTITY_CONFLICT',{participantId:participant.id,userId:user.id});
   await auth.auth.signOut();
   return NextResponse.redirect(new URL('/?auth=identity-conflict',base),303);
  }

  // Claim through the authenticated RPC first so RLS/business invariants remain
  // authoritative. Then verify the durable link before allowing dashboard access.
  const {error:claimError}=await auth.rpc('claim_pairvoice_identity_self');
  if(claimError)throw claimError;
  const {data:claimed,error:verifyError}=await trusted.from('participants').select('auth_user_id').eq('id',participant.id).single();
  if(verifyError||claimed?.auth_user_id!==user.id)throw verifyError||new Error('Identity claim did not persist');

  return NextResponse.redirect(new URL(next,base),303);
 }catch(e){
  console.error('auth confirmation failure',e);
  return NextResponse.redirect(new URL('/?auth=failed',base),303);
 }
}
