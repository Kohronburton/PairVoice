const site=process.env.PAIRVOICE_SITE_URL;
const secret=process.env.PAIRVOICE_INTERNAL_SECRET;
if(!site||!secret){
 console.error('PAIRVOICE_SITE_URL and PAIRVOICE_INTERNAL_SECRET are required');
 process.exit(1);
}
const endpoints=['/api/internal/outbox','/api/internal/payouts'];
let failed=false;
for(const path of endpoints){
 try{
  const r=await fetch(site+path,{method:'POST',headers:{Authorization:`Bearer ${secret}`}});
  const text=await r.text();
  console.log(path,r.status,text);
  if(!r.ok)failed=true;
 }catch(error){
  console.error(path,error);
  failed=true;
 }
}
if(failed)process.exit(1);
