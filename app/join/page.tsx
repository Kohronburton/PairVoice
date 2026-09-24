'use client';
import {FormEvent,useEffect,useMemo,useState} from 'react';
import {getBrowserSupabase} from '../../lib/supabase-browser';
import {trackFunnelEvent} from '../../lib/funnel';
import InviteShareButtons from '../../components/InviteShareButtons';

type Opportunity={
 slug:string;name:string;countryCode:string;languageCode:string;participantCount:number;
 participantPayoutCents:number|null;payoutCurrency:string;payoutUnit:'PAIR'|'PARTICIPANT'|'HOURLY'|'FIXED';
 requiresPair:boolean;sessionCount:number|null;sessionMinutesMin:number|null;sessionMinutesMax:number|null;
 deviceRequirement:string|null;
};

const marketName=(code:string)=>({US:'United States',ES:'Spain',CA:'Canada',AU:'Australia',GB:'United Kingdom'} as Record<string,string>)[code]||code;
const money=(cents:number|null,currency:string)=>cents==null?'Payout shown before enrollment':new Intl.NumberFormat(undefined,{style:'currency',currency,maximumFractionDigits:0}).format(cents/100);

export default function JoinPage(){
 const[opps,setOpps]=useState<Opportunity[]>([]),[selectedSlug,setSelectedSlug]=useState(''),[lang,setLang]=useState<'en'|'es'>('en');
 const[loading,setLoading]=useState(false),[catalogLoading,setCatalogLoading]=useState(true),[error,setError]=useState('');
 const[result,setResult]=useState<{inviteUrl:string;pairCode:string;participantCode:string;magicLinkSent:boolean}|null>(null);

 useEffect(()=>{
  const q=new URLSearchParams(location.search);
  const requested=q.get('lang');
  const l=requested==='es'||(!requested&&navigator.language.toLowerCase().startsWith('es'))?'es':'en';
  setLang(l);document.documentElement.lang=l;
  setSelectedSlug(q.get('campaign')||'');
  trackFunnelEvent('onboarding_view',{campaign_slug:q.get('campaign')||'none'});
  fetch('/api/opportunities').then(r=>r.ok?r.json():Promise.reject()).then(d=>setOpps(Array.isArray(d.opportunities)?d.opportunities:[])).catch(()=>setError(l==='es'?'No pudimos cargar los proyectos.':'We could not load the available gigs.')).finally(()=>setCatalogLoading(false));
 },[]);

 const selected=useMemo(()=>opps.find(o=>o.slug===selectedSlug)||null,[opps,selectedSlug]);
 const es=lang==='es';

 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(!selected)return;setLoading(true);setError('');
  const f=new FormData(e.currentTarget),q=new URLSearchParams(location.search);
  trackFunnelEvent('signup_submitted',{campaign_slug:selected.slug,surface:'production_onboarding'});
  try{
   const email=String(f.get('email')||'').trim();
   const response=await fetch('/api/signup',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({
    campaign:selected.slug,firstName:f.get('first_name'),email,phone:f.get('phone')||null,
    countryCode:selected.countryCode,languageCode:selected.languageCode,is18Plus:f.get('age')==='on',
    consent:f.get('consent')==='on',ref:q.get('ref')||null
   })});
   const data=await response.json();
   if(!response.ok)throw new Error(data.error||(es?'No se pudo completar el registro.':'Unable to complete enrollment.'));
   let magicLinkSent=false;
   try{
    const supabase=getBrowserSupabase();
    const{error:authError}=await supabase.auth.signInWithOtp({email,options:{emailRedirectTo:`${location.origin}/dashboard`,shouldCreateUser:true}});
    if(!authError){magicLinkSent=true;trackFunnelEvent('magic_link_sent',{surface:'onboarding'});}
   }catch{}
   setResult({inviteUrl:data.inviteUrl||'',pairCode:data.pairCode||'',participantCode:data.participantCode||'',magicLinkSent});
   trackFunnelEvent('signup_completed',{campaign_slug:selected.slug,surface:'production_onboarding'});
   trackFunnelEvent('onboarding_completed',{campaign_slug:selected.slug});
   if(data.inviteUrl)trackFunnelEvent('invite_created',{campaign_slug:selected.slug});
  }catch(err){setError(err instanceof Error?err.message:'Unable to complete enrollment.')}
  finally{setLoading(false)}
 }

 return <main className="flowPage">
  <nav><a className="logo logoLink" href="/">PAIR<span>VOICE</span></a><div className="navright"><button className="language" onClick={()=>setLang(es?'en':'es')}>{es?'EN':'ES'}</button><a href="/login">{es?'Entrar':'Sign in'}</a></div></nav>
  <section className="flowShell">
   <div className="flowIntro">
    <div className="eyebrow">{es?'REGISTRO DE PRODUCCIÓN':'PRODUCTION SIGNUP'}</div>
    <h1>{es?'Elige el trabajo. Forma tu pareja. Cobra.':'Choose the gig. Form your pair. Get paid.'}</h1>
    <p className="lead">{es?'Crea tu cuenta una vez y usa PairVoice para seguir cada trabajo desde el registro hasta el pago.':'Create your account once, then use PairVoice to track each gig from signup through payout.'}</p>
   </div>

   {result?<div className="card productionSuccess">
    <div className="success"><div>✓</div><h3>{es?'Tu plaza está registrada.':'Your spot is registered.'}</h3>
    <p>{result.magicLinkSent?(es?'Te enviamos un enlace seguro para abrir tu panel de PairVoice.':'We sent a secure link to open your PairVoice dashboard.'):(es?'Tu registro está completo. Puedes entrar con el mismo correo.':'Your enrollment is complete. Sign in with the same email to open your dashboard.')}</p>
    <a className="darkCta" href="/login">{es?'Abrir mi cuenta →':'Open my account →'}</a></div>
    {selected?.requiresPair&&result.inviteUrl&&<div className="partnerNext"><span className="stepBadge">NEXT</span><h3>{es?'Ahora invita a tu compañero/a.':'Now invite your partner.'}</h3><p>{es?'La pareja se confirma cuando la segunda persona termina su registro.':'Your pair becomes active when the second person completes signup.'}</p><InviteShareButtons inviteUrl={result.inviteUrl} language={lang}/></div>}
   </div>:
   <div className="flowGrid">
    <section className="flowPanel">
     <span className="stepBadge">1</span><h2>{es?'Elige un proyecto':'Choose a gig'}</h2>
     {catalogLoading?<p>{es?'Cargando…':'Loading…'}</p>:<div className="selectableJobs">
      {opps.map(o=><button key={o.slug} type="button" className={selectedSlug===o.slug?'jobChoice selectedChoice':'jobChoice'} onClick={()=>{setSelectedSlug(o.slug);trackFunnelEvent('opportunity_view',{campaign_slug:o.slug,surface:'onboarding'})}}>
       <strong>{o.name}</strong><span>{marketName(o.countryCode)} · {o.languageCode.toUpperCase()}</span><b>{money(o.participantPayoutCents,o.payoutCurrency)} / pair</b>
      </button>)}
     </div>}
    </section>

    <section className="card flowFormCard">
     <span className="stepBadge">2</span>
     <form onSubmit={submit}>
      <h3>{selected?(es?'Completa tu registro':'Complete your signup'):(es?'Selecciona un proyecto primero':'Select a gig first')}</h3>
      {selected&&<div className="selectedJob"><small>{es?'PROYECTO SELECCIONADO':'SELECTED GIG'}</small><strong>{selected.name}</strong><span>{marketName(selected.countryCode)} · {selected.languageCode.toUpperCase()} · {money(selected.participantPayoutCents,selected.payoutCurrency)} / pair</span></div>}
      <label htmlFor="join-first">{es?'Nombre':'First name'}</label><input id="join-first" name="first_name" required disabled={!selected} autoComplete="given-name"/>
      <label htmlFor="join-email">{es?'Correo electrónico':'Email address'}</label><input id="join-email" name="email" type="email" required disabled={!selected} autoComplete="email" inputMode="email"/>
      <label htmlFor="join-phone">{es?'Teléfono (opcional)':'Phone (optional)'}</label><input id="join-phone" name="phone" type="tel" disabled={!selected} autoComplete="tel" inputMode="tel"/>
      <label className="check"><input name="age" type="checkbox" required disabled={!selected}/><span>{es?'Confirmo que tengo 18 años o más.':'I confirm I am 18 or older.'}</span></label>
      {selected&&<label className="check"><input name="eligibility" type="checkbox" required/><span>{es?`Confirmo que cumplo los requisitos de ${marketName(selected.countryCode)} y puedo grabar en ${selected.languageCode.toUpperCase()}.`:`I confirm I meet the ${marketName(selected.countryCode)} requirements and can record in ${selected.languageCode.toUpperCase()}.`}</span></label>}
      <label className="check"><input name="consent" type="checkbox" required disabled={!selected}/><span>{es?'Acepto recibir instrucciones del proyecto y actualizaciones de PairVoice.':'Send me PairVoice gig instructions and account updates.'}</span></label>
      {error&&<p className="error">{error}</p>}
      <button disabled={!selected||loading}>{loading?(es?'Creando tu cuenta…':'Creating your account…'):(es?'Reservar mi plaza →':'Claim my spot →')}</button>
      <small>{es?'No pedimos datos de pago ahora. Los pagos se configuran después de la aprobación.':'No payout details are requested now. Payout setup comes after approved work.'}</small>
     </form>
    </section>
   </div>}
  </section>
 </main>;
}
