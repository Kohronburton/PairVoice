'use client';
import {FormEvent,useEffect,useMemo,useState} from 'react';
import {trackFunnelEvent} from '../../lib/funnel';

type Opportunity={slug:string;name:string;countryCode:string;languageCode:string;participantPayoutCents:number|null;payoutCurrency:string;requiresPair:boolean;jobFamily:string|null};

const countryName=(c:string)=>({US:'United States',ES:'Spain',CA:'Canada',GB:'United Kingdom',AU:'Australia'} as Record<string,string>)[c]||c;
const money=(c:number,x:string)=>{try{return new Intl.NumberFormat(undefined,{style:'currency',currency:x,maximumFractionDigits:0}).format(c/100)}catch{return'$'+Math.round(c/100)}};

export default function JoinPage(){
 const[campaign,setCampaign]=useState(''),[ops,setOps]=useState<Opportunity[]>([]),[lang,setLang]=useState<'en'|'es'>('en');
 const[busy,setBusy]=useState(false),[error,setError]=useState(''),[done,setDone]=useState(false),[magicSent,setMagicSent]=useState(false);
 useEffect(()=>{
  const q=new URLSearchParams(location.search),slug=q.get('campaign')||'',locale=navigator.language||'en-US';
  setCampaign(slug);setLang(locale.toLowerCase().startsWith('es')?'es':'en');
  fetch('/api/opportunities').then(r=>r.ok?r.json():Promise.reject()).then(d=>setOps(Array.isArray(d.opportunities)?d.opportunities:[])).catch(()=>{});
  trackFunnelEvent('signup_started',{campaign_slug:slug||'general',surface:'production_join'});
 },[]);
 const selected=useMemo(()=>ops.find(o=>o.slug===campaign)||null,[ops,campaign]);
 const es=lang==='es';
 const t=es?{
  title:campaign?'Únete a este proyecto':'Crea tu cuenta PairVoice',lead:campaign?'Crea tu cuenta y confirma los datos necesarios para este proyecto.':'Crea una cuenta reutilizable para ver y participar en proyectos compatibles.',
  first:'Nombre',email:'Correo electrónico',country:'País',language:'Idioma',age:'Confirmo que tengo 18 años o más.',consent:'Acepto crear una cuenta PairVoice y recibir comunicaciones necesarias sobre mis proyectos.',fixed:'Ya configurado por este proyecto',
  button:campaign?'Continuar con este proyecto':'Crear cuenta PairVoice',saving:'Creando cuenta…',done:'Revisa tu correo.',next:'Te enviamos un enlace seguro para entrar a PairVoice.',
  back:'Volver a proyectos',signin:'¿Ya tienes cuenta? Entrar',partner:'Compañero requerido',payout:'Pago por pareja aprobada'
 }:{
  title:campaign?'Join this gig':'Create your PairVoice account',lead:campaign?'Create your account and confirm the information required for this gig.':'Create one reusable account to discover and join compatible paid voice gigs.',
  first:'First name',email:'Email address',country:'Country',language:'Language',age:'I confirm I am 18 or older.',consent:'I agree to create a PairVoice account and receive communications required for my gigs.',fixed:'Already set by this gig',
  button:campaign?'Continue with this gig':'Create PairVoice account',saving:'Creating account…',done:'Check your email.',next:'We sent you a secure link to enter PairVoice.',
  back:'Back to gigs',signin:'Already have an account? Sign in',partner:'Partner required',payout:'Payout per approved pair'
 };
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setBusy(true);setError('');setMagicSent(false);
  const f=new FormData(e.currentTarget),email=String(f.get('email')||''),firstName=String(f.get('first_name')||'');
  try{
   if(campaign){
    const r=await fetch('/api/signup',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({
     campaign,firstName,email,phone:null,countryCode:String(f.get('country')||selected?.countryCode||'US'),
     languageCode:String(f.get('language')||selected?.languageCode||'en'),is18Plus:f.get('age')==='on',consent:f.get('consent')==='on',
     ref:new URLSearchParams(location.search).get('ref')
    })});
    const d=await r.json();if(!r.ok)throw new Error(d.error||'Unable to create account.');
   }else{
    const locale=navigator.language||'en-US',parts=locale.replace('_','-').split('-');
    const r=await fetch('/api/lead',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({
     first_name:firstName,email,consent:f.get('consent')==='on',market_code:(parts[1]||'US').toUpperCase(),language:lang,
     detected_locale:locale,detected_languages:Array.from(navigator.languages||[]),source:'production_join',
     marketing_campaign_key:'account_creation',landing_path:location.pathname,referrer:document.referrer||null
    })});
    const d=await r.json();if(!r.ok)throw new Error(d.error||'Unable to create account.');
   }
   const m=await fetch('/api/auth/magic-link',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email,next:'/dashboard'})});
   const md=await m.json();if(!m.ok)throw new Error(md.error||'Account created, but sign-in email could not be sent.');
   setMagicSent(true);setDone(true);trackFunnelEvent('signup_completed',{campaign_slug:campaign||'general',surface:'production_join'});
  }catch(err){setError(err instanceof Error?err.message:'Unable to create account.')}
  finally{setBusy(false)}
 }
 return <main className="prodJoin">
  <nav className="pvnav"><a className="logo" href="/">PAIR<span>VOICE</span></a><div className="navright"><a className="navsignin" href="/">{t.back}</a><a className="navcta" href="/signin">{es?'Entrar':'Sign in'}</a></div></nav>
  <section className="joinShell">
   <div className="joinContext"><div className="eyebrow">{campaign?(es?'PROYECTO SELECCIONADO':'SELECTED GIG'):(es?'CUENTA PAIRVOICE':'PAIRVOICE ACCOUNT')}</div>
    <h1>{t.title}</h1><p>{t.lead}</p>
    {selected&&<article className="selectedGigCard"><small>{countryName(selected.countryCode)}</small><h2>{selected.name}</h2><p>{selected.jobFamily||'Voice recording'}</p>{selected.participantPayoutCents!=null&&<strong>{money(selected.participantPayoutCents,selected.payoutCurrency)} <span>{t.payout}</span></strong>}<div className="chips"><span>{selected.languageCode.toUpperCase()}</span>{selected.requiresPair&&<span>{t.partner}</span>}</div></article>}
   </div>
   <div className="joinAccountCard">{done?<div className="success"><div>✓</div><h2>{t.done}</h2><p>{t.next}</p>{magicSent&&<a className="primary" href="/signin">{es?'Volver a enviar enlace':'Send another sign-in link'}</a>}</div>:
    <form onSubmit={submit}><div className="formTop"><span>PAIRVOICE</span><b>{es?'CUENTA':'ACCOUNT'}</b></div>{campaign&&<div className="microSteps"><span className="active">1 {es?'Cuenta':'Account'}</span><span>2 {es?'Compañero':'Partner'}</span><span>3 {es?'Trabajo':'Work'}</span></div>}
     <label>{t.first}<input name="first_name" required autoComplete="given-name"/></label>
     <label>{t.email}<input name="email" required type="email" autoComplete="email" inputMode="email"/></label>
     {campaign&&<>
      <input type="hidden" name="country" value={selected?.countryCode||'US'}/>
      <input type="hidden" name="language" value={selected?.languageCode||'en'}/>
      {selected&&<div className="lockedGigFacts"><div><b>{t.country}</b><span>{countryName(selected.countryCode)}</span></div><div><b>{t.language}</b><span>{selected.languageCode.toUpperCase()}</span></div><small>{t.fixed}</small></div>}
      <label className="check"><input name="age" type="checkbox" required/><span>{t.age}</span></label>
     </>}
     <label className="check"><input name="consent" type="checkbox" required/><span>{t.consent}</span></label>
     {error&&<p className="error">{error}</p>}<button disabled={busy}>{busy?t.saving:t.button+' →'}</button>
     <small>{es?'No necesitas tarjeta para crear una cuenta.':'No card required to create an account.'}</small>
    </form>}
    <a className="joinSigninLink" href="/signin">{t.signin}</a>
   </div>
  </section>
 </main>;
}
