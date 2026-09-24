'use client';
import {FormEvent,useState} from 'react';
export default function SignIn(){
 const[email,setEmail]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[sent,setSent]=useState(false);
 async function submit(e:FormEvent){e.preventDefault();setBusy(true);setError('');
  const r=await fetch('/api/auth/magic-link',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email,next:'/dashboard'})}),d=await r.json();setBusy(false);
  if(!r.ok){setError(d.error||'Unable to send sign-in link.');return}setSent(true);
 }
 return <main className="prodJoin"><nav className="pvnav"><a className="logo" href="/">PAIR<span>VOICE</span></a><div className="navright"><a className="navcta" href="/join">Create account</a></div></nav>
  <section className="signinShell"><div className="joinAccountCard">{sent?<div className="success"><div>✓</div><h1>Check your email.</h1><p>We sent a secure PairVoice sign-in link to <strong>{email}</strong>.</p><button onClick={()=>setSent(false)}>Use another email</button></div>:
   <form onSubmit={submit}><div className="formTop"><span>PAIRVOICE</span><b>SIGN IN</b></div><h1>Welcome back.</h1><p>Enter the email connected to your PairVoice account.</p><label>Email address<input value={email} onChange={e=>setEmail(e.target.value)} required type="email" autoComplete="email"/></label>{error&&<p className="error">{error}</p>}<button disabled={busy}>{busy?'Sending…':'Send secure sign-in link →'}</button><small>No password required.</small></form>}<a className="joinSigninLink" href="/">← Back to PairVoice</a></div></section>
 </main>;
}
