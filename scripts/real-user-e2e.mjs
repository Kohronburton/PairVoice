// Opt-in real browser E2E. Requires staging-only accounts and an approved mailbox adapter.
// No synthetic success: absent prerequisites => BLOCKED (exit 2), never PASS.
import {chromium} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
const base='https://staging.pairvoice.com',out='test-results/real-user';
mkdirSync(out,{recursive:true});
const report={target:base,status:'BLOCKED',checks:[],blockers:[]};
const save=()=>{writeFileSync(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));};
const required=['PAIRVOICE_E2E_EMAIL_A','PAIRVOICE_E2E_EMAIL_B','PAIRVOICE_E2E_CAMPAIGN_SLUG','PAIRVOICE_E2E_MAILBOX_ADAPTER_URL','PAIRVOICE_E2E_MAILBOX_ADAPTER_TOKEN'];
for(const key of required)if(!process.env[key])report.blockers.push(key+' is not configured');
if(process.env.PAIRVOICE_E2E_STAGING_ONLY!=='true')report.blockers.push('PAIRVOICE_E2E_STAGING_ONLY=true required');
if(report.blockers.length){save();process.exit(2);}
const emails=[process.env.PAIRVOICE_E2E_EMAIL_A,process.env.PAIRVOICE_E2E_EMAIL_B];
if(emails.some(x=>!x.toLowerCase().includes('+e2e-'))){report.blockers.push('Synthetic test identities must use +e2e- aliases');save();process.exit(2);}
if(emails[0]===emails[1]){report.blockers.push('A and B must be distinct identities');save();process.exit(2);}
const adapter=new URL(process.env.PAIRVOICE_E2E_MAILBOX_ADAPTER_URL);
if(adapter.protocol!=='https:'||adapter.username||adapter.password||adapter.search||adapter.hash||!adapter.hostname.endsWith('.pairvoice.com')){report.blockers.push('Mailbox adapter must be a dedicated HTTPS pairvoice.com host without embedded credentials');save();process.exit(2);}
const browser=await chromium.launch({headless:true});
try{
 const contexts=await Promise.all([browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),browser.newContext({viewport:{width:360,height:740},isMobile:true,hasTouch:true})]);
 for(let i=0;i<2;i++){
  const page=await contexts[i].newPage();
  const label=i?'B':'A';
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const response=await page.goto(base+'/join?campaign='+encodeURIComponent(process.env.PAIRVOICE_E2E_CAMPAIGN_SLUG),{waitUntil:'domcontentloaded',timeout:30000});
  await page.screenshot({path:out+'/participant-'+label+'-join.png',fullPage:true});
  const inputs=await page.locator('input').evaluateAll(els=>els.map(e=>({name:e.getAttribute('name'),type:e.getAttribute('type'),required:e.required})));
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2);
  const buttonVisible=await page.getByRole('button',{name:/create account|crear cuenta/i}).first().isVisible().catch(()=>false);
  const pass=response?.status()===200&&!errors.length&&!overflow&&buttonVisible&&inputs.some(x=>x.type==='email')&&inputs.some(x=>x.name==='first_name')&&inputs.some(x=>x.name==='phone');
  report.checks.push({name:'Participant '+label+' campaign join form',status:pass?'PASS':'FAIL',http:response?.status(),inputNames:inputs.map(x=>x.name),overflow,buttonVisible,errors});
  await contexts[i].close();
 }
 report.blockers.push('Authenticated submission and mailbox OTP verification are not implemented; adapter contract and fixtures must be validated before enabling writes.');
 report.status=report.checks.every(x=>x.status==='PASS')?'BLOCKED':'FAIL';
}catch(e){report.status='FAIL';report.checks.push({name:'browser execution',status:'FAIL',error:String(e)});}
finally{await browser.close();save();}
process.exit(report.status==='FAIL'?1:2);
