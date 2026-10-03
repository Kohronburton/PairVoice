'use client';
import {useCallback,useEffect,useState} from 'react';

type Pair={id:string;publicCode:string;state:string;campaign:{slug:string;name:string}|null;members:{role:string;name:string;email:string}[]};

export default function QaConsole(){
 const[pairs,setPairs]=useState<Pair[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState('');
 const load=useCallback(async()=>{const r=await fetch('/api/admin/pairs',{cache:'no-store'}),d=await r.json();if(!r.ok){setError(d.error||'Unable to load QA queue.');return}setPairs((d.pairs||[]).filter((p:Pair)=>['SUBMITTED','INTERNAL_QA','CLIENT_QA','REWORK_REQUIRED'].includes(p.state)))},[]);
 useEffect(()=>{void load()},[load]);
 async function review(pair:Pair,decision:'APPROVED'|'REWORK_REQUIRED'|'REJECTED'){
  const stage=pair.state==='CLIENT_QA'?'CLIENT':'INTERNAL';
  const notes=window.prompt(decision==='APPROVED'?'Review notes (optional):':'Reason / instructions:')||'';
  if(decision!=='APPROVED'&&!notes.trim())return;
  setBusy(pair.id);setError('');
  const r=await fetch('/api/admin/qa',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({pairId:pair.id,stage,decision,notes,idempotencyKey:`qa:${pair.id}:${stage}:${crypto.randomUUID()}`})});
  const d=await r.json();setBusy('');
  if(!r.ok){setError(d.error||'Review failed.');return}await load();
 }
 return <main style={{maxWidth:1100,margin:'0 auto',padding:'32px 20px'}}>
  <div className="logo">PAIR<span>VOICE</span></div><p className="eyebrow">ADMIN · QA</p><h1>Review <em>without bypassing history.</em></h1>
  <p>Every decision uses the dedicated review workflow and leaves review, activity, audit and financial evidence.</p>
  {error&&<p className="error">{error}</p>}
  <div className="opportunityGrid" style={{marginTop:24}}>
   {pairs.map(p=><article className="opportunityCard" key={p.id}><small>{p.state.replaceAll('_',' ')}</small><h3>{p.publicCode}</h3><p>{p.campaign?.name||'Campaign'}</p><p>{p.members.map(m=>m.role+': '+m.name).join(' · ')}</p>
    {p.state==='REWORK_REQUIRED'?<p>Waiting for the participants to resubmit.</p>:<div style={{display:'grid',gap:8,marginTop:'auto'}}>
     <button disabled={!!busy} onClick={()=>review(p,'APPROVED')}>{p.state==='CLIENT_QA'?'Approve & create earnings':'Pass internal QA'} →</button>
     <button disabled={!!busy} onClick={()=>review(p,'REWORK_REQUIRED')}>Request rework</button>
     <button disabled={!!busy} onClick={()=>review(p,'REJECTED')}>Reject</button>
    </div>}
   </article>)}
   {!pairs.length&&<article className="opportunityCard"><h3>QA queue clear</h3><p>No submitted, internal-review, client-review, or rework pairs are waiting.</p></article>}
  </div>
 </main>;
}
