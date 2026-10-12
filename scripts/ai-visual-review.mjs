// Optional AI visual reviewer. Read-only; model findings are never a release PASS.
// Invoke after Playwright captures a screenshot: OPENAI_API_KEY=... node scripts/ai-visual-review.mjs screenshot.png
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {basename} from 'node:path';
const file=process.argv[2];
if(!file||!process.env.OPENAI_API_KEY){console.error('BLOCKED: screenshot path and OPENAI_API_KEY required');process.exit(2);}
const bytes=readFileSync(file);
if(bytes.length>8_000_000){console.error('BLOCKED: screenshot too large');process.exit(2);}
const mime=file.toLowerCase().endsWith('.jpg')||file.toLowerCase().endsWith('.jpeg')?'image/jpeg':'image/png';
const model=process.env.PAIRVOICE_AI_REVIEW_MODEL||'gpt-4.1-mini';
const request={model,store:false,max_output_tokens:900,input:[{role:'user',content:[{type:'input_text',text:'You are a critical UI QA reviewer for a mobile paid-gig onboarding flow. Inspect the screenshot only. Identify visible clipping, overlapping text, inaccessible controls, misleading payment promises, missing instructions, and ambiguous next steps. Do not claim to verify functionality, backend behavior, or unseen states. Respond with concise JSON containing findings array of objects with severity, issue, and evidence. If uncertain, say so.'},{type:'input_image',image_url:'data:'+mime+';base64,'+bytes.toString('base64'),detail:'high'}]}]};
const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{authorization:'Bearer '+process.env.OPENAI_API_KEY,'content-type':'application/json'},body:JSON.stringify(request),signal:AbortSignal.timeout(60000)});
if(!response.ok){console.error('BLOCKED: OpenAI review unavailable, HTTP '+response.status);process.exit(2);}
const data=await response.json();
const text=data.output?.flatMap(x=>x.content||[]).filter(x=>x.type==='output_text').map(x=>x.text).join('\n')||'';
if(!text){console.error('BLOCKED: OpenAI returned no review');process.exit(2);}
mkdirSync('test-results/ai-review',{recursive:true});
const target='test-results/ai-review/'+basename(file).replace(/[^a-zA-Z0-9_.-]/g,'_')+'.json';
writeFileSync(target,JSON.stringify({status:'REVIEW_ONLY',model,review:text},null,2));
console.log('AI visual review saved to '+target+'; does not constitute test PASS');
