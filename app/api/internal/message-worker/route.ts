import {NextRequest,NextResponse} from 'next/server';
import {serviceClient} from '../../../../lib/supabase-server';
import {sendLifecycleEmail} from '../../../../lib/email';

export const runtime='nodejs';

export async function POST(req:NextRequest){
 const expected=process.env.PAIRVOICE_WORKER_SECRET;
 if(!expected)return NextResponse.json({error:'Worker secret is not configured.'},{status:503});
 const supplied=req.headers.get('authorization');
 if(supplied!==`Bearer ${expected}`)return NextResponse.json({error:'Forbidden'},{status:403});

 const db=serviceClient();
 const {data:events,error}=await db.rpc('claim_message_outbox',{p_limit:20});
 if(error){console.error(error);return NextResponse.json({error:'Unable to claim message outbox.'},{status:500})}

 let delivered=0,failed=0;
 const appUrl=(process.env.NEXT_PUBLIC_APP_URL||'https://pairvoice.com').replace(/\/$/,'');
 for(const event of events||[]){
  try{
   const payload=(event.payload||{}) as Record<string,unknown>;
   const participantId=String(payload.participant_id||'');
   const templateKey=String(payload.template_key||'') as 'PAIR_FORMED'|'WORK_READY'|'SUBMISSION_RECEIVED'|'REWORK_REQUIRED'|'APPROVED'|'REJECTED'|'PAYOUT_PAID';
   const {data:participant,error:participantError}=await db.from('participants').select('first_name,email,primary_language_code').eq('id',participantId).single();
   if(participantError||!participant?.email)throw new Error('Participant email unavailable');
   const language=participant.primary_language_code==='es'?'es':'en';
   const result=await sendLifecycleEmail({to:participant.email,firstName:participant.first_name,language,templateKey,dashboardUrl:`${appUrl}/dashboard`});
   if(!result.sent)throw new Error('Email provider is not configured');
   const {error:finishError}=await db.rpc('finish_message_outbox',{p_event_id:event.id,p_success:true,p_error:null});
   if(finishError)throw finishError;
   delivered++;
  }catch(e){
   failed++;
   const message=e instanceof Error?e.message:'delivery_failed';
   const {error:finishError}=await db.rpc('finish_message_outbox',{p_event_id:event.id,p_success:false,p_error:message});
   if(finishError)console.error('Unable to mark message failure',finishError);
  }
 }
 return NextResponse.json({ok:true,claimed:(events||[]).length,delivered,failed});
}
