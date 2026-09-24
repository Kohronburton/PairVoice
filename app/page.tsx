'use client';
import {useEffect,useMemo,useState} from 'react';
import {trackFunnelEvent} from '../lib/funnel';

type Opportunity={
 slug:string;name:string;countryCode:string;languageCode:string;locale:string|null;
 accentTarget:string|null;participantCount:number;sessionCount:number|null;
 sessionMinutesMin:number|null;sessionMinutesMax:number|null;deviceRequirement:string|null;
 participantPayoutCents:number|null;payoutCurrency:string;payoutUnit:'PAIR'|'PARTICIPANT'|'HOURLY'|'FIXED';
 jobFamily:string|null;recordingMode:string|null;requiresPair:boolean;
};

const marketForLocale=(l:string)=>{const p=(l||'en-US').replace('_','-').split('-');return(p[1]||'').toUpperCase()||'UNKNOWN'};
const marketName=(c:string)=>({US:'United States',ES:'Spain',CA:'Canada',GB:'United Kingdom',AU:'Australia',MX:'Mexico',AR:'Argentina',CO:'Colombia'} as Record<string,string>)[c]||c;
const money=(c:number,x:string)=>{try{return new Intl.NumberFormat(undefined,{style:'currency',currency:x,maximumFractionDigits:0}).format(c/100)}catch{return'$'+Math.round(c/100)}};

export default function Home(){
 const[lang,setLang]=useState<'en'|'es'>('en');
 const[market,setMarket]=useState('UNKNOWN');
 const[ops,setOps]=useState<Opportunity[]>([]);
 const[loading,setLoading]=useState(true);
 const[error,setError]=useState(false);

 useEffect(()=>{
  const locale=navigator.language||'en-US',q=new URLSearchParams(location.search),requested=q.get('lang');
  const detected=requested==='es'||(!requested&&locale.toLowerCase().startsWith('es'))?'es':'en';
  setLang(detected);document.documentElement.lang=detected;setMarket(marketForLocale(locale));
  trackFunnelEvent('landing_view',{market_code:marketForLocale(locale),surface:'production_marketplace'});
  fetch('/api/opportunities').then(async r=>{if(!r.ok)throw new Error('catalog');return r.json()})
   .then(d=>setOps(Array.isArray(d.opportunities)?d.opportunities:[]))
   .catch(()=>{setOps([]);setError(true)}).finally(()=>setLoading(false));
 },[]);

 const sorted=useMemo(()=>[...ops].sort((a,b)=>(a.countryCode===market?0:1)-(b.countryCode===market?0:1)||a.name.localeCompare(b.name)),[ops,market]);
 const es=lang==='es';
 const t=es?{
  work:'Proyectos',how:'Cómo funciona',signIn:'Entrar',create:'Crear cuenta',
  eyebrow:'PROYECTOS DE VOZ REMUNERADOS',title:'Tu voz tiene valor.',accent:'Convierte conversaciones en trabajo pagado.',
  lead:'Explora proyectos reales, revisa el pago y los requisitos antes de empezar, conecta a tu compañero cuando sea necesario y sigue cada paso hasta el pago.',
  browse:'Ver proyectos',account:'Crear mi cuenta',open:'PROYECTOS DISPONIBLES',pick:'Elige tu próximo proyecto.',
  fit:'Tu país, idioma y requisitos determinan qué proyectos están disponibles para ti.',
  partner:'Compañero requerido',solo:'Individual',sessions:'conversaciones',join:'Ver proyecto',
  payout:'Pago',proof1:'cuenta reutilizable',proof2:'proyectos publicados',proof3:'requisitos visibles primero',proof4:'estado de pago rastreable',
  howTitle:'Así funciona PairVoice',steps:[
   ['Elige un proyecto','Consulta el pago, mercado, idioma y requisitos antes de registrarte.'],
   ['Comprueba si calificas','Responde solo lo necesario para ese proyecto.'],
   ['Conecta a tu compañero','Si el trabajo requiere dos personas, invita o conecta a la persona correcta.'],
   ['Graba, envía y cobra','Sigue el trabajo, revisión, aprobación y pago desde PairVoice.']
  ],
  ctaTitle:'Una cuenta. Más oportunidades.',ctaBody:'Crea tu perfil PairVoice una vez y úsalo en los proyectos para los que calificas.',cta:'Crear cuenta gratis',
  loading:'Cargando proyectos…',empty:'No hay proyectos publicados en este momento.',footer:'Tu voz tiene valor.'
 }:{
  work:'Gigs',how:'How it works',signIn:'Sign in',create:'Create account',
  eyebrow:'PAID VOICE GIGS',title:'Your voice has value.',accent:'Turn conversations into paid work.',
  lead:'Browse real projects, see payout and requirements before you start, connect your partner when needed, and track every step through payment.',
  browse:'Browse gigs',account:'Create my account',open:'AVAILABLE GIGS',pick:'Pick your next gig.',
  fit:'Your country, language, and campaign requirements determine which work is available to you.',
  partner:'Partner required',solo:'Individual',sessions:'conversations',join:'View gig',
  payout:'Payout',proof1:'reusable account',proof2:'published gigs',proof3:'requirements shown first',proof4:'trackable payout status',
  howTitle:'How PairVoice works',steps:[
   ['Choose a gig','See payout, market, language and requirements before you register.'],
   ['Check your fit','Answer only what that campaign actually needs.'],
   ['Connect your partner','If the work requires two people, invite or connect the right person.'],
   ['Record, submit & get paid','Track work, review, approval and payout from PairVoice.']
  ],
  ctaTitle:'One account. More opportunities.',ctaBody:'Create your PairVoice profile once and reuse it across gigs you qualify for.',cta:'Create free account',
  loading:'Loading gigs…',empty:'No gigs are published right now.',footer:'Your voice has value.'
 };

 function openGig(slug:string){
  trackFunnelEvent('campaign_cta_click',{campaign_slug:slug,surface:'production_marketplace'});
  location.href='/join?campaign='+encodeURIComponent(slug);
 }

 return <main className="pv2 productionMarketplace">
  <nav className="pvnav">
   <a className="logo" href="/">PAIR<span>VOICE</span></a>
   <div className="navlinks"><a href="#work">{t.work}</a><a href="#how">{t.how}</a></div>
   <div className="navright">
    <select className="language" value={lang} onChange={e=>setLang(e.target.value as 'en'|'es')}><option value="en">EN</option><option value="es">ES</option></select>
    <a className="navsignin" href="/signin">{t.signIn}</a>
    <a className="navcta" href="/join">{t.create}</a>
   </div>
  </nav>

  <section className="pvhero productionHero">
   <div className="heroCopy">
    <div className="statusline"><span></span>{t.eyebrow}</div>
    <h1>{t.title}<br/><em>{t.accent}</em></h1>
    <p>{t.lead}</p>
    <div className="heroActions"><a className="primary" href="#work">{t.browse} →</a><a className="secondary" href="/join">{t.account}</a></div>
    <div className="trustline">✓ {es?'Gratis para crear cuenta · Pago y requisitos visibles antes de empezar · Sin tarjeta para registrarte':'Free to create an account · Payout and requirements shown before you start · No card required to join'}</div>
   </div>
   <div className="heroVisual productionVisual">
    <div className="voiceOrb"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
    <div className="floatCard fc1"><small>{es?'FLUJO':'WORKFLOW'}</small><strong>Gig → Pair → Work</strong><span>{es?'Todo en una cuenta':'One PairVoice account'}</span><div className="miniMeter"><b></b></div></div>
    <div className="floatCard fc2"><small>{es?'PAGO':'PAYOUT'}</small><strong>{es?'Después de aprobación':'After approval'}</strong><span>{es?'Estado rastreable':'Trackable status'}</span></div>
   </div>
  </section>

  <section className="proofStrip">
   <div><b>1</b><span>{t.proof1}</span></div>
   <div><b>{loading?'—':ops.length}</b><span>{t.proof2}</span></div>
   <div><b>✓</b><span>{t.proof3}</span></div>
   <div><b>✓</b><span>{t.proof4}</span></div>
  </section>

  <section className="workSection" id="work">
   <div className="sectionIntro"><div><div className="eyebrow">{t.open}</div><h2>{t.pick}</h2></div><p>{t.fit}</p></div>
   <div className="missionGrid">
    {loading&&<article className="missionCardPublic skeleton"><h3>{t.loading}</h3></article>}
    {!loading&&sorted.map((o,n)=>{
     const payout=o.participantPayoutCents!=null?money(o.participantPayoutCents,o.payoutCurrency):(es?'Pago por confirmar':'Payout being finalized');
     return <article className={'missionCardPublic '+(o.countryCode===market?'featured':'')} key={o.slug}>
      <div className="missionTop"><span className="missionNo">{String(n+1).padStart(2,'0')}</span><div>{o.countryCode===market&&<b>{es?'TU MERCADO':'YOUR MARKET'}</b>}<span>{marketName(o.countryCode)}</span></div></div>
      <h3>{o.name}</h3><p>{o.jobFamily||'Voice recording'}</p>
      <div className="bigPayout">{payout}</div><small>{o.payoutUnit==='PAIR'?(es?'por pareja aprobada':'per approved pair'):(es?'por participante aprobado':'per approved participant')}</small>
      <div className="chips"><span>{o.languageCode.toUpperCase()}</span><span>{o.requiresPair?t.partner:t.solo}</span>{o.sessionCount&&<span>{o.sessionCount} {t.sessions}</span>}{o.deviceRequirement&&<span>{o.deviceRequirement}</span>}</div>
      <button onClick={()=>openGig(o.slug)}>{t.join} →</button>
     </article>
    })}
    {!loading&&!sorted.length&&<article className="missionCardPublic skeleton"><h3>{error?(es?'El catálogo no está disponible ahora.':'The catalog is temporarily unavailable.'):t.empty}</h3><p>{es?'Vuelve a intentarlo en unos minutos.':'Please check back in a few minutes.'}</p></article>}
   </div>
  </section>

  <section className="howSection" id="how"><div className="eyebrow">PAIRVOICE FLOW</div><h2>{t.howTitle}</h2>
   <div className="flowGrid">{t.steps.map((x,i)=><div key={i}><i>{i+1}</i><h3>{x[0]}</h3><p>{x[1]}</p></div>)}</div>
  </section>

  <section className="joinV2 productionCta">
   <div className="joinCopy"><div className="eyebrow">{es?'TU CUENTA PAIRVOICE':'YOUR PAIRVOICE ACCOUNT'}</div><h2>{t.ctaTitle}</h2><p>{t.ctaBody}</p></div>
   <div className="accountCtaCard"><span>{es?'SIN TARIFA DE REGISTRO':'NO SIGNUP FEE'}</span><strong>{es?'Empieza con una cuenta PairVoice.':'Start with one PairVoice account.'}</strong><p>{es?'Después eliges proyectos, verificas requisitos y conectas a tu compañero cuando haga falta.':'Then choose gigs, verify requirements, and connect a partner when needed.'}</p><a href="/join">{t.cta} →</a><a className="accountSignin" href="/signin">{t.signIn}</a></div>
  </section>

  <footer><div className="logo">PAIR<span>VOICE</span></div><p>{t.footer}</p><div className="footerLinks"><a href="/privacy">Privacy</a><a href="/terms">Terms</a></div><span>© 2026 PairVoice</span></footer>
 </main>;
}
