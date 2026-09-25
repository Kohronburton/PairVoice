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
 const[opportunitiesLoading,setOpportunitiesLoading]=useState(true);
 const[opportunitiesError,setOpportunitiesError]=useState(false);
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
   .then(async r=>{
    if(!r.ok)throw new Error('catalog unavailable');
    return r.json();
   })
   .then(d=>setOpportunities(Array.isArray(d.opportunities)?d.opportunities:[]))
   .catch(()=>{setOpportunities([]);setOpportunitiesError(true)})
   .finally(()=>setOpportunitiesLoading(false));
 },[]);

 const sorted=useMemo(()=>[...opportunities].sort((a,b)=>{
  const am=a.countryCode===market?0:1,bm=b.countryCode===market?0:1;
  return am-bm||a.name.localeCompare(b.name);
 }),[opportunities,market]);

 const selected=opportunities.find(o=>o.slug===selectedCampaign)||null;

 const t=lang==='es'?{
  join:'Únete gratis',
  eyebrow:'PROYECTOS DE VOZ REMUNERADOS',
  h1:'Hablad.',
  h2:'Grabad. Cobrad.',
  lead:'PairVoice te conecta con proyectos remunerados de grabación de voz. Elige una oportunidad, invita a tu compañero cuando sea necesario, sigue las instrucciones y cobra cuando el trabajo sea aprobado.',
  available:'Proyectos disponibles',
  choose:'Consulta el pago y los requisitos antes de participar.',
  catalogEmpty:'Las oportunidades específicas se están preparando. Únete a la lista general y te avisaremos cuando haya una compatible.',
  general:'Únete a la lista general',
  match:'Quiero participar',
  payoutUnknown:'Pago por confirmar',
  pair:'pareja aprobada',
  person:'participante aprobado',
  sessions:'conversaciones',
  partner:'Se necesita compañero',
  solo:'Individual',
  joinTitle:'Encuentra proyectos de voz remunerados.',
  startCopy:'Comienza con tu nombre y correo. No pedimos datos de pago ahora; los solicitamos después de que una oportunidad sea aprobada.',
  potential:'Pago potencial',
  firstName:'Nombre', email:'Correo electrónico', invite:'Invita a tu compañero', inviteHelp:'Necesitas un compañero para acceder a la mayoría de los proyectos remunerados. Comparte tu enlace personal ahora. Cuando ambos estéis registrados, podremos consideraros para proyectos que requieren dos personas.',
  consent:'Quiero recibir oportunidades de PairVoice y actualizaciones por correo.',
  button:'Únete a PairVoice →',
  loading:'Guardando…',
  done:'Ya estás en PairVoice.',
   next:'Paso 1 completado. Para acceder a la mayoría de los proyectos remunerados, completa ahora el Paso 2: invita a tu compañero.',
  selected:'Oportunidad seleccionada',
  steps:[['01','Encuentra un proyecto','Revisa el pago, el país, el idioma y los requisitos.'],['02','Comprueba si calificas','Responde solo a lo que necesita ese proyecto.'],['03','Invita a tu compañero','Si el proyecto requiere dos personas, conecta a la persona correcta.'],['04','Graba, envía y cobra','Sigue las instrucciones y cobra después de la aprobación.']],
  free:'Gratis. No necesitas pagar ni grabar tu voz para registrarte.',
  footer:'Tu voz tiene valor.'
 }:{
  join:'Join free',
  eyebrow:'PAID VOICE GIGS',
  h1:'Get paid',
  h2:'to talk.',
  lead:'PairVoice connects you with paid voice-recording projects. Choose a gig, bring or invite a partner when required, follow the instructions, and get paid after approval.',
  available:'Available paid gigs',
  choose:'See the payout and requirements before you join.',
  catalogEmpty:'Specific opportunities are being prepared. Join the general list and we’ll email you when a match is ready.',
  general:'Join the general list',
  match:'Join this gig',
  payoutUnknown:'Payout being finalized',
  pair:'approved pair',
  person:'approved participant',
  sessions:'conversations',
  partner:'Partner required',
  solo:'Individual',
  joinTitle:'Get matched with paid voice gigs.',
  startCopy:'Start with your name and email. We do not ask for payment details now; we request them after an opportunity is approved.',
  potential:'Potential payout',
  firstName:'First name', email:'Email address', invite:'Invite your partner', inviteHelp:'You need a partner to qualify for most paid conversation gigs. Share your personal link now. Once both of you are signed up, we can consider your pair for gigs that require two people.',
  consent:'Send me PairVoice opportunities and launch updates by email.',
  button:'Join PairVoice →',
  loading:'Saving…',
  done:"You're on PairVoice.",
  next:"Step 1 is complete. To qualify for most paid gigs, complete Step 2 now: invite your partner.",
  selected:'Selected opportunity',
  steps:[['01','Find a gig','See the payout, market, language and requirements.'],['02','Check your fit','Answer only what that campaign needs.'],['03','Bring or invite a partner','When a gig requires two people, connect the right person.'],['04','Record, submit & get paid','Follow the instructions and get paid after approval.']],
  free:'Free to join. No payment details or voice recording required at signup.',
  footer:'Your voice has value.'
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
  setInviteUrl(d.inviteUrl||'');setPartnerJoined(!!d.partnerJoined);setDone(true);trackFunnelEvent('signup_completed',{campaign_slug:selectedCampaign||'general',email_sent:Boolean(d.emailStatus?.sent)});if(d.emailStatus?.sent)trackFunnelEvent('email_queued');trackFunnelEvent('invite_created',{has_invite:Boolean(d.inviteUrl)});
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
   <div className="heroVisual"><img src="/images/pairvoice-early-access-hero.jpg" alt="Two people recording a paid voice opportunity together" width="1122" height="1402" fetchPriority="high" decoding="async" /></div>
  </section>

  <section className="opportunities" id="opportunities">
   <div className="sectionHead">
    <div><div className="eyebrow">PAIRVOICE JOB CATALOG</div><h2>{t.available}</h2></div>
    <p>{t.choose}</p>
   </div>
   <div className="opportunityGrid">
    {opportunitiesLoading&&<article className="opportunityCard catalogMessage"><h3>{lang==='es'?'Cargando oportunidades…':'Loading opportunities…'}</h3><p>{lang==='es'?'También puedes unirte a la lista general mientras se cargan.':'You can also join the general list while the catalog loads.'}</p><button onClick={()=>document.getElementById('join')?.scrollIntoView({behavior:'smooth'})}>{t.general} →</button></article>}
    {!opportunitiesLoading&&sorted.map(o=>{
     const payout=o.participantPayoutCents!=null
      ? money(o.participantPayoutCents,o.payoutCurrency)+' / '+(o.payoutUnit==='PAIR'?t.pair:t.person)
      : t.payoutUnknown;
     const image=o.jobFamily?.toLowerCase().includes('document')?'/images/pairvoice-opportunity-2.jpg':o.jobFamily?.toLowerCase().includes('finance')?'/images/pairvoice-opportunity-3.jpg':'/images/pairvoice-opportunity-1.jpg';
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
    {!opportunitiesLoading&&!sorted.length&&<article className="opportunityCard catalogMessage"><h3>{opportunitiesError?(lang==='es'?'Las oportunidades están por llegar.':'Opportunities are opening soon.'):(lang==='es'?'No hay oportunidades publicadas todavía.':'No opportunities are published yet.')}</h3><p>{t.catalogEmpty}</p><button onClick={()=>document.getElementById('join')?.scrollIntoView({behavior:'smooth'})}>{t.general} →</button></article>}
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
    {done?<div className="success">{partnerJoined?<><div className="successCheck">✓</div><h3>{lang==='es'?'¡Tu pareja está conectada!':'Your pair is connected!'}</h3><p>{lang==='es'?'Te enviaremos los próximos pasos.':'We’ll email you the next steps.'}</p></>:<><div className="pairProgress" aria-label={lang==='es'?'Progreso para formar pareja':'Pair formation progress'}><div className="progressStep complete"><span>✓</span><div><small>{lang==='es'?'PASO 1':'STEP 1'}</small><strong>{lang==='es'?'Te uniste a PairVoice':'You joined PairVoice'}</strong><p>{lang==='es'?'Tu cuenta está lista.':'Your account is ready.'}</p></div><b>{lang==='es'?'Completo':'Complete'}</b></div><div className="progressStep required"><span>2</span><div><small>{lang==='es'?'PASO 2':'STEP 2'}</small><strong>{lang==='es'?'Invita a tu compañero':'Invite your partner'}</strong><p>{lang==='es'?'Necesario para la mayoría de los proyectos remunerados.':'Required for most paid gigs.'}</p></div><b>{lang==='es'?'Necesario':'Required'}</b></div></div><div className="partnerRequired"><strong>{lang==='es'?'Necesitas un compañero para acceder a la mayoría de los proyectos remunerados.':'You need a partner to get matched for most paid gigs.'}</strong><p>{t.inviteHelp}</p></div><div className="shareNext"><h3>{lang==='es'?'Invita a tu compañero ahora':'Invite your partner now'}</h3><small>{lang==='es'?'COMPARTE TU ENLACE PERSONAL':'SHARE YOUR PERSONAL LINK'}</small><InviteShareButtons inviteUrl={inviteUrl} language={lang}/></div></>}</div>:
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
