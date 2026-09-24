import {NextRequest,NextResponse} from 'next/server';
import {sessionClient,serviceClient} from '../../../lib/supabase-server';

export async function POST(req:NextRequest){
 try{
  const auth=await sessionClient(),{data}=await auth.auth.getUser();
  if(!data.user)return NextResponse.json({error:'Sign in required.'},{status:401});
  const db=serviceClient();
  const {data:participant}=await db.from('participants').select('id').eq('auth_user_id',data.user.id).maybeSingle();
  if(!participant)return NextResponse.json({error:'PairVoice participant not found.'},{status:404});
  const b=await req.json(),amount=Number(b.amountCents),currency=String(b.currency||'USD').toUpperCase();
  if(!Number.isInteger(amount)||amount<=0)return NextResponse.json({error:'A valid payout amount is required.'},{status:400});
  const key=String(b.idempotencyKey||crypto.randomUUID());
  const {data:payoutId,error}=await db.rpc('request_participant_payout',{
   p_participant_id:participant.id,p_amount_cents:amount,p_currency:currency,p_idempotency_key:key
  });
  if(error){
   const m=String(error.message||'');
   const message=m.includes('verified_default')?'Add and verify a default payout method first.':m.includes('insufficient')?'Your available balance is lower than this request.':'Unable to request payout.';
   return NextResponse.json({error:message},{status:409});
  }
  return NextResponse.json({ok:true,payoutId});
 }catch(e){console.error(e);return NextResponse.json({error:'Unable to request payout.'},{status:500})}
}
