'use client';
import {useEffect,useMemo,useState} from 'react';
import {trackFunnelEvent} from '../lib/funnel';

type Opportunity={
 slug:string;name:string;countryCode:string;languageCode:string;locale:string|null;
 participantPayoutCents:number|null;payoutCurrency:string;payoutUnit:'PAIR'|'PARTICIPANT'|'HOURLY'|'FIXED';
 jobFamily:string|null;requiresPair:boolean;sessionCount:number|null;sessionMinutesMin:number|null;sessionMinutesMax:number|null;
 deviceRequirement:string|null;
};

const marketForLocale=(locale:string)=>{
 const parts=(locale||'en-US').replace('_','-').split('-');
 return (parts[1]||'').toUpperCase()||'UNKNOWN';
};
const marketName=(code:string)=>({US:'United States',ES:'Spain',CA:'Canada',AU:'Australia',GB:'United Kingdom',IT:'Italy',MX:'Mexico',AR:'Argentina',CO:'Colombia'} as Record<string,string>)[code]||code;
const money=(cents:number|null,currency:string)=>{
 if(cents==null)return null;
 try{return new Intl.NumberFormat(undefined,{style:'currency',currency,maximumFractionDigits:0}).format(cents/100)}
 catch{return '$'+Math.round(cents/100)}
};

export default function Home(){
 const[lang,setLang]=useState<'en'|'es'>('en'),[market,setMarket]=useState('UNKNOWN');
 const[opportunities,setOpportunities]=useState<Opportunity[]>([]),[loading,setLoading]=useState(true),[failed,setFailed]=useState(false);

 useEffect(()=>{
  const q=new URLSearchParams(location.search),locale=navigator.language||'en-US';
  const detected=q.get('lang')==='es'||(!q.get('lang')&&locale.toLowerCase().startsWith('es'))?'es':'en';
  setLang(detected);document.documentElement.lang=detected;setMarket(marketForLocale(locale));
  trackFunnelEvent('landing_view',{market_code:marketForLocale(locale),surface:'production'});
  fetch('/api/opportunities')
   .then(r=>r.ok?r.json():Promise.reject(new Error('catalog unavailable')))
   .then(d=>setOpportunities(Array.isArray(d.opportunities)?d.opportunities:[]))
   .catch(()=>setFailed(true))
   .finally(()=>setLoading(false));
 },[]);

 const sorted=useMemo(()=>[...opportunities].sort((a,b)=>(a.countryCode===market?0:1)-(b.countryCode===market?0:1)||a.name.localeCompare(b.name)),[opportunities,market]);
 const es=lang==='es';
 const copy=es?{
  navWork:'Trabajos',how:'Cómo funciona',signin:'Entrar',join:'Ver trabajos',
  eyebrow:'TRABAJO DE VOZ PAGADO',
  heroA:'Hablad.',heroB:'Grabad.',heroC:'Cobrad.',
  lead:'PairVoice te conecta con proyectos de conversación remunerados. Elige un trabajo, forma tu pareja, sigue las instrucciones y controla tu progreso desde una sola cuenta.',
  cta:'Ver trabajos disponibles',account:'Ya tengo cuenta',
  trust:'Sin cuotas para registrarte. Sin datos de pago al inicio. Cada proyecto muestra sus requisitos antes de participar.',
  jobsEyebrow:'TRABAJOS DISPONIBLES',jobsTitle:'Elige cuánto quieres ganar.',jobsLead:'Empieza con un proyecto compatible con tu país e idioma. El pago mostrado es el total de la pareja.',
  loading:'Cargando oportunidades…',empty:'Nuevos proyectos estarán disponibles pronto.',start:'Empezar este trabajo',
  perPair:'por pareja',partner:'Se necesita compañero',solo:'Individual',sessions:'sesiones',
  howEyebrow:'UN CAMINO CLARO',howTitle:'No tienes que adivinar qué hacer.',
  steps:[
   ['01','Elige un trabajo','Mira el pago, país, idioma y requisitos antes de registrarte.'],
   ['02','Crea tu cuenta','Regístrate una vez. Tu panel te muestra exactamente qué hacer después.'],
   ['03','Forma tu pareja','Invita a alguien que conozcas. La opción de encontrar pareja en PairVoice llegará próximamente.'],
   ['04','Graba y cobra','Busca un lugar tranquilo, sigue las instrucciones del proyecto, habla sobre el tema y completa el trabajo para recibir el pago indicado.']
  ],
  finalTitle:'Tu voz tiene valor.',finalBody:'Empieza con el trabajo que encaje contigo y deja que PairVoice te guíe paso a paso.',finalCta:'Encontrar un trabajo →',
  footer:'Trabajo de voz pagado, organizado de principio a fin.'
 }:{
  navWork:'Gigs',how:'How it works',signin:'Sign in',join:'Find a gig',
  eyebrow:'PAID VOICE WORK',
  heroA:'Talk together.',heroB:'Record.',heroC:'Get paid.',
  lead:'PairVoice connects you with paid conversation projects. Choose a gig, form your pair, follow the instructions, and track every step from one account.',
  cta:'See available gigs',account:'I already have an account',
  trust:'Free to sign up. No payout details up front. Every gig shows the requirements before you join.',
  jobsEyebrow:'AVAILABLE GIGS',jobsTitle:'Choose what you want to earn.',jobsLead:'Start with a project that matches your country and language. The payout shown is the total for the pair.',
  loading:'Loading opportunities…',empty:'New paid gigs are opening soon.',start:'Start this gig',
  perPair:'per pair',partner:'Partner required',solo:'Individual',sessions:'sessions',
  howEyebrow:'ONE CLEAR PATH',howTitle:'You should never have to guess what happens next.',
  steps:[
   ['01','Choose a gig','See the payout, country, language, and requirements before you sign up.'],
   ['02','Create your account','Register once. Your dashboard tells you exactly what to do next.'],
   ['03','Form your pair','Invite someone you know. PairVoice partner matching is coming soon.'],
   ['04','Record and get paid','Find a quiet place, follow the gig instructions, talk about the assigned topic, and complete the work for the listed payout.']
  ],
  finalTitle:'Your voice has value.',finalBody:'Start with the gig that fits you and let PairVoice guide you from signup through payout.',finalCta:'Find a paid gig →',
  footer:'Paid voice work, organized from start to finish.'
 };

 function choose(slug:string){
  trackFunnelEvent('opportunity_view',{campaign_slug:slug,surface:'homepage'});
  location.href=`/join?campaign=${encodeURIComponent(slug)}&lang=${lang}`;
 }

 return <main className="productionHome">
  <nav className="productionNav">
   <a className="logo logoLink" href="/">PAIR<span>VOICE</span></a>
   <div className="homeNavLinks"><a href="#gigs">{copy.navWork}</a><a href="#how">{copy.how}</a></div>
   <div className="navright">
    <button className="language" onClick={()=>{const next=es?'en':'es';setLang(next);document.documentElement.lang=next}}>{es?'EN':'ES'}</button>
    <a className="navSignIn" href="/login">{copy.signin}</a>
    <a href="#gigs">{copy.join}</a>
   </div>
  </nav>

  <section className="productionHero">
   <div className="productionHeroCopy">
    <div className="eyebrow">{copy.eyebrow}</div>
    <h1>{copy.heroA}<br/><em>{copy.heroB}</em><br/>{copy.heroC}</h1>
    <p className="lead">{copy.lead}</p>
    <div className="heroCtas"><a className="primary" href="#gigs">{copy.cta} →</a><a className="secondaryCta" href="/login">{copy.account}</a></div>
    <p className="trustCopy">{copy.trust}</p>
   </div>
   <div className="productionHeroImage">
    <img src="/images/pairvoice-early-access-hero.jpg" alt={es?'Dos personas preparándose para un proyecto de voz remunerado':'Two people preparing for a paid voice project'} width="1122" height="1402" fetchPriority="high"/>
    <div className="earningsFloat"><span>{es?'PROCESO':'PROCESS'}</span><strong>Sign up → Pair → Record → Get paid</strong></div>
   </div>
  </section>

  <section className="productionProof">
   <div><strong>1</strong><span>{es?'cuenta':'account'}</span></div>
   <div><strong>2</strong><span>{es?'personas por conversación':'people per conversation'}</span></div>
   <div><strong>EN / ES</strong><span>{es?'experiencia bilingüe':'bilingual experience'}</span></div>
   <div><strong>100%</strong><span>{es?'progreso visible':'visible workflow'}</span></div>
  </section>

  <section className="productionJobs" id="gigs">
   <div className="sectionHead">
    <div><div className="eyebrow">{copy.jobsEyebrow}</div><h2>{copy.jobsTitle}</h2></div>
    <p>{copy.jobsLead}</p>
   </div>
   <div className="productionJobGrid">
    {loading&&<article className="productionJobCard messageCard"><h3>{copy.loading}</h3></article>}
    {!loading&&sorted.map((o,index)=>{
     const payout=money(o.participantPayoutCents,o.payoutCurrency);
     const image=index%3===0?'/images/pairvoice-opportunity-1.jpg':index%3===1?'/images/pairvoice-opportunity-2.jpg':'/images/pairvoice-opportunity-3.jpg';
     return <article className={'productionJobCard '+(o.countryCode===market?'localJob':'')} key={o.slug}>
      <img src={image} alt="" className="productionJobImage"/>
      <div className="productionJobBody">
       <div className="productionJobTop"><span>{marketName(o.countryCode)}</span>{o.countryCode===market&&<b>{es?'TU MERCADO':'YOUR MARKET'}</b>}</div>
       <h3>{o.name}</h3>
       <p>{o.jobFamily||'Conversation recording'}</p>
       <div className="productionPayout"><small>{es?'PAGO DEL PROYECTO':'GIG PAYOUT'}</small><strong>{payout||'TBD'}</strong><span>{copy.perPair}</span></div>
       <div className="jobChips"><span>{o.languageCode.toUpperCase()}</span><span>{o.requiresPair?copy.partner:copy.solo}</span>{o.sessionCount&&<span>{o.sessionCount} {copy.sessions}</span>}</div>
       <button onClick={()=>choose(o.slug)}>{copy.start} →</button>
      </div>
     </article>
    })}
    {!loading&&!sorted.length&&<article className="productionJobCard messageCard"><h3>{copy.empty}</h3><p>{failed?(es?'Vuelve a intentarlo en breve.':'Please check back shortly.'):(es?'Estamos preparando el siguiente lote.':'We are preparing the next batch.')}</p></article>}
   </div>
  </section>

  <section className="productionHow" id="how">
   <div className="eyebrow">{copy.howEyebrow}</div><h2>{copy.howTitle}</h2>
   <div className="productionSteps">{copy.steps.map(([n,title,body])=><article key={n}><span>{n}</span><h3>{title}</h3><p>{body}</p></article>)}</div>
  </section>

  <section className="productionFinal">
   <div><div className="eyebrow">PAIRVOICE</div><h2>{copy.finalTitle}</h2><p>{copy.finalBody}</p></div>
   <a className="primary" href="#gigs">{copy.finalCta}</a>
  </section>

  <footer><div className="logo">PAIR<span>VOICE</span></div><p>{copy.footer}</p><a className="footerLogin" href="/login">{copy.signin}</a></footer>
 </main>;
}
