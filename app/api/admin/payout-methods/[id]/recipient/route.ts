import {NextRequest,NextResponse} from 'next/server';
import {requireAdmin} from '../../../../../../lib/admin-server';
import {decryptSecret} from '../../../../../../lib/credential-crypto';

export async function GET(_req:NextRequest,{params}:{params:Promise<{id:string}>}){
 const admin=await requireAdmin(['SUPER_ADMIN','PAYMENTS']);
 if(!admin)return NextResponse.json({error:'Forbidden'},{status:403});
 try{
  const {id}=await params;
  const {data:method,error}=await admin.db.from('participant_payout_methods')
   .select('id,participant_id,provider,provider_recipient_reference,label,status').eq('id',id).maybeSingle();
  if(error)throw error;if(!method)return NextResponse.json({error:'Payout method not found.'},{status:404});
  if(!method.provider_recipient_reference)return NextResponse.json({error:'Recipient destination is missing.'},{status:409});
  let recipient:string;
  try{recipient=decryptSecret(method.provider_recipient_reference)}catch{recipient=method.provider_recipient_reference}
  await admin.db.from('audit_events').insert({
   actor_user_id:admin.user.id,actor_label:`ADMIN:${admin.role}`,role:admin.role,
   operation:'PAYOUT_RECIPIENT_REVEALED',resource_type:'PAYOUT_METHOD',resource_id:method.id,
   reason:'Authorized payout execution',after_data:{provider:method.provider,status:method.status}
  });
  return NextResponse.json({id:method.id,participantId:method.participant_id,provider:method.provider,label:method.label,status:method.status,recipient});
 }catch(e){console.error(e);return NextResponse.json({error:'Unable to reveal payout destination.'},{status:500})}
}
