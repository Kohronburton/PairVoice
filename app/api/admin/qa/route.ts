import {NextRequest,NextResponse} from 'next/server';
import {requireAdmin} from '../../../../lib/admin-server';

const stages=new Set(['INTERNAL','CLIENT']);
const decisions=new Set(['PENDING','APPROVED','REWORK_REQUIRED','REJECTED']);

export async function POST(req:NextRequest){
 const admin=await requireAdmin(['SUPER_ADMIN','QA_REVIEWER','OPERATIONS']);
 if(!admin)return NextResponse.json({error:'Forbidden'},{status:403});
 try{
  const b=await req.json(),stage=String(b.stage||'').toUpperCase(),decision=String(b.decision||'').toUpperCase();
  if(!b.pairId||!stages.has(stage)||!decisions.has(decision)||!b.idempotencyKey)
   return NextResponse.json({error:'pairId, valid stage/decision, and idempotencyKey are required.'},{status:400});
  const {data,error}=await admin.db.rpc('record_pair_review',{
   p_pair_id:String(b.pairId),p_stage:stage,p_decision:decision,
   p_notes:b.notes?String(b.notes):null,p_external_reference:b.externalReference?String(b.externalReference):null,
   p_actor_user_id:admin.user.id,p_actor_label:`ADMIN:${admin.role}`,p_idempotency_key:String(b.idempotencyKey)
  });
  if(error){console.error(error);return NextResponse.json({error:error.message},{status:409})}
  return NextResponse.json(data);
 }catch(e){console.error(e);return NextResponse.json({error:'Unable to record review.'},{status:500})}
}
