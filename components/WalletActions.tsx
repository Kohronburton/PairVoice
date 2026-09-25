'use client';
import {useState} from 'react';

type Method={id:string;provider:string;label:string|null;status:string;is_default:boolean};

export default function WalletActions({availableCents,currency,methods}:{availableCents:number;currency:string;methods:Method[]}){
 const[provider,setProvider]=useState('PAYPAL'),[recipient,setRecipient]=useState(''),[label,setLabel]=useState(''),[status,setStatus]=useState(''),[busy,setBusy]=useState(false);
 const verified=methods.find(m=>m.status==='VERIFIED'&&m.is_default);
 const pending=methods.find(m=>m.status==='PENDING'&&m.is_default);
 async function saveMethod(){
  if(!recipient.trim())return;setBusy(true);setStatus('');
  const r=await fetch('/api/payout-method',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({provider,recipientReference:recipient.trim(),label:label.trim()})});
  const d=await r.json();setBusy(false);
  if(!r.ok){setStatus(d.error||'Unable to save payout method.');return}
  setStatus('Payout method saved. PairVoice must verify it before withdrawal.');setRecipient('');window.setTimeout(()=>window.location.reload(),900);
 }
 async function requestPayout(){
  if(availableCents<=0||!verified)return;setBusy(true);setStatus('');
  const r=await fetch('/api/payout',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({amountCents:availableCents,currency,idempotencyKey:crypto.randomUUID()})});
  const d=await r.json();setBusy(false);
  if(!r.ok){setStatus(d.error||'Unable to request payout.');return}
  setStatus('Payout requested. Your balance is reserved while PairVoice processes it.');window.setTimeout(()=>window.location.reload(),900);
 }
 return <section className="card" style={{marginTop:24}}>
  <h2>Payout</h2>
  {verified?<><p><strong>{verified.provider}</strong> · {verified.label||'Verified payout method'} · Verified ✓</p>
   <button type="button" onClick={requestPayout} disabled={busy||availableCents<=0}>{busy?'Saving…':availableCents>0?'Request available balance →':'No available balance yet'}</button></>:
   <><p>{pending?'Your payout method is waiting for verification.':'Add where you want PairVoice to send approved payouts.'}</p>
   {!pending&&<><label>Method<select value={provider} onChange={e=>setProvider(e.target.value)}><option value="PAYPAL">PayPal</option><option value="CASH_APP">Cash App</option><option value="MANUAL">Other approved method</option></select></label>
   <label>Recipient / account<input value={recipient} onChange={e=>setRecipient(e.target.value)} autoComplete="off" placeholder={provider==='PAYPAL'?'PayPal email':'Payout recipient'}/></label>
   <label>Label (optional)<input value={label} onChange={e=>setLabel(e.target.value)} placeholder="My payout account"/></label>
   <button type="button" onClick={saveMethod} disabled={busy||!recipient.trim()}>{busy?'Saving…':'Save payout method →'}</button></>}</>}
  <small>Your payout destination is encrypted at rest and only authorized payment staff can reveal it for payout execution.</small>
  {status&&<p role="status">{status}</p>}
 </section>;
}
