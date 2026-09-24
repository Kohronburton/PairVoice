import {NextRequest,NextResponse} from 'next/server';
import {sessionClient,serviceClient} from '../../../lib/supabase-server';
import {encryptSecret} from '../../../lib/credential-crypto';

async function current(){
 const auth=await sessionClient(),{data}=await auth.auth.getUser();
 if(!data.user)return null;
 const db=serviceClient();
 const {data:participant}=await db.from('participants').select('id').eq('auth_user_id',data.user.id).maybeSingle();
 return participant?{db,participant}:null;
}

export async function GET(){
 const ctx=await current();if(!ctx)return NextResponse.json({error:'Sign in required.'},{status:401});
 const {data,error}=await ctx.db.from('participant_payout_methods')
  .select('id,provider,label,status,is_default,created_at,updated_at')
  .eq('participant_id',ctx.participant.id).neq('status','DISABLED').order('created_at',{ascending:false});
 if(error)return NextResponse.json({error:'Unable to load payout methods.'},{status:500});
 return NextResponse.json({methods:data||[]});
}

export async function POST(req:NextRequest){
 const ctx=await current();if(!ctx)return NextResponse.json({error:'Sign in required.'},{status:401});
 try{
  const b=await req.json(),provider=String(b.provider||'').toUpperCase(),reference=String(b.recipientReference||'').trim(),label=String(b.label||'').trim();
  if(!['PAYPAL','CASH_APP','MANUAL'].includes(provider)||!reference)return NextResponse.json({error:'A supported payout method and recipient are required.'},{status:400});
  if(reference.length>255||label.length>120)return NextResponse.json({error:'Payout method details are too long.'},{status:400});
  await ctx.db.from('participant_payout_methods').update({is_default:false}).eq('participant_id',ctx.participant.id).neq('status','DISABLED');
  const {data,error}=await ctx.db.from('participant_payout_methods').insert({
   participant_id:ctx.participant.id,provider,provider_recipient_reference:encryptSecret(reference),label:label||provider,status:'PENDING',is_default:true
  }).select('id,provider,label,status,is_default,created_at').single();
  if(error){console.error(error);return NextResponse.json({error:'Unable to save payout method.'},{status:500})}
  return NextResponse.json({ok:true,method:data});
 }catch(e){console.error(e);return NextResponse.json({error:'Unable to save payout method.'},{status:500})}
}
