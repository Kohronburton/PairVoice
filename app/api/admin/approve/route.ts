import {NextRequest,NextResponse} from 'next/server';
import {requireAdmin} from '../../../../lib/admin-server';

export async function POST(req:NextRequest){
 const admin=await requireAdmin(['SUPER_ADMIN','QA_REVIEWER','OPERATIONS']);
 if(!admin)return NextResponse.json({error:'Forbidden'},{status:403});
 try{
  const b=await req.json();
  if(!b.pairId||!b.idempotencyKey)return NextResponse.json({error:'pairId and idempotencyKey are required.'},{status:400});
  const {data,error}=await admin.db.rpc('approve_pair_and_create_earnings',{
   p_pair_id:String(b.pairId),p_idempotency_key:String(b.idempotencyKey),p_actor_label:`ADMIN:${admin.role}`
  });
  if(error){console.error(error);return NextResponse.json({error:error.message},{status:400})}
  return NextResponse.json(data);
 }catch(e){console.error(e);return NextResponse.json({error:'Unable to approve pair.'},{status:500})}
}
