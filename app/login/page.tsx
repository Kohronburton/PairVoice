'use client';
import {FormEvent,useEffect,useState} from 'react';
import {getBrowserSupabase} from '../../lib/supabase-browser';
import {trackFunnelEvent} from '../../lib/funnel';

export default function LoginPage(){
 const[email,setEmail]=useState(''),[sent,setSent]=useState(false),[loading,setLoading]=useState(false),[error,setError]=useState(''),[lang,setLang]=useState<'en'|'es'>('en');
 useEffect(()=>{
  const q=new URLSearchParams(location.search);
  const next=q.get('lang')==='es'||(!q.get('lang')&&navigator.language.toLowerCase().startsWith('es'))?'es':'en';
  setLang(next);document.documentElement.lang=next;trackFunnelEvent('login_view');
 },[]);
 const es=lang==='es';

 async function submit(e:FormEvent){
  e.preventDefault();setLoading(true);setError('');
  try{
   const supabase=getBrowserSupabase();
   const redirectTo=`${location.origin}/dashboard`;
   const{error:authError}=await supabase.auth.signInWithOtp({email:email.trim(),options:{emailRedirectTo:redirectTo,shouldCreateUser:true}});
   if(authError)throw authError;
   setSent(true);trackFunnelEvent('magic_link_sent',{surface:'login'});
  }catch(err){setError(err instanceof Error?err.message:(es?'No se pudo enviar el enlace.':'Unable to send sign-in link.'))}
  finally{setLoading(false)}
 }

 return <main className="flowPage">
  <nav><a className="logo logoLink" href="/">PAIR<span>VOICE</span></a><div className="navright"><button className="language" onClick={()=>{const next=es?'en':'es';setLang(next);document.documentElement.lang=next}}>{es?'EN':'ES'}</button><a href={`/join?lang=${lang}`}>{es?'Ver trabajos':'Find a gig'}</a></div></nav>
  <section className="flowShell narrow">
   <div className="eyebrow">{es?'CUENTA PAIRVOICE':'PAIRVOICE ACCOUNT'}</div>
   <h1>{es?'Entra sin contraseña.':'Sign in without a password.'}</h1>
   <p className="lead">{es?'Introduce el mismo correo que usaste en PairVoice. Te enviaremos un enlace seguro para abrir tu panel de trabajo.':'Enter the same email you used for PairVoice. We’ll send a secure link that opens your work dashboard.'}</p>
   <div className="card">
    {sent?<div className="success"><div>✓</div><h3>{es?'Revisa tu correo.':'Check your email.'}</h3><p>{es?'Abre el enlace seguro de PairVoice en este dispositivo para continuar a tu panel.':'Open the PairVoice sign-in link on this device to continue to your dashboard.'}</p><button type="button" onClick={()=>setSent(false)}>{es?'Usar otro correo':'Use another email'}</button></div>:
    <form onSubmit={submit}>
     <h3>{es?'Abrir mi cuenta PairVoice':'Open your PairVoice account'}</h3>
     <label htmlFor="login-email">{es?'Correo electrónico':'Email address'}</label>
     <input id="login-email" type="email" required value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" inputMode="email"/>
     {error&&<p className="error">{error}</p>}
     <button disabled={loading}>{loading?(es?'Enviando…':'Sending…'):(es?'Enviarme un enlace seguro →':'Email me a secure sign-in link →')}</button>
     <small>{es?'Sin contraseña que recordar. El enlace caduca automáticamente.':'No password to remember. The link expires automatically.'}</small>
    </form>}
   </div>
  </section>
 </main>;
}
