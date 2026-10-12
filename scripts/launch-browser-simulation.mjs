import {chromium,devices} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
const base='https://staging.pairvoice.com';
const out='test-results/browser';
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const results=[];
async function run(name,fn){
 try{await fn();results.push({name,result:'PASS'});}
 catch(e){results.push({name,result:'FAIL',error:String(e).slice(0,400)});}
}
const contextA=await browser.newContext({...devices['iPhone 13'],browserName:undefined});
const contextB=await browser.newContext({...devices['iPhone 13'],browserName:undefined});
const a=await contextA.newPage(),b=await contextB.newPage();
for(const [name,page] of [['participant-a',a],['participant-b',b]]){
 page.on('pageerror',e=>results.push({name:name+' javascript error',result:'FAIL',error:e.message}));
 await run(name+' landing page',async()=>{
  const response=await page.goto(base,{waitUntil:'domcontentloaded',timeout:30000});
  if(!response||response.status()>=400)throw Error('HTTP '+response?.status());
  await page.screenshot({path:`${out}/${name}-home.png`,fullPage:true});
 });
 await run(name+' isolated anonymous session',async()=>{
  const cookies=await page.context().cookies(base);
  if(cookies.some(c=>/auth-token|access-token/.test(c.name)))throw Error('Unexpected auth session');
 });
}
await run('confirmation without token cannot sign in',async()=>{
 await a.goto(base+'/auth/confirm',{waitUntil:'domcontentloaded'});
 await a.screenshot({path:out+'/invalid-confirmation.png'});
 if(new URL(a.url()).pathname==='/dashboard')throw Error('Invalid token authenticated user');
 const current=new URL(a.url());
 if(current.pathname==='/auth/confirm' || current.pathname==='/404' || current.pathname==='/_not-found')throw Error('Confirmation endpoint did not reject the token via an auth redirect');
 const body=await a.locator('body').innerText();
 if(/404|page could not be found/i.test(body.slice(0,350)))throw Error('Confirmation route missing on staging (404)');
});
await run('anonymous payout cannot create payout',async()=>{
 const r=await a.request.post(base+'/api/payout',{data:{amountCents:100,currency:'USD',idempotencyKey:'browser-anon-test'}});
 if(![401,403].includes(r.status()))throw Error('Unexpected payout response '+r.status());
});
await run('anonymous partner API denied',async()=>{
 const r=await b.request.get(base+'/api/existing-partner');
 if(![401,403].includes(r.status()))throw Error('Unexpected partner response '+r.status());
});
await run('work without pair ID rejected',async()=>{
 const r=await b.request.get(base+'/api/work/access');
 if(r.status()!==400)throw Error('Unexpected work response '+r.status());
});
await browser.close();
writeFileSync(out+'/results.json',JSON.stringify({base,results},null,2));
const passed=results.filter(r=>r.result==='PASS').length;
const report=['# PairVoice mobile browser simulation',`Result: ${passed}/${results.length} passed`,'','| Test | Result | Detail |','|---|---|---|',...results.map(r=>`| ${r.name} | ${r.result} | ${(r.error||'').replaceAll('|','/')} |`),'','**Scope:** two isolated anonymous iPhone-sized browser contexts. Real signup, confirmation, pair acceptance, gig and payout require staging fixtures and remain unverified.'];
writeFileSync(out+'/report.md',report.join('\n'));
console.log(report.join('\n'));
if(process.env.GITHUB_STEP_SUMMARY)writeFileSync(process.env.GITHUB_STEP_SUMMARY,report.join('\n')+'\n',{flag:'a'});
if(passed!==results.length)process.exitCode=1;
