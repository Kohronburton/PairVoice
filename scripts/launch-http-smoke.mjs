// Safe, read-only staging launch smoke checks. No emails, accounts, or money.
import {writeFileSync,mkdirSync} from 'node:fs';
const base=(process.env.PAIRVOICE_TEST_BASE_URL||'https://staging.pairvoice.com').replace(/\/$/,'');
const u=new URL(base);
if(u.protocol!=='https:' || !['staging.pairvoice.com','pairvoice-staging.onrender.com'].includes(u.hostname)){
 console.error('Refusing to test a non-allowlisted staging host:',u.hostname);
 process.exit(2);
}
const checks=[
 {name:'Homepage loads',path:'/',allowed:[200]},
 {name:'Join entry loads',path:'/join',allowed:[200,307,308]},
 {name:'Dashboard requires login',path:'/dashboard',allowed:[302,303,307,308,401,403],rejectLocation:'/dashboard'},
 {name:'Missing auth token rejected',path:'/auth/confirm',allowed:[302,303,307,308]},
 {name:'Invalid invite handled',path:'/invite/NOT-A-REAL-CODE',allowed:[200,302,303,307,308,404]},
 {name:'Work access requires pair ID',path:'/api/work/access',allowed:[400]},
 {name:'Unauthenticated payout denied',path:'/api/payout',allowed:[401,403],method:'POST',body:{amountCents:100,currency:'USD',idempotencyKey:'smoke-no-money'}}
];
const results=[];
const deploymentIssues=[];
for(const c of checks){
 const started=Date.now();
 try{
  const response=await fetch(base+c.path,{redirect:'manual',signal:AbortSignal.timeout(15000),headers:c.method?{'content-type':'application/json'}:{},method:c.method||'GET',body:c.body?JSON.stringify(c.body):undefined});
  const location=response.headers.get('location')||'';
  const ok=c.allowed.includes(response.status)&&(!c.rejectLocation||!location.endsWith(c.rejectLocation));
  if(c.path==='/auth/confirm'&&response.status===404)deploymentIssues.push('Scanner-safe auth confirmation route is absent on deployed staging (HTTP 404). Deploy auth PR #25 before expecting this check to pass.');
  results.push({name:c.name,result:ok?'PASS':'FAIL',http:response.status,ms:Date.now()-started,detail:ok?'':(c.path==='/auth/confirm'&&response.status===404?'Auth confirmation route missing from staging deployment':('Unexpected status or redirect '+location.slice(0,120)))});
 }catch(e){results.push({name:c.name,result:'FAIL',http:'-',ms:Date.now()-started,detail:String(e).slice(0,150)});}
}
const passed=results.filter(x=>x.result==='PASS').length;
if(deploymentIssues.length)results.push({name:'Deployment drift diagnosis',result:'INFO',http:'-',ms:0,detail:deploymentIssues.join(' ')});
const lines=['# PairVoice Staging Smoke Report','',`Target: ${base}`,`Result: ${passed}/${results.length} passed`,'','| Check | Result | HTTP | ms | Detail |','|---|---|---|---:|---|',...results.map(x=>`| ${x.name} | ${x.result} | ${x.http} | ${x.ms} | ${x.detail.replaceAll('|','/')} |`),'','This is a read-only HTTP smoke test, not proof of real email, partner, gig, or payout completion.'];
mkdirSync('test-results',{recursive:true});
writeFileSync('test-results/launch-smoke.md',lines.join('\n')+'\n');
writeFileSync('test-results/launch-smoke.json',JSON.stringify({base,passed,total:results.length,results},null,2));
console.log(lines.join('\n'));
if(process.env.GITHUB_STEP_SUMMARY)writeFileSync(process.env.GITHUB_STEP_SUMMARY,lines.join('\n')+'\n',{flag:'a'});
if(passed!==results.length)process.exitCode=1;
