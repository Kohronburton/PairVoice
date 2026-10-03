import {NextRequest,NextResponse} from 'next/server';
import {serviceClient} from '../../../../lib/supabase-server';
import {verifyPayPalWebhook} from '../../../../lib/paypal';

type PayPalEvent={id?:string;event_type?:string;resource?:Record<string,any>};

function outcomeFor(type:string){
 if(type==='PAYMENT.PAYOUTS-ITEM.SUCCEEDED')return 'SUCCEEDED';
 if(['PAYMENT.PAYOUTS-ITEM.HELD','PAYMENT.PAYOUTS-ITEM.UNCLAIMED'].includes(type))return 'MANUAL_REVIEW';
 if(['PAYMENT.PAYOUTS-ITEM.FAILED','PAYMENT.PAYOUTS-ITEM.BLOCKED','PAYMENT.PAYOUTS-ITEM.CANCELED','PAYMENT.PAYOUTS-ITEM.RETURNED','PAYMENT.PAYOUTS-ITEM.REFUNDED'].includes(type))return 'FAILED';
 return null;
}

export async function POST(req:NextRequest){
 const event=await req.json() as PayPalEvent;
 const valid=await verifyPayPalWebhook(req.headers,event).catch(()=>false);
 if(!valid)return NextResponse.json({error:'Invalid PayPal webhook signature.'},{status:400});

 const type=String(event.event_type||''),outcome=outcomeFor(type);
 if(!outcome)return NextResponse.json({ok:true,ignored:true});

 const resource=event.resource||{};
 const attemptId=String(resource.sender_item_id||'');
 if(!attemptId)return NextResponse.json({ok:true,ignored:true,reason:'sender_item_id_missing'});

 const providerReference=String(resource.payout_item_id||resource.transaction_id||resource.payout_batch_id||'')||null;
 const db=serviceClient();
 const {data:attempt}=await db.from('provider_payout_attempts').select('id,state').eq('id',attemptId).eq('provider','paypal-payouts').maybeSingle();
 if(!attempt)return NextResponse.json({ok:true,ignored:true,reason:'attempt_not_found'});
 if(['SUCCEEDED','FAILED'].includes(String(attempt.state)))return NextResponse.json({ok:true,duplicate:true});

 const {error}=await db.rpc('reconcile_payout_attempt',{
  p_attempt_id:attemptId,p_outcome:outcome,p_provider_reference:providerReference,
  p_result_metadata:{paypal_event_id:event.id||null,paypal_event_type:type,resource},
  p_last_error:outcome==='FAILED'?String(resource.errors?.[0]?.message||resource.status||type):null,
  p_actor_user_id:null,p_actor_label:'SYSTEM:PAYPAL_WEBHOOK',
  p_reason:`Verified PayPal webhook ${type}`
 });
 if(error){
  console.error(error);
  return NextResponse.json({error:'Unable to reconcile payout webhook.'},{status:409});
 }
 return NextResponse.json({ok:true});
}
