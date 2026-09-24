import {NextRequest,NextResponse} from 'next/server';
import {requireAdmin} from '../../../../lib/admin-server';

export async function GET(){
 const admin=await requireAdmin(['SUPER_ADMIN','PAYMENTS']);
 if(!admin)return NextResponse.json({error:'Forbidden'},{status:403});
 const {data,error}=await admin.db.from('participant_payout_methods')
  .select('id,participant_id,provider,label,status,is_default,created_at,participants(first_name,email,public_code)')
  .in('status',['PENDING','VERIFIED']).order('created_at',{ascending:true}).limit(100);
 if(error)return NextResponse.json({error:'Unable to load payout methods.'},{status:500});
 return NextResponse.json({methods:data||[]});
}

export async function PATCH(req:NextRequest){
 const admin=await requireAdmin(['SUPER_ADMIN','PAYMENTS']);
 if(!admin)return NextResponse.json({error:'Forbidden'},{status:403});
 try{
  const b=await req.json(),status=String(b.status||'').toUpperCase();
  if(!b.methodId||!['VERIFIED','DISABLED'].includes(status)||!String(b.reason||'').trim())
   return NextResponse.json({error:'methodId, VERIFIED/DISABLED status and reason are required.'},{status:400});
  const {data:before}=await admin.db.from('participant_payout_methods').select('id,participant_id,provider,status,is_default').eq('id',String(b.methodId)).maybeSingle();
  if(!before)return NextResponse.json({error:'Payout method not found.'},{status:404});
  const {error}=await admin.db.from('participant_payout_methods').update({status}).eq('id',before.id);
  if(error)return NextResponse.json({error:'Unable to update payout method.'},{status:500});
  await admin.db.from('audit_events').insert({
   actor_user_id:admin.user.id,actor_label:`ADMIN:${admin.role}`,role:admin.role,
   operation:'PAYOUT_METHOD_'+status,resource_type:'PAYOUT_METHOD',resource_id:before.id,
   before_data:{status:before.status,provider:before.provider},after_data:{status,provider:before.provider},reason:String(b.reason)
  });
  return NextResponse.json({ok:true});
 }catch(e){console.error(e);return NextResponse.json({error:'Unable to update payout method.'},{status:500})}
}
