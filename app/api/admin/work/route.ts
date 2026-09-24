import {NextRequest,NextResponse} from 'next/server';
import {requireAdmin} from '../../../../lib/admin-server';

export async function POST(req:NextRequest){
 const admin=await requireAdmin(['SUPER_ADMIN','OPERATIONS']);
 if(!admin)return NextResponse.json({error:'Forbidden'},{status:403});
 try{
  const b=await req.json();
  if(!b.runId||!b.toState||!b.idempotencyKey)return NextResponse.json({error:'runId, toState and idempotencyKey are required.'},{status:400});
  const {data,error}=await admin.db.rpc('transition_work_provider_run',{
   p_run_id:String(b.runId),
   p_to_state:String(b.toState).toUpperCase(),
   p_external_reference:b.externalReference?String(b.externalReference):null,
   p_result_metadata:b.resultMetadata&&typeof b.resultMetadata==='object'?b.resultMetadata:{},
   p_last_error:b.lastError?String(b.lastError):null,
   p_idempotency_key:String(b.idempotencyKey)
  });
  if(error){console.error(error);return NextResponse.json({error:error.message},{status:400})}
  return NextResponse.json(data);
 }catch(e){console.error(e);return NextResponse.json({error:'Unable to transition work.'},{status:500})}
}
