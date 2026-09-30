'use client';
import {useCallback,useEffect,useState} from 'react';

type Method={id:string;participant_id:string;provider:string;label:string|null;status:string;is_default:boolean;participants:any};
type Attempt={id:string;state:string;provider:string;provider_reference:string|null;last_error:string|null};
type Payout={id:string;participant_id:string;payout_method_id:string|null;amount_cents:number;currency:string;state:string;provider:string|null;external_reference:string|null;failure_reason:string|null;participants:any;latestAttempt:Attempt|null};
const one=(v:any)=>Array.isArray(v)?v[0]:v;

export default function PaymentsConsole(){
 const[methods,setMethods]=useState<Method[]>([]),[payouts,setPayouts]=useState<Payout[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState('');
 const load=useCallback(async()=>{
  const[rm,rp]=await Promise.all([fetch('/api/admin/payout-methods',{cache:'no-store'}),fetch('/api/admin/payouts',{cache:'no-store'})]);
  const[md,pd]=await Promise.all([rm.json(),rp.json()]);
  if(!rm.ok||!rp.ok){setError(md.error||pd.error||'Unable to load payments.');return}
  setMethods(md.methods||[]);setPayouts(pd.payouts||[]);
 },[]);
 useEffect(()=>{void load()},[load]);
 async function methodStatus(id:string,status:'VERIFIED'|'DISABLED'){
  const reason=window.prompt(status==='VERIFIED'?'Verification evidence / reason:':'Reason for disabling:');if(!reason)return;
  setBusy(id);const r=await fetch('/api/admin/payout-methods',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({methodId:id,status,reason})}),d=await r.json();setBusy('');
  if(!r.ok){setError(d.error||'Unable to update method.');return}await load();
 }
 async function reveal(id:string){
  setBusy(id);const r=await fetch('/api/admin/payout-methods/'+encodeURIComponent(id)+'/recipient',{cache:'no-store'}),d=await r.json();setBusy('');
  if(!r.ok){setError(d.error||'Unable to reveal destination.');return}
  window.prompt('Authorized payout destination — do not copy into notes or analytics:',d.recipient||'');
 }
 async function start(p:Payout){
  setBusy(p.id);const r=await fetch('/api/admin/payouts',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'START',payoutId:p.id,idempotencyKey:`payout-attempt:${p.id}:${crypto.randomUUID()}`})}),d=await r.json();setBusy('');
  if(!r.ok){setError(d.error||'Unable to start payout.');return}await load();
 }
 async function reconcile(p:Payout,outcome:'SUCCEEDED'|'FAILED'|'UNKNOWN'|'MANUAL_REVIEW'){
  const a=p.latestAttempt;if(!a)return;
  let providerReference:string|null=null;
  if(outcome==='SUCCEEDED'){providerReference=window.prompt('Provider transaction/reference ID:');if(!providerReference)return}
  const reason=window.prompt('Reconciliation reason/evidence:');if(!reason)return;
  const lastError=outcome==='FAILED'||outcome==='UNKNOWN'||outcome==='MANUAL_REVIEW'?window.prompt('Provider/error detail (optional):')||null:null;
  setBusy(p.id);const r=await fetch('/api/admin/payouts',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'RECONCILE',attemptId:a.id,outcome,providerReference,lastError,reason,resultMetadata:{operator_reconciled:true}})}),d=await r.json();setBusy('');
  if(!r.ok){setError(d.error||'Unable to reconcile payout.');return}await load();
 }
 return <main style={{maxWidth:1200,margin:'0 auto',padding:'32px 20px'}}>
  <div className="logo">PAIR<span>VOICE</span></div><p className="eyebrow">ADMIN · PAYMENTS</p><h1>Payments <em>with reconciliation.</em></h1>
  <p>Verify payout destinations, execute controlled transfers, and reconcile uncertain provider outcomes. Never mark a timeout paid.</p>
  {error&&<p className="error">{error}</p>}
  <section style={{marginTop:30}}><h2>Payout methods awaiting action</h2><div className="opportunityGrid">
   {methods.map(m=>{const person=one(m.participants);return <article className="opportunityCard" key={m.id}><small>{m.status}</small><h3>{person?.first_name||'Participant'} · {m.provider}</h3><p>{m.label||'Payout method'} · {person?.public_code||''}</p>
    <div style={{display:'grid',gap:8,marginTop:'auto'}}><button disabled={!!busy} onClick={()=>reveal(m.id)}>Reveal destination</button>{m.status==='PENDING'&&<button disabled={!!busy} onClick={()=>methodStatus(m.id,'VERIFIED')}>Verify method</button>}<button disabled={!!busy} onClick={()=>methodStatus(m.id,'DISABLED')}>Disable method</button></div>
   </article>})}
   {!methods.length&&<article className="opportunityCard"><h3>No payout methods waiting</h3></article>}
  </div></section>
  <section style={{marginTop:36}}><h2>Payout queue</h2><div className="opportunityGrid">
   {payouts.map(p=>{const person=one(p.participants),a=p.latestAttempt;return <article className="opportunityCard" key={p.id}><small>{p.state}</small><h3>{new Intl.NumberFormat('en-US',{style:'currency',currency:p.currency}).format(p.amount_cents/100)}</h3><p>{person?.first_name||'Participant'} · {person?.public_code||''} · {p.provider||'provider pending'}</p>
    {a&&<p>Latest attempt: <strong>{a.state}</strong>{a.last_error?' · '+a.last_error:''}</p>}
    {p.payout_method_id&&<button disabled={!!busy} onClick={()=>reveal(p.payout_method_id!)}>Reveal frozen destination</button>}
    {(p.state==='REQUESTED'||p.state==='FAILED')&&<button disabled={!!busy} onClick={()=>start(p)}>Start payout attempt →</button>}
    {p.state==='PROCESSING'&&a&&<div style={{display:'grid',gap:8,marginTop:8}}><button disabled={!!busy} onClick={()=>reconcile(p,'SUCCEEDED')}>Confirm provider success</button><button disabled={!!busy} onClick={()=>reconcile(p,'FAILED')}>Confirm provider failure</button><button disabled={!!busy} onClick={()=>reconcile(p,'UNKNOWN')}>Mark outcome unknown</button><button disabled={!!busy} onClick={()=>reconcile(p,'MANUAL_REVIEW')}>Send to manual review</button></div>}
    {p.state==='PAID'&&<p>Provider reference: {p.external_reference||'recorded'}</p>}
   </article>})}
   {!payouts.length&&<article className="opportunityCard"><h3>No payout requests</h3></article>}
  </div></section>
 </main>;
}
