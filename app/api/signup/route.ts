import{NextRequest,NextResponse}from'next/server';
import{isValidEmail,normalizeEmail}from'../../../lib/validation';

export async function POST(req:NextRequest){
 try{
  const b=await req.json(),email=normalizeEmail(b.email);
  if(!b.campaign||!b.firstName||!isValidEmail(email)||!b.countryCode||!b.languageCode||b.is18Plus!==true||b.consent!==true)
   return NextResponse.json({error:'Campaign, identity, eligibility and consent are required.'},{status:400});

  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if(!url||!key)return NextResponse.json({error:'Signup service is not configured.'},{status:503});

  const response=await fetch(url+'/functions/v1/pairvoice-signup',{
   method:'POST',
   headers:{'content-type':'application/json','apikey':key},
   body:JSON.stringify({
    campaign:String(b.campaign),
    firstName:String(b.firstName).trim(),
    email,
    phone:b.phone?String(b.phone):null,
    countryCode:String(b.countryCode).toUpperCase(),
    languageCode:String(b.languageCode).toLowerCase(),
    is18Plus:true,
    consent:true,
    ref:b.ref?String(b.ref).toUpperCase():null
   }),
   cache:'no-store'
  });

  const data=await response.json().catch(()=>({error:'Unable to complete signup.'}));
  if(!response.ok)return NextResponse.json({error:data.error||'Unable to complete signup.'},{status:response.status});
  return NextResponse.json(data);
 }catch(e){
  console.error(e);
  return NextResponse.json({error:'Unable to complete signup.'},{status:500});
 }
}
