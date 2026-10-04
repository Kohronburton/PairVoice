'use client';
import {useRef,useState} from 'react';

type Method={id:string;provider:string;label:string|null;status:string;is_default:boolean};

export default function WalletActions({availableCents,currency,methods}:{availableCents:number;currency:string;methods:Method[]}){
 const payoutKey=useRef<string>('');
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
 function durablePayoutKey(){
  if(payoutKey.current)return payoutKey.current;
  const storageKey=`pairvoice:payout:${currency}:${availableCents}`;
  try{payoutKey.current=window.localStorage.getItem(storageKey)||crypto.randomUUID();window.localStorage.setItem(storageKey,payoutKey.current)}catch{payoutKey.current=crypto.randomUUID()}
  return payoutKey.current;
 }
 function clearDurablePayoutKey(){
  const storageKey=`pairvoice:payout:${currency}:${availableCents}`;
  try{window.localStorage.removeItem(storageKey)}catch{}
  payoutKey.current='';
 }
 async function requestPayout(){
  if(availableCents<=0||!verified)return;setBusy(true);setStatus('');
  const r=await fetch('/api/payout',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({amountCents:availableCents,currency,idempotencyKey:durablePayoutKey()})});
  const d=await r.json();setBusy(false);
  if(!r.ok){setStatus(d.error||'Unable to request payout.');return}
  clearDurablePayoutKey();setStatus('Payout requested. Your balance is reserved while PairVoice processes it.');window.setTimeout(()=>window.location.reload(),900);
 }
 return <section className="walletAction">
  <small>NEXT STEP</small><h2>{verified?(availableCents>0?'Get paid':'You’re payout-ready'):pending?'Verification in progress':'Set up payouts'}</h2>
  {verified?<><p><strong>{verified.provider}</strong> · Verified ✓</p>
   <button type="button" onClick={requestPayout} disabled={busy||availableCents<=0}>{busy?'Saving…':availableCents>0?'Request available balance →':'No available balance yet'}</button></>:
   <><p>{pending?'We’re verifying your payout method. Nothing else to do right now.':'Add a payout method once so approved earnings can be sent to you.'}</p>
   {!pending&&<><label>Method<select value={provider} onChange={e=>setProvider(e.target.value)}><option value="PAYPAL">PayPal</option><option value="CASH_APP">Cash App</option><option value="MANUAL">Other approved method</option></select></label>
   <label>Recipient / account<input value={recipient} onChange={e=>setRecipient(e.target.value)} autoComplete="off" placeholder={provider==='PAYPAL'?'PayPal email':'Payout recipient'}/></label>
   <details className="walletOptional"><summary>Add a label (optional)</summary><label>Label<input value={label} onChange={e=>setLabel(e.target.value)} placeholder="My payout account"/></label></details>
   <button type="button" onClick={saveMethod} disabled={busy||!recipient.trim()}>{busy?'Saving…':'Save payout method →'}</button></>}</>}
  <small className="walletSecurity">🔒 Payout details are encrypted.</small>
  {status&&<p role="status">{status}</p>}
 </section>;
}
