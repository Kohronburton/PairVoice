import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const policy=JSON.parse(readFileSync('config/release-gates.json','utf8'));
const file=process.argv[2];if(!file){console.error('Usage: node scripts/evaluate-release-gates.mjs evidence.json');process.exit(2);}
let evidence;try{evidence=JSON.parse(readFileSync(file,'utf8'));}catch{console.error('Invalid evidence JSON');process.exit(2);}
const failures=[],summary=[];
if(policy.environment!=='staging'||policy.productionWritesAllowed!==false)failures.push('Unsafe policy environment');
for(const gate of policy.requiredGates){
 const records=Array.isArray(evidence.gates)?evidence.gates.filter(x=>x.gate===gate):[];
 if(records.length!==1){failures.push(gate+': expected exactly one evidence record');summary.push({gate,status:'BLOCKED'});continue;}
 const r=records[0],missing=policy.requiredEvidenceFields.filter(k=>!r[k]);
 if(missing.length||r.environment!=='staging'||r.commitSha!==evidence.commitSha||r.status!=='PASS'||!policy.acceptedEvidence.includes(r.source)){
  failures.push(gate+': invalid or nonpassing evidence');summary.push({gate,status:r.status||'BLOCKED'});continue;
 }
 summary.push({gate,status:'PASS'});
}
const result={schemaVersion:policy.schemaVersion,commitSha:evidence.commitSha||null,status:failures.length?'BLOCKED':'PASS',failures,summary,aiAuthority:policy.aiAuthority};
mkdirSync('test-results/release',{recursive:true});writeFileSync('test-results/release/decision.json',JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));if(failures.length)process.exitCode=1;
