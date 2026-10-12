// Opt-in real browser E2E. Requires staging-only accounts and an approved mailbox adapter.
// No synthetic success: absent prerequisites => BLOCKED (exit 2), never PASS.
import {chromium} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
const base='https://staging.pairvoice.com',out='test-results/real-user';
mkdirSync(out,{recursive:true});
const report={target:base,status:'BLOCKED',checks:[],blockers:[]};
const safeError=e=>String(e?.message||e||'unknown failure').replace(/token_hash=[^&\s]+/gi,'token_hash=[REDACTED]').replace(/Bearer\s+[^\s]+/gi,'Bearer [REDACTED]');
const save=()=>{writeFileSync(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));};
const required=['PAIRVOICE_E2E_PHONE_A','PAIRVOICE_E2E_PHONE_B','PAIRVOICE_E2E_EMAIL_A','PAIRVOICE_E2E_EMAIL_B','PAIRVOICE_E2E_CAMPAIGN_SLUG','PAIRVOICE_E2E_MAILBOX_ADAPTER_URL','PAIRVOICE_E2E_MAILBOX_ADAPTER_TOKEN'];
for(const key of required)if(!process.env[key])report.blockers.push(key+' is not configured');
if(process.env.PAIRVOICE_E2E_STAGING_ONLY!=='true')report.blockers.push('PAIRVOICE_E2E_STAGING_ONLY=true required');
if(report.blockers.length){save();process.exit(2);}
const emails=[process.env.PAIRVOICE_E2E_EMAIL_A,process.env.PAIRVOICE_E2E_EMAIL_B];
if(emails.some(x=>!/^[-a-z0-9._]+\+e2e-[a-z0-9-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(x))){report.blockers.push('Synthetic test identities must use +e2e- aliases');save();process.exit(2);}
if(emails[0]===emails[1]){report.blockers.push('A and B must be distinct identities');save();process.exit(2);}
const adapter=new URL(process.env.PAIRVOICE_E2E_MAILBOX_ADAPTER_URL);
if(adapter.protocol!=='https:'||adapter.username||adapter.password||adapter.search||adapter.hash||adapter.pathname!=='/'||adapter.hostname==='pairvoice.com'||!adapter.hostname.endsWith('.pairvoice.com')){report.blockers.push('Mailbox adapter must be a dedicated HTTPS pairvoice.com host without embedded credentials');save();process.exit(2);}
const runId='pairvoice-e2e-'+Date.now();
const mailbox=async(email)=>{for(let n=0;n<12;n++){const url=new URL('/v1/test-messages/latest',adapter);url.searchParams.set('recipient',email);url.searchParams.set('runId',runId);const r=await fetch(url,{headers:{authorization:'Bearer '+process.env.PAIRVOICE_E2E_MAILBOX_ADAPTER_TOKEN},redirect:'error',signal:AbortSignal.timeout(10000)});if(r.status===404||r.status===204){await new Promise(resolve=>setTimeout(resolve,5000));continue;}if(!r.ok)throw new Error('Mailbox adapter HTTP '+r.status);const body=await r.json();if(typeof body.confirmUrl!=='string')throw new Error('Mailbox adapter response missing confirmUrl');const link=new URL(body.confirmUrl);if(link.origin!==base||link.pathname!=='/auth/confirm'||!link.searchParams.get('token_hash'))throw new Error('Mailbox adapter returned invalid confirmation URL');return link.toString();}throw new Error('Test confirmation email not received within 60 seconds');};
const browser=await chromium.launch({headless:true});
try{
 const contexts=await Promise.all([browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),browser.newContext({viewport:{width:360,height:740},isMobile:true,hasTouch:true})]);
 for(let i=0;i<2;i++){
  const page=await contexts[i].newPage();
  const label=i?'B':'A';
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const response=await page.goto(base+'/join?campaign='+encodeURIComponent(process.env.PAIRVOICE_E2E_CAMPAIGN_SLUG),{waitUntil:'domcontentloaded',timeout:30000});
  await page.locator('[name="email"]').waitFor({state:'visible',timeout:15000});
  await page.screenshot({path:out+'/participant-'+label+'-join.png',fullPage:true});
  const inputs=await page.locator('input').evaluateAll(els=>els.map(e=>({name:e.getAttribute('name'),type:e.getAttribute('type'),required:e.required})));
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2);
  const buttonVisible=await page.getByRole('button',{name:/create account|crear cuenta/i}).first().isVisible().catch(()=>false);
  const pass=response?.status()===200&&!errors.length&&!overflow&&buttonVisible&&inputs.some(x=>x.type==='email')&&inputs.some(x=>x.name==='first_name')&&inputs.some(x=>x.name==='phone');
  report.checks.push({name:'Participant '+label+' campaign join form',status:pass?'PASS':'FAIL',http:response?.status(),inputNames:inputs.map(x=>x.name),overflow,buttonVisible,errors});
  if(!pass)throw new Error('Participant '+label+' join form failed preflight');
  await page.locator('[name="first_name"]').fill('PairVoiceTest'+label);
  await page.locator('[name="email"]').fill(emails[i]);
  await page.locator('[name="phone"]').fill(process.env['PAIRVOICE_E2E_PHONE_'+label]||'');
  await page.locator('[name="age"]').check();await page.locator('[name="consent"]').check();
  await page.getByRole('button',{name:/create account|crear cuenta/i}).first().click();
  const success=await page.getByRole('heading',{name:/check your email|revisa tu correo/i}).isVisible({timeout:20000}).catch(()=>false);
  report.checks.push({name:'Participant '+label+' signup and email dispatch',status:success?'PASS':'FAIL'});
  if(!success)throw new Error('Signup or email dispatch failed for '+label);
  const link=await mailbox(emails[i]);
  const confirm=await page.goto(link,{waitUntil:'domcontentloaded'});
  if(confirm?.status()!==200)throw new Error('Confirmation landing HTTP '+confirm?.status());
  const confirmButton=page.getByRole('button',{name:/continue to pairvoice|confirm|continue|verify|sign in|entrar|confirmar/i}).first();
  if(!await confirmButton.isVisible({timeout:10000}).catch(()=>false))throw new Error('Explicit scanner-safe confirmation button missing');
  await confirmButton.click();
  await page.waitForURL(url=>url.origin===base&&url.pathname==='/dashboard',{timeout:20000});
  report.checks.push({name:'Participant '+label+' verified email and dashboard',status:'PASS'});
  await contexts[i].close();
 }
 report.blockers.push('Partner acceptance, work approval and sandbox payout journey are not implemented; release remains BLOCKED.');
 report.status=report.checks.every(x=>x.status==='PASS')?'BLOCKED':'FAIL';
}catch(e){report.status='FAIL';report.checks.push({name:'browser execution',status:'FAIL',error:safeError(e)});}
finally{await browser.close();save();}
process.exit(report.status==='FAIL'?1:2);
