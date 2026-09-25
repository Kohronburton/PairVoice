import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{
 status,
 headers:{"content-type":"application/json","cache-control":"no-store"}
});
const validEmail=(value:string)=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const validPhone=(value:string|null)=>!!value&&/^\+[1-9]\d{7,14}$/.test(value);
function authorized(req:Request){
 const expected=Deno.env.get("PAIRVOICE_EDGE_SHARED_SECRET")||"";
 return !!expected&&req.headers.get("x-pairvoice-edge-secret")===expected;
}

Deno.serve(async(req)=>{
 if(req.method==="GET")return json({ok:true,service:"pairvoice-signup"});
 if(req.method!=="POST")return json({error:"Method not allowed."},405);
 if(!authorized(req))return json({error:"Forbidden."},403);
 try{
  const body=await req.json();
  const campaign=String(body.campaign||"").trim();
  const firstName=String(body.firstName||"").trim();
  const email=String(body.email||"").trim().toLowerCase();
  const countryCode=String(body.countryCode||"").trim().toUpperCase();
  const languageCode=String(body.languageCode||"").trim().toLowerCase();
  const phone=body.phone?String(body.phone).trim():null;
  const marketingConsent=body.marketingConsent===true;
  const ref=body.ref?String(body.ref).trim().toUpperCase():null;

  if(!campaign||!firstName||!validEmail(email)||!validPhone(phone)||!countryCode||!languageCode||body.is18Plus!==true||body.consent!==true){
   return json({error:"Campaign, identity, valid phone, eligibility and consent are required."},400);
  }

  const url=Deno.env.get("SUPABASE_URL");
  const secretSet=Deno.env.get("SUPABASE_SECRET_KEYS");
  const legacySecret=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  let secret=legacySecret||"";
  if(secretSet){
   try{secret=JSON.parse(secretSet)?.default||secret}catch{}
  }
  if(!url||!secret)return json({error:"Signup service is not configured."},503);

  const rpc=await fetch(url+"/rest/v1/rpc/register_campaign_participant",{
   method:"POST",
   headers:{"apikey":secret,"authorization":"Bearer "+secret,"content-type":"application/json"},
   body:JSON.stringify({
    p_campaign_slug:campaign,
    p_first_name:firstName,
    p_email:email,
    p_phone:phone,
    p_country_code:countryCode,
    p_language_code:languageCode,
    p_is_18_plus:true,
    p_consent:true,
    p_referral_code:ref,
    p_marketing_consent:marketingConsent
   })
  });

  const raw=await rpc.text();
  let payload:any=null;
  try{payload=raw?JSON.parse(raw):null}catch{payload={message:raw}}

  if(!rpc.ok){
   const msg=String(payload?.message||payload?.error||"");
   if(msg.includes("already_enrolled"))return json({error:"You are already enrolled in this campaign."},409);
   if(msg.includes("eligibility")||msg.includes("campaign_"))return json({error:"You are not eligible for this campaign as submitted."},400);
   console.error("register_campaign_participant failed",rpc.status,msg);
   return json({error:"Unable to complete signup."},500);
  }

  return json(payload);
 }catch(error){
  console.error(error);
  return json({error:"Unable to complete signup."},500);
 }
});
