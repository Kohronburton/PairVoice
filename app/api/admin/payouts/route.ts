import {NextRequest,NextResponse} from 'next/server';
import {requireAdmin} from '../../../../lib/admin-server';
import {subsystemEnabled} from '../../../../lib/subsystem-controls';

export async function POST(req:NextRequest){
 const admin=await requireAdmin(['SUPER_ADMIN','PAYMENTS']);
 if(!admin)return NextResponse.json({error:'Forbidden'},{status:403});
 try{
  const b=await req.json(),action=String(b.action||'').toUpperCase();
  if(action==='START'){
   if(!await subsystemEnabled(admin.db,'PAYOUT'))return NextResponse.json({error:'New payout execution is temporarily paused; reconciliation remains available.'},{status:503});
   if(!b.payoutId||!b.idempotencyKey)return NextResponse.json({error:'payoutId and idempotencyKey are required.'},{status:400});
   const {data,error}=await admin.db.rpc('create_payout_attempt',{
    p_payout_id:String(b.payoutId),p_idempotency_key:String(b.idempotencyKey),
    p_actor_user_id:admin.user.id,p_actor_label:`ADMIN:${admin.role}`
   });
   if(error){console.error(error);return NextResponse.json({error:error.message},{status:409})}
   return NextResponse.json({ok:true,attemptId:data});
  }
  if(action==='RECONCILE'){
   const outcome=String(b.outcome||'').toUpperCase();
   if(!b.attemptId||!['SUCCEEDED','FAILED','UNKNOWN','MANUAL_REVIEW'].includes(outcome)||!String(b.reason||'').trim())
    return NextResponse.json({error:'attemptId, valid outcome, and reason are required.'},{status:400});
   const {data,error}=await admin.db.rpc('reconcile_payout_attempt',{
    p_attempt_id:String(b.attemptId),p_outcome:outcome,
    p_provider_reference:b.providerReference?String(b.providerReference):null,
    p_result_metadata:b.resultMetadata&&typeof b.resultMetadata==='object'?b.resultMetadata:{},
    p_last_error:b.lastError?String(b.lastError):null,
    p_actor_user_id:admin.user.id,p_actor_label:`ADMIN:${admin.role}`,p_reason:String(b.reason)
   });
   if(error){console.error(error);return NextResponse.json({error:error.message},{status:409})}
   return NextResponse.json(data);
  }
  return NextResponse.json({error:'START or RECONCILE action is required.'},{status:400});
 }catch(e){console.error(e);return NextResponse.json({error:'Unable to process payout.'},{status:500})}
}

export async function GET(){
 const admin=await requireAdmin(['SUPER_ADMIN','PAYMENTS']);
 if(!admin)return NextResponse.json({error:'Forbidden'},{status:403});
 const {data,error}=await admin.db.from('payouts').select('id,participant_id,amount_cents,currency,state,provider,external_reference,failure_reason,created_at,updated_at').order('created_at',{ascending:false}).limit(100);
 if(error)return NextResponse.json({error:'Unable to load payouts.'},{status:500});
 return NextResponse.json({payouts:data||[]});
}
