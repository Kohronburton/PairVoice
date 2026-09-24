'use client';
import {useState} from 'react';

type Access={runId:string;providerName:string;launchUrl?:string|null;invitationCode?:string|null;pairState:string};

export default function WorkAccessCard({pairId,pairCode,campaignName,state}:{pairId:string;pairCode:string;campaignName:string;state:string}){
 const[access,setAccess]=useState<Access|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[submitted,setSubmitted]=useState(state==='SUBMITTED');
 async function load(){
  setBusy(true);setError('');
  const r=await fetch('/api/work/access?pairId='+encodeURIComponent(pairId));
  const d=await r.json();setBusy(false);
  if(!r.ok){setError(d.error||'Unable to load work access.');return}
  setAccess(d);
 }
 async function update(action:'START'|'SUBMIT'){
  if(!access)return;
  if(action==='SUBMIT')setBusy(true);
  const r=await fetch('/api/work/access',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({pairId,runId:access.runId,action})});
  const d=await r.json();
  if(action==='SUBMIT')setBusy(false);
  if(!r.ok){setError(d.error||'Unable to update work status.');return}
  if(action==='SUBMIT')setSubmitted(true);
 }
 if(submitted)return <article className="opportunityCard"><small>{campaignName}</small><h3>Submitted for review</h3><p>Pair {pairCode}. PairVoice will keep the submission history and update you after QA.</p></article>;
 return <article className="opportunityCard">
  <small>{campaignName}</small><h3>{state==='REWORK_REQUIRED'?'Rework required':'Your pair is ready to work'}</h3>
  <p>Pair {pairCode}. External work access is revealed only to authenticated members of this pair.</p>
  {!access?<button onClick={load} disabled={busy}>{busy?'Preparing…':state==='REWORK_REQUIRED'?'Open rework instructions →':'Get work access →'}</button>:<>
   <p><strong>Provider:</strong> {access.providerName}</p>
   {access.invitationCode&&<p><strong>Invitation code:</strong> <code>{access.invitationCode}</code></p>}
   {access.launchUrl?<a className="primary" href={access.launchUrl} target="_blank" rel="noreferrer" onClick={()=>void update('START')}>Open {access.providerName} →</a>:<p>Provider launch URL has not been configured yet. Keep this page open and contact PairVoice support.</p>}
   <div style={{marginTop:16}}><button onClick={()=>update('SUBMIT')} disabled={busy}>{busy?'Saving…':'I finished and submitted →'}</button></div>
  </>}
  {error&&<p role="alert">{error}</p>}
 </article>;
}
