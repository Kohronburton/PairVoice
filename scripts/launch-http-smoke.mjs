// Non-destructive HTTP launch smoke checks. No accounts, payments or emails are created.
import assert from 'node:assert/strict';
const base=(process.env.PAIRVOICE_TEST_BASE_URL||'http://localhost:3000').replace(/\/$/,'');
const results=[];
async function check(name,path,expected,init){
 const response=await fetch(base+path,{redirect:'manual',signal:AbortSignal.timeout(15000),...init});
 assert.ok(expected.includes(response.status),name+': unexpected HTTP '+response.status);
 results.push({name,status:response.status,result:'PASS'});
}
await check('public home','/',[200]);
await check('join page','/join',[200,307,308]);
await check('unauthenticated dashboard','/dashboard',[200,302,303,307,308,401,403]);
await check('invalid confirmation link','/auth/confirm',[302,303,307,308]);
await check('invalid partner invite','/invite/NOT-A-REAL-CODE',[200,302,303,307,308,404]);
await check('work access without pair id','/api/work/access',[400]);
await check('payout requires authentication','/api/payout',[401],{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({amountCents:100,currency:'USD',idempotencyKey:'smoke-test-no-money'})});
console.log(JSON.stringify({base,results},null,2));
