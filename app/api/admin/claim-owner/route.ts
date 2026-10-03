import {NextRequest,NextResponse} from 'next/server';
import {sessionClient,serviceClient} from '../../../../lib/supabase-server';

export async function POST(req:NextRequest){
 const configured=String(process.env.PAIRVOICE_OWNER_EMAIL||'').trim().toLowerCase();
 if(!configured)return NextResponse.json({error:'Owner bootstrap is not configured.'},{status:503});

 const auth=await sessionClient(),{data,error}=await auth.auth.getUser();
 if(error||!data.user?.email)return NextResponse.json({error:'Sign in required.'},{status:401});
 if(data.user.email.toLowerCase()!==configured)return NextResponse.json({error:'This account is not the configured PairVoice owner.'},{status:403});

 const db=serviceClient();
 const {count,error:countError}=await db.from('admin_memberships').select('*',{count:'exact',head:true}).eq('active',true);
 if(countError)return NextResponse.json({error:'Unable to inspect admin state.'},{status:500});
 if((count||0)>0){
  const {data:existing}=await db.from('admin_memberships').select('role,active').eq('user_id',data.user.id).maybeSingle();
  if(existing?.active)return NextResponse.json({ok:true,alreadyProvisioned:true,role:existing.role});
  return NextResponse.json({error:'Owner bootstrap is closed because an administrator already exists.'},{status:409});
 }

 const {error:insertError}=await db.from('admin_memberships').insert({user_id:data.user.id,role:'SUPER_ADMIN',active:true});
 if(insertError)return NextResponse.json({error:'Unable to provision owner.'},{status:409});
 await db.from('audit_events').insert({
  actor_user_id:data.user.id,actor_label:'OWNER_BOOTSTRAP',role:'SUPER_ADMIN',
  operation:'OWNER_BOOTSTRAPPED',resource_type:'ADMIN_MEMBERSHIP',resource_id:data.user.id,
  reason:'First authenticated owner claim matched PAIRVOICE_OWNER_EMAIL',
  after_data:{role:'SUPER_ADMIN'}
 });
 return NextResponse.json({ok:true,role:'SUPER_ADMIN'});
}
