'use client';
import {FormEvent,useEffect,useState} from 'react';
export default function SignIn(){
 const[email,setEmail]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[sent,setSent]=useState(false),[cooldown,setCooldown]=useState(0);
 useEffect(()=>{if(cooldown<=0)return;const t=window.setInterval(()=>setCooldown(v=>v<=1?0:v-1),1000);return()=>window.clearInterval(t)},[cooldown]);
 async function submit(e:FormEvent){e.preventDefault();if(busy||cooldown>0)return;setBusy(true);setError('');
  const r=await fetch('/api/auth/magic-link',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email,next:'/dashboard'})}),d=await r.json();setBusy(false);
  if(!r.ok){
   if(r.status===429){setCooldown(Number(d.retryAfterSeconds)||60);setError(d.error||'A link was sent recently. Check your inbox or try again shortly.');return}
   setError(d.error||'Unable to send sign-in link.');return
  }
  setSent(true);setCooldown(60);
 }
 return <main className="prodJoin"><nav className="pvnav"><a className="logo" href="/">PAIR<span>VOICE</span></a><div className="navright"><a className="navcta" href="/join">Create account</a></div></nav>
  <section className="signinShell"><div className="joinAccountCard">{sent?<div className="success"><div>✓</div><h1>Check your email.</h1><p>We sent a secure PairVoice sign-in link to <strong>{email}</strong>.</p><p className="resendStatus">You can request another link in {cooldown}s.</p><button onClick={()=>setSent(false)}>Use another email</button></div>:
   <form onSubmit={submit}><div className="formTop"><span>PAIRVOICE</span><b>SIGN IN</b></div><h1>Welcome back.</h1><p>Enter the email connected to your PairVoice account.</p><label htmlFor="signin-email">Email address<input id="signin-email" name="email" value={email} onChange={e=>setEmail(e.target.value)} required type="email" autoComplete="email" inputMode="email" autoCapitalize="none" spellCheck={false} enterKeyHint="send"/></label>{error&&<p className={cooldown>0?'notice':'error'}>{error}{cooldown>0&&<> Try again in {cooldown}s.</>}</p>}<button disabled={busy||cooldown>0}>{busy?'Sending…':cooldown>0?`Wait ${cooldown}s`:'Send secure sign-in link →'}</button><small>No password required.</small></form>}<a className="joinSigninLink" href="/">← Back to PairVoice</a></div></section>
 </main>;
}
