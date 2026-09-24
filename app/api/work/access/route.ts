import {NextRequest,NextResponse} from 'next/server';
import {sessionClient,serviceClient} from '../../../lib/supabase-server';

async function context(pairId:string){
 const auth=await sessionClient(),{data}=await auth.auth.getUser();
 if(!data.user)return null;
 const db=serviceClient();
 const {data:participant}=await db.from('participants').select('id').eq('auth_user_id',data.user.id).maybeSingle();
 if(!participant)return null;
 const {data:enrollments}=await db.from('campaign_enrollments').select('id').eq('participant_id',participant.id);
 const ids=(enrollments||[]).map(e=>e.id);
 if(!ids.length)return null;
 const {data:member}=await db.from('pair_members').select('pair_id').eq('pair_id',pairId).in('enrollment_id',ids).eq('active',true).maybeSingle();
 if(!member)return null;
 return {db,participant};
}

export async function GET(req:NextRequest){
 const pairId=req.nextUrl.searchParams.get('pairId')||'';
 if(!pairId)return NextResponse.json({error:'pairId is required.'},{status:400});
 const ctx=await context(pairId);if(!ctx)return NextResponse.json({error:'Forbidden'},{status:403});
 const {data,error}=await ctx.db.rpc('prepare_pair_work_access',{p_pair_id:pairId,p_idempotency_key:`work:prepare:${pairId}`});
 if(error){const m=String(error.message||'');return NextResponse.json({error:m.includes('not_ready')?'This pair is not ready for work yet.':m.includes('not_bound')?'Work provider is not configured for this campaign.':'Unable to prepare work access.'},{status:409})}
 return NextResponse.json(data);
}

export async function POST(req:NextRequest){
 try{
  const b=await req.json(),pairId=String(b.pairId||''),runId=String(b.runId||''),action=String(b.action||'').toUpperCase();
  if(!pairId||!runId||!['START','SUBMIT'].includes(action))return NextResponse.json({error:'pairId, runId and START/SUBMIT action are required.'},{status:400});
  const ctx=await context(pairId);if(!ctx)return NextResponse.json({error:'Forbidden'},{status:403});
  const {data:run}=await ctx.db.from('work_provider_runs').select('id,pair_id').eq('id',runId).eq('pair_id',pairId).maybeSingle();
  if(!run)return NextResponse.json({error:'Work run not found.'},{status:404});
  const toState=action==='START'?'IN_PROGRESS':'SUBMITTED';
  const {data,error}=await ctx.db.rpc('transition_work_provider_run',{
   p_run_id:runId,p_to_state:toState,p_external_reference:null,
   p_result_metadata:{reported_by:'participant'},p_last_error:null,
   p_idempotency_key:`participant:${ctx.participant.id}:run:${runId}:${toState}`
  });
  if(error){console.error(error);return NextResponse.json({error:error.message},{status:409})}
  return NextResponse.json(data);
 }catch(e){console.error(e);return NextResponse.json({error:'Unable to update work status.'},{status:500})}
}
