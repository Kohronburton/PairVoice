import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
 try {
  const body = await req.json();
  const { firstName,email,phone,country,language,accent,ref,campaign,is18Plus,consent } = body;
  if (!firstName || !email || !country || !language || !accent || !is18Plus || !consent) return NextResponse.json({error:'Missing required fields'},{status:400});
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL, key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key) return NextResponse.json({error:'Signup service is not configured'},{status:503});
  const db=createClient(url,key,{auth:{persistSession:false}});
  let referredBy=null, campaignId=null;
  if(ref){ const {data}=await db.from('profiles').select('id').eq('referral_code',String(ref).toUpperCase()).maybeSingle(); referredBy=data?.id??null; }
  if(campaign){ const {data}=await db.from('campaigns').select('id').eq('slug',campaign).maybeSingle(); campaignId=data?.id??null; }
  const {data,error}=await db.from('profiles').insert({first_name:firstName.trim(),email:email.trim().toLowerCase(),phone:phone||null,country,primary_language:language,accent:accent.trim(),referred_by:referredBy,campaign_id:campaignId,is_18_plus:true,consent_contact:true}).select('id,referral_code').single();
  if(error){ if(error.code==='23505') return NextResponse.json({error:'This email is already registered.'},{status:409}); throw error; }
  const {data:pair,error:pairError}=await db.from('pairs').insert({user_a:data.id}).select('invite_code').single();
  if(pairError) throw pairError;
  return NextResponse.json({ok:true,referralCode:data.referral_code,inviteCode:pair.invite_code});
 } catch(e){ console.error(e); return NextResponse.json({error:'Unable to complete signup.'},{status:500}); }
}
