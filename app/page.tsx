'use client';
import {FormEvent,useEffect,useMemo,useState} from 'react';

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
 const[done,setDone]=useState(false);
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
  if(locale.toLowerCase().startsWith('es'))setLang('es');
  setMarket(marketForLocale(locale));

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
  email:'Correo electrónico',
  consent:'Quiero recibir oportunidades de PairVoice y actualizaciones por correo.',
  button:'Únete a PairVoice →',
  loading:'Guardando…',
  done:'Ya estás en PairVoice.',
  next:'Te avisaremos cuando haya una oportunidad compatible.',
  selected:'Oportunidad seleccionada'
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
  email:'Email address',
  consent:'Send me PairVoice opportunities and launch updates by email.',
  button:'Join PairVoice →',
  loading:'Saving…',
  done:"You're on PairVoice.",
  next:"We'll email you when a matching opportunity is ready.",
  selected:'Selected opportunity'
 };

 function choose(slug:string){
  setSelectedCampaign(slug);
  setDone(false);
  requestAnimationFrame(()=>document.getElementById('join')?.scrollIntoView({behavior:'smooth'}));
 }

 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setLoading(true);setError('');
  const f=new FormData(e.currentTarget),q=new URLSearchParams(location.search);
  const payload={
   email:f.get('email'),
   market_code:market,
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
  setDone(true);
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
   <div className="eyebrow">{t.eyebrow}</div>
   <h1>{t.h1}<br/><em>{t.h2}</em></h1>
   <p className="lead">{t.lead}</p>
   <div className="actions"><a className="primary" href="#opportunities">{t.available} →</a><span>{market!=='UNKNOWN'?marketName(market):'Global matching'}</span></div>
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
     return <article className={'opportunityCard '+(o.countryCode===market?'marketMatch':'')} key={o.slug}>
      <div className="opportunityTop"><span>{marketName(o.countryCode)}</span>{o.countryCode===market&&<b>YOUR MARKET</b>}</div>
      <h3>{o.name}</h3>
      <p className="opportunityType">{o.jobFamily||'Voice recording'}</p>
      <strong className="payout">{payout}</strong>
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
   <div><i>01</i><h3>Create one profile</h3><p>Your PairVoice identity is reusable across eligible campaigns.</p></div>
   <div><i>02</i><h3>Match by campaign</h3><p>Country, language, device and prior participation determine eligibility.</p></div>
   <div><i>03</i><h3>Pair only when needed</h3><p>Conversation jobs can require a partner; solo recording jobs do not.</p></div>
   <div><i>04</i><h3>Track work separately</h3><p>Each campaign keeps its own enrollment, pair, submission and payout status.</p></div>
  </section>

  <section className="join" id="join">
   <div>
    <div className="eyebrow">PAIRVOICE MATCHING</div>
    <h2>{t.joinTitle}</h2>
    {selected&&<div className="selectedJob"><small>{t.selected}</small><strong>{selected.name}</strong></div>}
    <p>Start with your email. We only ask for additional information when a real opportunity requires it.</p>
   </div>
   <div className="card">
    {done?<div className="success"><div>✓</div><h3>{t.done}</h3><p>{t.next}</p></div>:
    <form onSubmit={submit}>
     <h3>{selected?selected.name:t.joinTitle}</h3>
     <label>{t.email}<input required type="email" name="email" autoComplete="email"/></label>
     <label className="check"><input required name="consent" type="checkbox"/><span>{t.consent}</span></label>
     {error&&<p className="error">{error}</p>}
     <button disabled={loading}>{loading?t.loading:t.button}</button>
     <small>Free to join. No payment details or voice recording required at signup.</small>
    </form>}
   </div>
  </section>

  <footer><div className="logo">PAIR<span>VOICE</span></div><p>One voice profile. Multiple paid opportunities.</p></footer>
 </main>
}
