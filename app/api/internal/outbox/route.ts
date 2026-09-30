import {NextRequest,NextResponse} from 'next/server';
import {serviceClient} from '../../../../lib/supabase-server';
import {sendLifecycleEmail} from '../../../../lib/email';
import {subsystemEnabled} from '../../../../lib/subsystem-controls';

const allowedTemplates=new Set(['PAIR_FORMED','WORK_READY','SUBMISSION_RECEIVED','REWORK_REQUIRED','APPROVED','REJECTED','PAYOUT_PAID']);

function authorized(req:NextRequest){
 const expected=process.env.PAIRVOICE_INTERNAL_SECRET||process.env.CRON_SECRET;
 if(!expected)return false;
 return req.headers.get('authorization')===`Bearer ${expected}`;
}

export async function POST(req:NextRequest){
 if(!authorized(req))return NextResponse.json({error:'Forbidden'},{status:403});
 const db=serviceClient();
 if(!await subsystemEnabled(db,'MESSAGING'))return NextResponse.json({ok:true,paused:true,processed:0});
 const {data:events,error}=await db.rpc('claim_message_outbox',{p_limit:20});
 if(error){console.error(error);return NextResponse.json({error:'Unable to claim message queue.'},{status:500})}
 let delivered=0,failed=0;
 for(const event of events||[]){
  try{
   const payload=(event.payload||{}) as Record<string,unknown>;
   const participantId=String(payload.participant_id||''),pairId=payload.pair_id?String(payload.pair_id):null,templateKey=String(payload.template_key||'');
   if(!participantId||!allowedTemplates.has(templateKey))throw new Error('invalid_lifecycle_payload');
   const {data:participant}=await db.from('participants').select('first_name,email,primary_language_code').eq('id',participantId).maybeSingle();
   if(!participant?.email)throw new Error('participant_email_missing');
   const site=process.env.NEXT_PUBLIC_SITE_URL||new URL(req.url).origin;
   const result=await sendLifecycleEmail({
    to:String(participant.email),firstName:String(participant.first_name||'there'),
    language:participant.primary_language_code==='es'?'es':'en',
    templateKey:templateKey as 'PAIR_FORMED'|'WORK_READY'|'SUBMISSION_RECEIVED'|'REWORK_REQUIRED'|'APPROVED'|'REJECTED'|'PAYOUT_PAID',
    dashboardUrl:`${site}/dashboard`
   });
   if(!result.sent)throw new Error('messaging_provider_not_configured');
   await db.from('message_events').insert({
    participant_id:participantId,pair_id:pairId,channel:'EMAIL',template_key:templateKey,template_version:1,
    status:'SENT',provider_reference:result.providerReference
   });
   await db.rpc('finish_message_outbox',{p_event_id:event.id,p_success:true,p_error:null});
   delivered++;
  }catch(e){
   const message=e instanceof Error?e.message:'delivery_failed';
   await db.rpc('finish_message_outbox',{p_event_id:event.id,p_success:false,p_error:message});
   failed++;
  }
 }
 return NextResponse.json({ok:true,processed:(events||[]).length,delivered,failed});
}
