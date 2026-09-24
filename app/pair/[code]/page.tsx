'use client';
import {FormEvent,useEffect,useState} from 'react';
import {getBrowserSupabase} from '../../../lib/supabase-browser';
import {trackFunnelEvent} from '../../../lib/funnel';

type Invite={ok:boolean;campaignName:string;countryCode:string;languageCode:string;pairState:string;pairCode:string;available:boolean};

export default function PairInvitePage({params}:{params:Promise<{code:string}>}){
 const[code,setCode]=useState(''),[invite,setInvite]=useState<Invite|null>(null),[lang,setLang]=useState<'en'|'es'>('en');
 const[loading,setLoading]=useState(false),[loadingInvite,setLoadingInvite]=useState(true),[done,setDone]=useState(false),[magicSent,setMagicSent]=useState(false),[error,setError]=useState('');
 useEffect(()=>{
  params.then(async p=>{
   const c=p.code.toUpperCase();setCode(c);
   const q=new URLSearchParams(location.search),browser=navigator.language.toLowerCase();
   const l=q.get('lang')==='es'||(!q.get('lang')&&browser.startsWith('es'))?'es':'en';setLang(l);document.documentElement.lang=l;
   trackFunnelEvent('invite_view',{surface:'production_pair'});
   try{const r=await fetch(`/api/pair?code=${encodeURIComponent(c)}`),d=await r.json();if(!r.ok)throw new Error(d.error||'Invite unavailable');setInvite(d)}
   catch(err){setError(err instanceof Error?err.message:'Invite unavailable')}
   finally{setLoadingInvite(false)}
  });
 },[params]);
 const es=lang==='es';

 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(!invite?.available)return;setLoading(true);setError('');trackFunnelEvent('partner_signup_started',{surface:'production_pair'});
  const f=new FormData(e.currentTarget),email=String(f.get('email')||'').trim();
  try{
   const r=await fetch('/api/pair',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({
    inviteCode:code,firstName:f.get('first_name'),email,phone:f.get('phone')||null,
    countryCode:invite.countryCode,languageCode:invite.languageCode,is18Plus:f.get('age')==='on',consent:f.get('consent')==='on'
   })});
   const d=await r.json();if(!r.ok)throw new Error(d.error||(es?'No se pudo unir la pareja.':'Unable to join this pair.'));
   try{const supabase=getBrowserSupabase();const{error:authError}=await supabase.auth.signInWithOtp({email,options:{emailRedirectTo:`${location.origin}/dashboard`,shouldCreateUser:true}});if(!authError){setMagicSent(true);trackFunnelEvent('magic_link_sent',{surface:'partner_signup'});}}catch{}
   setDone(true);trackFunnelEvent('partner_signup_completed',{surface:'production_pair'});
  }catch(err){setError(err instanceof Error?err.message:'Unable to join this pair.')}
  finally{setLoading(false)}
 }

 return <main className="flowPage"><nav><a className="logo logoLink" href="/">PAIR<span>VOICE</span></a><button className="language" onClick={()=>setLang(es?'en':'es')}>{es?'EN':'ES'}</button></nav>
  <section className="flowShell narrow">
   <div className="eyebrow">{es?'INVITACIÓN DE PAREJA':'PARTNER INVITATION'}</div>
   <h1>{es?'Tu compañero/a ya empezó.':'Your partner already started.'}</h1>
   {loadingInvite?<p className="lead">{es?'Comprobando la invitación…':'Checking your invitation…'}</p>:done?<div className="card productionSuccess"><div className="success"><div>✓</div><h3>{es?'La pareja está conectada.':'Your pair is connected.'}</h3><p>{magicSent?(es?'Revisa tu correo para abrir tu panel de PairVoice.':'Check your email for the secure link to your PairVoice dashboard.'):(es?'Entra con el mismo correo para abrir tu panel.':'Sign in with the same email to open your dashboard.')}</p><a className="darkCta" href="/login">{es?'Abrir mi cuenta →':'Open my account →'}</a></div></div>:
   <div className="card">
    {invite&&<div className="selectedJob"><small>{es?'PROYECTO':'GIG'}</small><strong>{invite.campaignName}</strong><span>{invite.countryCode} · {invite.languageCode.toUpperCase()}</span></div>}
    {!invite?.available?<div><h3>{es?'Esta invitación ya no está disponible.':'This invitation is no longer available.'}</h3><p>{es?'Pide a tu compañero/a el enlace más reciente.':'Ask your partner for their latest PairVoice link.'}</p>{error&&<p className="error">{error}</p>}</div>:
    <form onSubmit={submit}>
     <h3>{es?'Completa tu registro':'Complete your signup'}</h3>
     <label htmlFor="pair-first">{es?'Nombre':'First name'}</label><input id="pair-first" name="first_name" required autoComplete="given-name"/>
     <label htmlFor="pair-email">{es?'Correo electrónico':'Email address'}</label><input id="pair-email" name="email" type="email" required autoComplete="email" inputMode="email"/>
     <label htmlFor="pair-phone">{es?'Teléfono (opcional)':'Phone (optional)'}</label><input id="pair-phone" name="phone" type="tel" autoComplete="tel" inputMode="tel"/>
     <label className="check"><input name="age" type="checkbox" required/><span>{es?'Confirmo que tengo 18 años o más.':'I confirm I am 18 or older.'}</span></label>
     <label className="check"><input name="consent" type="checkbox" required/><span>{es?'Acepto recibir instrucciones del proyecto y actualizaciones de PairVoice.':'Send me PairVoice gig instructions and account updates.'}</span></label>
     {error&&<p className="error">{error}</p>}
     <button disabled={loading}>{loading?(es?'Conectando…':'Connecting…'):(es?'Unirme a mi pareja →':'Join my partner →')}</button>
     <small>{es?'Código de pareja: ':'Pair invite: '}{code}</small>
    </form>}
   </div>}
  </section>
 </main>;
}
