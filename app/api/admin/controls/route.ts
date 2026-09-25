import {NextRequest,NextResponse} from 'next/server';
import {requireAdmin} from '../../../../lib/admin-server';

export async function GET(){
 const admin=await requireAdmin();
 if(!admin)return NextResponse.json({error:'Forbidden'},{status:403});
 const {data,error}=await admin.db.from('subsystem_controls').select('subsystem,enabled,reason,updated_at').order('subsystem');
 if(error)return NextResponse.json({error:'Unable to load controls.'},{status:500});
 return NextResponse.json({controls:data||[]});
}

export async function PATCH(req:NextRequest){
 const admin=await requireAdmin(['SUPER_ADMIN']);
 if(!admin)return NextResponse.json({error:'Forbidden'},{status:403});
 try{
  const b=await req.json();
  if(!b.subsystem||typeof b.enabled!=='boolean'||!String(b.reason||'').trim())
   return NextResponse.json({error:'subsystem, enabled and reason are required.'},{status:400});
  const {error}=await admin.db.rpc('set_subsystem_control',{
   p_subsystem:String(b.subsystem).toUpperCase(),p_enabled:b.enabled,p_reason:String(b.reason),
   p_actor_user_id:admin.user.id,p_actor_label:`ADMIN:${admin.role}`
  });
  if(error)return NextResponse.json({error:error.message},{status:400});
  return NextResponse.json({ok:true});
 }catch(e){console.error(e);return NextResponse.json({error:'Unable to update subsystem control.'},{status:500})}
}
