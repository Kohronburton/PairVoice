import {NextRequest,NextResponse} from 'next/server';
import {serviceClient} from '../../../../lib/supabase-server';
import {createPayPalPayout} from '../../../../lib/paypal';
import {subsystemEnabled} from '../../../../lib/subsystem-controls';

function authorized(req:NextRequest){
 const expected=process.env.PAIRVOICE_INTERNAL_SECRET||process.env.CRON_SECRET;
 return Boolean(expected&&req.headers.get('authorization')===`Bearer ${expected}`);
}

export async function POST(req:NextRequest){
 if(!authorized(req))return NextResponse.json({error:'Forbidden'},{status:403});
 const db=serviceClient();
 if(!await subsystemEnabled(db,'PAYOUT'))return NextResponse.json({ok:true,paused:true,processed:0});
 const {data:attempts,error}=await db.from('provider_payout_attempts')
  .select('id,payout_id,idempotency_key,provider_reference')
  .eq('provider','paypal-payouts').eq('state','PROCESSING').is('provider_reference',null)
  .order('created_at',{ascending:true}).limit(10);
 if(error)return NextResponse.json({error:'Unable to load payout queue.'},{status:500});

 let submitted=0,failed=0;
 for(const attempt of attempts||[]){
  try{
   const {data:payout,error:payoutError}=await db.from('payouts')
    .select('id,amount_cents,currency,payout_method_id')
    .eq('id',attempt.payout_id).single();
   if(payoutError||!payout)throw new Error('payout_not_found');
   const {data:method,error:methodError}=await db.from('participant_payout_methods')
    .select('provider,provider_recipient_reference,status')
    .eq('id',payout.payout_method_id).single();
   if(methodError||!method)throw new Error('payout_method_not_found');
   if(method.status!=='VERIFIED')throw new Error('payout_method_not_verified');
   if(String(method.provider).toUpperCase()!=='PAYPAL')throw new Error('paypal_payout_method_required');
   if(!method.provider_recipient_reference)throw new Error('paypal_recipient_missing');

   const result=await createPayPalPayout({
    senderBatchId:`pairvoice-${attempt.id}`,
    senderItemId:attempt.id,
    recipientEmail:String(method.provider_recipient_reference),
    amountCents:Number(payout.amount_cents),
    currency:String(payout.currency),
    note:'PairVoice approved-work payout'
   });
   const batchId=String(result?.batch_header?.payout_batch_id||'');
   if(!batchId)throw new Error('paypal_batch_id_missing');
   await db.from('provider_payout_attempts').update({
    provider_reference:batchId,
    result_metadata:{paypal_batch_id:batchId,batch_status:result?.batch_header?.batch_status||null}
   }).eq('id',attempt.id).eq('state','PROCESSING');
   submitted++;
  }catch(e){
   const message=e instanceof Error?e.message:'paypal_submission_failed';
   await db.rpc('reconcile_payout_attempt',{
    p_attempt_id:attempt.id,p_outcome:'FAILED',p_provider_reference:null,
    p_result_metadata:{stage:'paypal_submit'},p_last_error:message,
    p_actor_user_id:null,p_actor_label:'SYSTEM:PAYPAL',p_reason:'PayPal payout submission failed'
   });
   failed++;
  }
 }
 return NextResponse.json({ok:true,processed:(attempts||[]).length,submitted,failed});
}
