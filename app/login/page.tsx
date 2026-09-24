'use client';
import {FormEvent,useEffect,useState} from 'react';
import {getBrowserSupabase} from '../../lib/supabase-browser';
import {trackFunnelEvent} from '../../lib/funnel';

export default function LoginPage(){
 const[email,setEmail]=useState(''),[sent,setSent]=useState(false),[loading,setLoading]=useState(false),[error,setError]=useState('');
 useEffect(()=>{trackFunnelEvent('login_view')},[]);
 async function submit(e:FormEvent){
  e.preventDefault();setLoading(true);setError('');
  try{
   const supabase=getBrowserSupabase();
   const redirectTo=`${location.origin}/dashboard`;
   const{error:authError}=await supabase.auth.signInWithOtp({email:email.trim(),options:{emailRedirectTo:redirectTo,shouldCreateUser:true}});
   if(authError)throw authError;
   setSent(true);trackFunnelEvent('magic_link_sent',{surface:'login'});
  }catch(err){setError(err instanceof Error?err.message:'Unable to send sign-in link.')}
  finally{setLoading(false)}
 }
 return <main className="flowPage">
  <nav><a className="logo logoLink" href="/">PAIR<span>VOICE</span></a><a href="/join">Find a gig</a></nav>
  <section className="flowShell narrow">
   <div className="eyebrow">PAIRVOICE ACCOUNT</div>
   <h1>Sign in without a password.</h1>
   <p className="lead">Enter the same email you used for PairVoice. We’ll send a secure link that opens your work dashboard.</p>
   <div className="card">
    {sent?<div className="success"><div>✓</div><h3>Check your email.</h3><p>Open the PairVoice sign-in link on this device to continue to your dashboard.</p><button type="button" onClick={()=>setSent(false)}>Use another email</button></div>:
    <form onSubmit={submit}>
     <h3>Open your PairVoice account</h3>
     <label htmlFor="login-email">Email address</label>
     <input id="login-email" type="email" required value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" inputMode="email"/>
     {error&&<p className="error">{error}</p>}
     <button disabled={loading}>{loading?'Sending…':'Email me a secure sign-in link →'}</button>
     <small>No password to remember. The link expires automatically.</small>
    </form>}
   </div>
  </section>
 </main>;
}
