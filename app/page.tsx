'use client';
import {FormEvent,useEffect,useMemo,useState} from 'react';
import InviteShareButtons from '../components/InviteShareButtons';
import {trackFunnelEvent} from '../lib/funnel';

type Opportunity={
 slug:string;
 name:string;
 countryCode:string;
 languageCode:string;
 locale:string|null;
 accentTarget:string|null;
 participantCount:number;
 sessionCount:number|null;
 sessionMinutesMin:number|null;
 sessionMinutesMax:number|null;
 deviceRequirement:string|null;
 participantPayoutCents:number|null;
 payoutCurrency:string;
 payoutUnit:'PAIR'|'PARTICIPANT'|'HOURLY'|'FIXED';
 jobFamily:string|null;
 recordingMode:string|null;
 requiresPair:boolean;
};

const marketForLocale=(locale:string)=>{
 const parts=(locale||'en-US').replace('_','-').split('-');
 return (parts[1]||'').toUpperCase()||'UNKNOWN';
};

const marketName=(code:string)=>({
 US:'United States',CA:'Canada',ES:'Spain',AU:'Australia',GB:'United Kingdom',
 IT:'Italy',MX:'Mexico',AR:'Argentina',CO:'Colombia'
} as Record<string,string>)[code]||code;

const money=(cents:number,currency:string)=>{
 try{return new Intl.NumberFormat(undefined,{style:'currency',currency,maximumFractionDigits:0}).format(cents/100)}
 catch{return '$'+Math.round(cents/100)}
};

export default function Home(){
 const[done,setDone]=useState(false),[inviteUrl,setInviteUrl]=useState(''),[partnerJoined,setPartnerJoined]=useState(false);
 const[error,setError]=useState('');
 const[loading,setLoading]=useState(false);
 const[lang,setLang]=useState<'en'|'es'>('en');
 const[market,setMarket]=useState('UNKNOWN');
 const[detectedLocale,setDetectedLocale]=useState('');
 const[opportunities,setOpportunities]=useState<Opportunity[]>([]);
 const[selectedCampaign,setSelectedCampaign]=useState<string|null>(null);

 useEffect(()=>{
  const locale=navigator.language||'en-US';
  setDetectedLocale(locale);
  const requested=new URLSearchParams(location.search).get('lang');
  const detected=requested==='es'||(!requested&&locale.toLowerCase().startsWith('es'))?'es':'en';
  setLang(detected);
  document.documentElement.lang=detected;
  setMarket(marketForLocale(locale));
  trackFunnelEvent('landing_view',{market_code:marketForLocale(locale)});

  const q=new URLSearchParams(location.search);
  const campaign=q.get('campaign');
  if(campaign)setSelectedCampaign(campaign);

  fetch('/api/opportunities')
   .then(r=>r.json())
   .then(d=>setOpportunities(Array.isArray(d.opportunities)?d.opportunities:[]))
   .catch(()=>setOpportunities([]));
 },[]);

 const sorted=useMemo(()=>[...opportunities].sort((a,b)=>{
  const am=a.countryCode===market?0:1,bm=b.countryCode===market?0:1;
  return am-bm||a.name.localeCompare(b.name);
 }),[opportunities,market]);

 const selected=opportunities.find(o=>o.slug===selectedCampaign)||null;

 const t=lang==='es'?{
  join:'Acceso anticipado',
  eyebrow:'TRABAJOS DE VOZ PAGADOS',
  h1:'Una cuenta.',
  h2:'Múltiples oportunidades.',
  lead:'PairVoice organiza proyectos de voz por tipo de trabajo, país, idioma y requisitos. Te mostramos solo las oportunidades que encajan contigo.',
  available:'Oportunidades disponibles',
  choose:'Elige una oportunidad o únete a la lista general.',
  match:'Quiero esta oportunidad',
  payoutUnknown:'Pago por confirmar',
  pair:'pareja aprobada',
  person:'participante aprobado',
  sessions:'conversaciones',
  partner:'Se necesita compañero',
  solo:'Individual',
  joinTitle:'Recibe oportunidades compatibles.',
  startCopy:'Comienza con tu nombre y correo. No pedimos datos de pago ahora; los solicitamos después de que una oportunidad sea aprobada.',
  potential:'Pago potencial',
  firstName:'Nombre', email:'Correo electrónico', invite:'Invita a tu compañero', inviteHelp:'La mayoría de las oportunidades pagadas requieren dos personas. Envía este enlace a tu compañero.',
  consent:'Quiero recibir oportunidades de PairVoice y actualizaciones por correo.',
  button:'Únete a PairVoice →',
  loading:'Guardando…',
  done:'Ya estás en PairVoice.',
   next:'Te avisaremos cuando haya una oportunidad compatible.',
  selected:'Oportunidad seleccionada',
  steps:[['01','Crea un perfil','Tu identidad PairVoice se puede reutilizar en todas las campañas compatibles.'],['02','Encuentra tu campaña','País, idioma, dispositivo y participación anterior determinan tu elegibilidad.'],['03','Forma pareja cuando sea necesario','Algunos trabajos requieren compañero; otros son individuales.'],['04','Sigue cada trabajo','Cada campaña mantiene su propio estado de registro, pareja, entrega y pago.']],
  free:'Gratis. No necesitas pagar ni grabar tu voz para registrarte.',
  footer:'Un perfil de voz. Múltiples oportunidades pagadas.'
 }:{
  join:'Early access',
  eyebrow:'PAID VOICE WORK',
  h1:'One account.',
  h2:'Multiple opportunities.',
  lead:'PairVoice organizes voice work by job type, country, language, and requirements. We match people to the opportunities they actually qualify for.',
  available:'Available opportunities',
  choose:'Choose an opportunity or join the general list.',
  match:'I want this opportunity',
  payoutUnknown:'Payout being finalized',
  pair:'approved pair',
  person:'approved participant',
  sessions:'conversations',
  partner:'Partner required',
  solo:'Individual',
  joinTitle:'Get matched with paid voice work.',
  startCopy:'Start with your name and email. We do not ask for payment details now; we request them after an opportunity is approved.',
  potential:'Potential payout',
  firstName:'First name', email:'Email address', invite:'Invite your partner', inviteHelp:'Most paid conversation opportunities require two people. Send this link to your partner.',
  consent:'Send me PairVoice opportunities and launch updates by email.',
  button:'Join PairVoice →',
  loading:'Saving…',
  done:"You're on PairVoice.",
  next:"We'll email you when a matching opportunity is ready.",
  selected:'Selected opportunity',
  steps:[['01','Create one profile','Your PairVoice identity is reusable across eligible campaigns.'],['02','Match by campaign','Country, language, device and prior participation determine eligibility.'],['03','Pair only when needed','Conversation jobs can require a partner; solo recording jobs do not.'],['04','Track work separately','Each campaign keeps its own enrollment, pair, submission and payout status.']],
  free:'Free to join. No payment details or voice recording required at signup.',
  footer:'One voice profile. Multiple paid opportunities.'
 };

 function choose(slug:string){
  setSelectedCampaign(slug);
  setDone(false);
  trackFunnelEvent('opportunity_view',{campaign_slug:slug});
  trackFunnelEvent('signup_started',{campaign_slug:slug});
  requestAnimationFrame(()=>document.getElementById('join')?.scrollIntoView({behavior:'smooth'}));
 }

 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setLoading(true);setError('');
  trackFunnelEvent('signup_submitted',{campaign_slug:selectedCampaign||'general',language:lang});
  const f=new FormData(e.currentTarget),q=new URLSearchParams(location.search);
  const payload={
   first_name:f.get('first_name'),email:f.get('email'),
   referral_code:q.get('ref')||q.get('invite')||null,
   market_code:market,
   language:lang,
   consent:f.get('consent')==='on',
   detected_locale:detectedLocale,
   detected_languages:Array.from(navigator.languages||[]),
   source:q.get('source')||q.get('src')||null,
   marketing_campaign_key:q.get('campaign_key')||q.get('utm_campaign')||'organic',
   campaign_slug:selectedCampaign,
   source_posting_external_id:q.get('job'),
   landing_path:location.pathname,
   referrer:document.referrer||null,
   fbclid:q.get('fbclid'),
   gclid:q.get('gclid'),
   utm_source:q.get('utm_source'),
   utm_medium:q.get('utm_medium'),
   utm_campaign:q.get('utm_campaign'),
   utm_content:q.get('utm_content'),
   utm_term:q.get('utm_term')
  };
  const r=await fetch('/api/lead',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
  const d=await r.json();setLoading(false);
  if(!r.ok){setError(d.error||'Signup failed');return}
  setInviteUrl(d.inviteUrl||'');setPartnerJoined(!!d.partnerJoined);setDone(true);trackFunnelEvent('signup_completed',{campaign_slug:selectedCampaign||'general'});trackFunnelEvent('email_queued');trackFunnelEvent('invite_created',{has_invite:Boolean(d.inviteUrl)});
 }
 return <main>
  <nav>
   <div className="logo">PAIR<span>VOICE</span></div>
   <div className="navright">
    <select className="language" value={lang} onChange={e=>setLang(e.target.value as 'en'|'es')}>
     <option value="en">EN</option><option value="es">ES</option>
    </select>
    <a href="#join">{t.join}</a>
   </div>
  </nav>

  <section className="hero catalogHero">
   <div className="heroCopy"><div className="eyebrow">{t.eyebrow}</div>
   <h1>{t.h1}<br/><em>{t.h2}</em></h1>
   <p className="lead">{t.lead}</p>
   <div className="actions"><a className="primary" href="#opportunities">{t.available} →</a><span>{market!=='UNKNOWN'?marketName(market):'Global matching'}</span></div></div>
   <div className="heroVisual"><img src="/images/pairvoice-early-access-hero.png" alt="Two people recording a paid voice opportunity together" /></div>
  </section>

  <section className="opportunities" id="opportunities">
   <div className="sectionHead">
    <div><div className="eyebrow">PAIRVOICE JOB CATALOG</div><h2>{t.available}</h2></div>
    <p>{t.choose}</p>
   </div>
   <div className="opportunityGrid">
    {sorted.map(o=>{
     const payout=o.participantPayoutCents!=null
      ? money(o.participantPayoutCents,o.payoutCurrency)+' / '+(o.payoutUnit==='PAIR'?t.pair:t.person)
      : t.payoutUnknown;
     const image=o.jobFamily?.toLowerCase().includes('document')?'/images/pairvoice-opportunity-2.png':o.jobFamily?.toLowerCase().includes('finance')?'/images/pairvoice-opportunity-3.png':'/images/pairvoice-opportunity-1.png';
     return <article className={'opportunityCard '+(o.countryCode===market?'marketMatch':'')} key={o.slug}>
      <img className="opportunityImage" src={image} alt="" />
      <div className="opportunityTop"><span>{marketName(o.countryCode)}</span>{o.countryCode===market&&<b>YOUR MARKET</b>}</div>
      <h3>{o.name}</h3>
      <p className="opportunityType">{o.jobFamily||'Voice recording'}</p>
      <strong className="payout"><small>{t.potential}</small>{payout}</strong>
      <div className="opportunityMeta">
       <span>{o.languageCode.toUpperCase()}</span>
       <span>{o.requiresPair?t.partner:t.solo}</span>
       {o.sessionCount&&<span>{o.sessionCount} {t.sessions}</span>}
       {o.deviceRequirement&&<span>{o.deviceRequirement}</span>}
      </div>
      <button onClick={()=>choose(o.slug)}>{t.match} →</button>
     </article>
    })}
    {!sorted.length&&<article className="opportunityCard"><h3>Loading opportunities…</h3></article>}
   </div>
  </section>

  <section className="steps">
   {t.steps.map(([n,title,body])=><div key={n}><i>{n}</i><h3>{title}</h3><p>{body}</p></div>)}
  </section>

  <section className="join" id="join">
   <div>
    <div className="eyebrow">PAIRVOICE MATCHING</div>
    <h2>{t.joinTitle}</h2>
    {selected&&<div className="selectedJob"><small>{t.selected}</small><strong>{selected.name}</strong></div>}
    <p>{t.startCopy}</p>
   </div>
   <div className="card">
    {done?<div className="success"><div>✓</div><h3>{partnerJoined?(lang==='es'?'¡Tu pareja está conectada!':'Your pair is connected!'):t.done}</h3><p>{partnerJoined?(lang==='es'?'Te enviaremos los próximos pasos.':'We’ll email you the next steps.'):t.next}</p>{!partnerJoined&&<><p className="inviteHelp">{t.inviteHelp}</p><InviteShareButtons inviteUrl={inviteUrl} language={lang}/></>}</div>:
    <form onSubmit={submit}>
     <h3>{selected?selected.name:t.joinTitle}</h3>
     <label htmlFor="early-access-first-name">{t.firstName}</label><input id="early-access-first-name" required name="first_name" autoComplete="given-name" autoCapitalize="words" enterKeyHint="next"/><label htmlFor="early-access-email">{t.email}</label><input id="early-access-email" required type="email" name="email" autoComplete="email" inputMode="email" autoCapitalize="none" spellCheck={false} enterKeyHint="done"/>
     <label className="check" htmlFor="early-access-consent"><input id="early-access-consent" required name="consent" type="checkbox"/><span>{t.consent}</span></label>
     {error&&<p className="error">{error}</p>}
     <button disabled={loading}>{loading?t.loading:t.button}</button>
     <small>{t.free}</small>
    </form>}
   </div>
  </section>

  <footer><div className="logo">PAIR<span>VOICE</span></div><p>{t.footer}</p></footer>
 </main>
}
