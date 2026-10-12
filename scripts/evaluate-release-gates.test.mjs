import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const policy=JSON.parse((await import('node:fs')).readFileSync('config/release-gates.json','utf8'));
test('forged all-PASS evidence cannot authorize release',()=>{
 const dir=mkdtempSync(join(tmpdir(),'pairvoice-gates-'));
 try{
  const sha='a'.repeat(40);
  const gates=policy.requiredGates.map(gate=>({gate,status:'PASS',source:'ci_job',runId:'fabricated',commitSha:sha,environment:'staging',timestamp:new Date().toISOString()}));
  const file=join(dir,'forged.json');writeFileSync(file,JSON.stringify({environment:'staging',commitSha:sha,gates}));
  const result=spawnSync(process.execPath,['scripts/evaluate-release-gates.mjs',file],{encoding:'utf8'});
  assert.notEqual(result.status,0,'untrusted evidence must never pass');
  assert.match(result.stdout,/provenance is not independently verified/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('malformed evidence fails closed',()=>{
 const dir=mkdtempSync(join(tmpdir(),'pairvoice-gates-'));
 try{
  const file=join(dir,'bad.json');writeFileSync(file,'not-json');
  const result=spawnSync(process.execPath,['scripts/evaluate-release-gates.mjs',file],{encoding:'utf8'});
  assert.notEqual(result.status,0);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
