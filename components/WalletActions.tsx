'use client';
import {useRef,useState} from 'react';
import {createBrowserClient} from '@supabase/ssr';

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
 async function requestPayout(){
  if(availableCents<=0||!verified)return;setBusy(true);setStatus('');
  const r=await fetch('/api/payout',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({amountCents:availableCents,currency,idempotencyKey:payoutKey.current||(payoutKey.current=crypto.randomUUID())})});
  const d=await r.json();setBusy(false);
  if(!r.ok){setStatus(d.error||'Unable to request payout.');return}
  payoutKey.current='';setStatus('Payout requested. Your balance is reserved while PairVoice processes it.');window.setTimeout(()=>window.location.reload(),900);
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


export function PasskeySetup(){
 const[busy,setBusy]=useState(false),[status,setStatus]=useState('');
 async function setup(){
  setBusy(true);setStatus('');
  try{
   const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
   if(!url||!key)throw new Error('Passkeys are not configured.');
   const db=createBrowserClient(url,key,{auth:{experimental:{passkey:true}}});
   const {data,error}=await db.auth.registerPasskey();
   if(error)throw error;
   setStatus(`Passkey ready${data?.friendly_name?` · ${data.friendly_name}`:''}. Next time, sign in without waiting for email.`);
  }catch(err){
   const message=err instanceof Error?err.message:'Passkey setup was not completed.';
   if(/abort|cancel|notallowed/i.test(message))setStatus('Passkey setup canceled. You can do it anytime.');
   else setStatus(message);
  }finally{setBusy(false)}
 }
 return <section className="passkeySetup"><small>FASTER NEXT TIME</small><h2>Use Face ID or a passkey</h2><p>Set this up once. You can return to PairVoice without waiting for an email.</p><button type="button" onClick={setup} disabled={busy}>{busy?'Opening passkey…':'Set up passkey →'}</button>{status&&<p role="status">{status}</p>}<small>Email sign-in stays available as a backup.</small></section>;
}
