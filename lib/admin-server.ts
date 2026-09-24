import {sessionClient,serviceClient} from './supabase-server';

export type AdminRole='SUPER_ADMIN'|'OPERATIONS'|'QA_REVIEWER'|'PAYMENTS'|'SUPPORT'|'VIEW_ONLY';

export async function requireAdmin(allowed?:AdminRole[]){
 const auth=await sessionClient();
 const {data}=await auth.auth.getUser();
 if(!data.user)return null;
 const db=serviceClient();
 const {data:membership}=await db.from('admin_memberships').select('role,active').eq('user_id',data.user.id).maybeSingle();
 if(!membership?.active)return null;
 const role=membership.role as AdminRole;
 if(allowed&&!allowed.includes(role))return null;
 return {user:data.user,role,db};
}
