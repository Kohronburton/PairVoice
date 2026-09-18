import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';

export async function POST(req:NextRequest){
 try{
  const b=await req.json();
  const {inviteCode,firstName,email,phone,country,language,accent,is18Plus,consent}=b;
  if(!inviteCode||!firstName||!email||!country||!language||!accent||is18Plus!==true||consent!==true){
   return NextResponse.json({error:'All required fields, age confirmation, and consent are required.'},{status:400});
  }
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)return NextResponse.json({error:'Not configured'},{status:503});
  const db=createClient(url,key,{auth:{persistSession:false}});
  const {data:pair}=await db.from('pairs').select('id,user_a,status').eq('invite_code',String(inviteCode).toUpperCase()).maybeSingle();
  if(!pair||pair.status!=='invited')return NextResponse.json({error:'Invite is invalid or already used.'},{status:400});
  const {data:owner}=await db.from('profiles').select('referral_code').eq('id',pair.user_a).single();
  const {data:user,error}=await db.from('profiles').insert({
   first_name:String(firstName).trim(),email:String(email).trim().toLowerCase(),phone:phone||null,country,
   primary_language:language,accent:String(accent).trim(),referred_by:pair.user_a,is_18_plus:true,consent_contact:true
  }).select('id,referral_code').single();
  if(error){if(error.code==='23505')return NextResponse.json({error:'This email is already registered.'},{status:409});throw error;}
  const {error:updateError}=await db.from('pairs').update({user_b:user.id,status:'complete'}).eq('id',pair.id).eq('status','invited');
  if(updateError)throw updateError;
  return NextResponse.json({ok:true,referralCode:user.referral_code,originalReferrer:owner?.referral_code});
 }catch(e){console.error(e);return NextResponse.json({error:'Unable to join pair.'},{status:500})}
}
