import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{
 status,headers:{"content-type":"application/json","cache-control":"no-store"}
});
const validEmail=(value:string)=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const validPhone=(value:string)=>/^\+[1-9]\d{7,14}$/.test(value);
function authorized(req:Request){
 const expected=Deno.env.get("PAIRVOICE_EDGE_SHARED_SECRET")||"";
 return !!expected&&req.headers.get("x-pairvoice-edge-secret")===expected;
}

Deno.serve(async(req)=>{
 if(req.method==="GET")return json({ok:true,service:"pairvoice-lead"});
 if(req.method!=="POST")return json({error:"Method not allowed."},405);
 if(!authorized(req))return json({error:"Forbidden."},403);
 try{
  const b=await req.json();
  const email=String(b.email||"").trim().toLowerCase();
  const firstName=String(b.first_name||"").trim();
  const phone=String(b.phone||"").trim();
  const market=String(b.market_code||"").trim().toUpperCase();
  const language=String(b.language_code||"").trim().toLowerCase();
  if(!validEmail(email)||!firstName||!validPhone(phone)||!market||!language||b.consent!==true){
   return json({error:"Identity, valid phone and consent are required."},400);
  }

  const url=Deno.env.get("SUPABASE_URL");
  const secretSet=Deno.env.get("SUPABASE_SECRET_KEYS");
  const legacySecret=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  let secret=legacySecret||"";
  if(secretSet){try{secret=JSON.parse(secretSet)?.default||secret}catch{}}
  if(!url||!secret)return json({error:"Lead service is not configured."},503);

  const rpc=await fetch(url+"/rest/v1/rpc/upsert_public_lead_v4",{
   method:"POST",
   headers:{"apikey":secret,"authorization":"Bearer "+secret,"content-type":"application/json"},
   body:JSON.stringify({
    p_email:email,p_first_name:firstName,p_phone:phone,
    p_market_code:market,p_language_code:language,p_consent:true,p_marketing_consent:b.marketing_consent===true,
    p_detected_locale:b.detected_locale,p_detected_languages:b.detected_languages||[],
    p_source:b.source,p_campaign_key:b.campaign_key,p_campaign_slug:b.campaign_slug,
    p_source_external_id:b.source_external_id,p_landing_path:b.landing_path,p_referrer:b.referrer,
    p_referral_code:b.referral_code,p_fbclid:b.fbclid,p_gclid:b.gclid,
    p_utm_source:b.utm_source,p_utm_medium:b.utm_medium,p_utm_campaign:b.utm_campaign,
    p_utm_content:b.utm_content,p_utm_term:b.utm_term
   })
  });
  const raw=await rpc.text();let payload:any=null;try{payload=raw?JSON.parse(raw):null}catch{payload={message:raw}}
  if(!rpc.ok){console.error("upsert_public_lead_v4 failed",rpc.status,payload);return json({error:"Unable to create account."},500)}
  return json(payload);
 }catch(e){console.error(e);return json({error:"Unable to create account."},500)}
});
