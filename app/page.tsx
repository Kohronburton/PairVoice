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
 const featured=sorted.find(o=>o.countryCode===market)||sorted[0]||null;
 const featuredPayout=featured?.participantPayoutCents!=null?money(featured.participantPayoutCents,featured.payoutCurrency):null;
 const es=lang==='es';
 const t=es?{
  work:'Proyectos',how:'Cómo funciona',signIn:'Entrar',create:'Crear cuenta',
  eyebrow:'PROYECTOS DE VOZ REMUNERADOS',title:'Cobrad por hablar.',accent:'Con alguien que ya conoces.',
  lead:'Elige un proyecto, revisa el pago y los requisitos antes de empezar, conecta a tu compañero y sigue el trabajo hasta la aprobación y el pago.',
  browse:'Ver si califico',account:'Ver todos los proyectos',open:'PROYECTOS DISPONIBLES',pick:'Elige el proyecto. Mira el pago primero.',
  fit:'Sin experiencia requerida. Verás el mercado, idioma, requisitos y pago antes de empezar.',
  partner:'Compañero requerido',solo:'Individual',sessions:'conversaciones',join:'Ver si califico',
  payout:'Pago',proof1:'gratis para registrarte',proof2:'proyectos publicados',proof3:'requisitos antes de grabar',proof4:'pago tras aprobación',
  howTitle:'Así funciona PairVoice',steps:[
   ['Elige un proyecto','Consulta el pago, mercado, idioma y requisitos antes de registrarte.'],
   ['Comprueba si calificas','Responde solo lo necesario para ese proyecto.'],
   ['Conecta a tu compañero','Si el trabajo requiere dos personas, invita o conecta a la persona correcta.'],
   ['Graba, envía y cobra','Sigue el trabajo, revisión, aprobación y pago desde PairVoice.']
  ],
  ctaTitle:'Una cuenta. Más oportunidades.',ctaBody:'Crea tu perfil PairVoice una vez y úsalo en los proyectos para los que calificas.',cta:'Crear cuenta gratis',
  effort:'TIEMPO ESTIMADO',nextStep:'SIGUIENTE PASO',qualify:'Comprueba requisitos y elegibilidad',
  trustTitle:'Antes de empezar, sabrás exactamente qué esperar.',trustLead:'PairVoice reduce la incertidumbre antes de que grabes nada.',
  trustItems:[['¿Necesito experiencia?','No. Cada proyecto muestra sus requisitos antes de que empieces.'],['¿Necesito compañero?','Solo cuando el proyecto lo indique. Puedes invitar o conectar a alguien que ya tenga PairVoice.'],['¿Cuándo cobro?','Después de que el trabajo requerido sea revisado y aprobado.'],['¿Tengo que pagar para entrar?','No. Crear una cuenta PairVoice es gratis y no requiere tarjeta.']],
  loading:'Cargando proyectos…',empty:'No hay proyectos publicados en este momento.',footer:'Tu voz tiene valor.'
 }:{
  work:'Gigs',how:'How it works',signIn:'Sign in',create:'Create account',
  eyebrow:'PAID VOICE GIGS',title:'Get paid to talk.',accent:'With someone you already know.',
  lead:'Choose a real voice gig, see the payout and requirements before you start, connect your partner, and track the work through approval and payment.',
  browse:'See if I qualify',account:'See all gigs',open:'AVAILABLE GIGS',pick:'Choose the gig. See the money first.',
  fit:'No experience required. See the market, language, requirements and payout before you start.',
  partner:'Partner required',solo:'Individual',sessions:'conversations',join:'See if I qualify',
  payout:'Payout',proof1:'free to join',proof2:'published gigs',proof3:'requirements before recording',proof4:'paid after approval',
  howTitle:'How PairVoice works',steps:[
   ['Choose a gig','See payout, market, language and requirements before you register.'],
   ['Check your fit','Answer only what that campaign actually needs.'],
   ['Connect your partner','If the work requires two people, invite or connect the right person.'],
   ['Record, submit & get paid','Track work, review, approval and payout from PairVoice.']
  ],
  ctaTitle:'One account. More opportunities.',ctaBody:'Create your PairVoice profile once and reuse it across gigs you qualify for.',cta:'Create free account',
  effort:'ESTIMATED TIME',nextStep:'NEXT STEP',qualify:'Check requirements & eligibility',
  trustTitle:'Before you start, know exactly what to expect.',trustLead:'PairVoice removes uncertainty before you record anything.',
  trustItems:[['Do I need experience?','No. Each gig shows its requirements before you start.'],['Do I need a partner?','Only when the gig says so. You can invite someone or connect with an existing PairVoice user.'],['When do I get paid?','After the required work is reviewed and approved.'],['Do I pay to join?','No. Creating a PairVoice account is free and requires no card.']],
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
    {featured&&featuredPayout&&<div className="heroOffer"><span>{es?'PROYECTO DISPONIBLE AHORA':'AVAILABLE NOW'}</span><strong>{featuredPayout}</strong><b>{featured.name}</b><small>{featured.requiresPair?(es?'por pareja aprobada':'per approved pair'):(es?'por participante aprobado':'per approved participant')}</small></div>}
    <p>{t.lead}</p>
    <div className="heroActions">{featured?<button className="primary heroPrimary" onClick={()=>openGig(featured.slug)}>{t.browse} →</button>:<a className="primary" href="#work">{t.account} →</a>}<a className="secondary" href="#work">{t.account}</a></div>
    <div className="trustline">✓ {es?'Sin experiencia requerida · Gratis para registrarte · Sin tarjeta · Requisitos antes de grabar':'No experience required · Free to join · No card required · Requirements shown before recording'}</div>
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
      <div className="gigFacts">
       <div><b>{es?'QUÉ HACES':'WHAT YOU DO'}</b><span>{es?'Graba conversaciones siguiendo las instrucciones del proyecto.':'Record conversations by following the gig instructions.'}</span></div>
       <div><b>{es?'CUÁNDO COBRAS':'WHEN YOU GET PAID'}</b><span>{es?'Después de que tu trabajo sea revisado y aprobado.':'After your completed work is reviewed and approved.'}</span></div>
       {(o.sessionMinutesMin||o.sessionMinutesMax)&&<div><b>{t.effort}</b><span>{o.sessionMinutesMin&&o.sessionMinutesMax?(o.sessionMinutesMin+'–'+o.sessionMinutesMax+' min'):o.sessionMinutesMax?('Up to '+o.sessionMinutesMax+' min'):(o.sessionMinutesMin+'+ min')}{o.sessionCount&&o.sessionCount>1?(' × '+o.sessionCount):''}</span></div>}
       <div><b>{t.nextStep}</b><span>{t.qualify}</span></div>
      </div>
      <div className="chips"><span>{o.languageCode.toUpperCase()}</span><span>{o.requiresPair?t.partner:t.solo}</span>{o.sessionCount&&<span>{o.sessionCount} {t.sessions}</span>}{o.deviceRequirement&&<span>{o.deviceRequirement}</span>}</div>
      <button onClick={()=>openGig(o.slug)}>{t.join} →</button>
     </article>
    })}
    {!loading&&!sorted.length&&<article className="missionCardPublic skeleton"><h3>{error?(es?'El catálogo no está disponible ahora.':'The catalog is temporarily unavailable.'):t.empty}</h3><p>{es?'Vuelve a intentarlo en unos minutos.':'Please check back in a few minutes.'}</p></article>}
   </div>
  </section>

  <section className="trustSection">
   <div className="sectionIntro trustIntro"><div><div className="eyebrow">{es?'SIN SORPRESAS':'NO SURPRISES'}</div><h2>{t.trustTitle}</h2></div><p>{t.trustLead}</p></div>
   <div className="trustGrid">{t.trustItems.map((item,i)=><article key={i}><span>0{i+1}</span><h3>{item[0]}</h3><p>{item[1]}</p></article>)}</div>
  </section>

  <section className="howSection" id="how"><div className="eyebrow">PAIRVOICE FLOW</div><h2>{t.howTitle}</h2>
   <div className="flowGrid">{t.steps.map((x,i)=><div key={i}><i>{i+1}</i><h3>{x[0]}</h3><p>{x[1]}</p></div>)}</div>
  </section>

  <section className="joinV2 productionCta">
   <div className="joinCopy"><div className="eyebrow">{es?'TU CUENTA PAIRVOICE':'YOUR PAIRVOICE ACCOUNT'}</div><h2>{t.ctaTitle}</h2><p>{t.ctaBody}</p></div>
   <div className="accountCtaCard"><span>{es?'SIN TARIFA DE REGISTRO':'NO SIGNUP FEE'}</span><strong>{es?'Mira el pago. Comprueba si calificas. Luego empieza.':'See the payout. Check your fit. Then start.'}</strong><p>{es?'Después eliges proyectos, verificas requisitos y conectas a tu compañero cuando haga falta.':'Then choose gigs, verify requirements, and connect a partner when needed.'}</p><a href="/join">{t.cta} →</a><a className="accountSignin" href="/signin">{t.signIn}</a></div>
  </section>

  {featured&&<div className="mobileConversionBar"><div>{featuredPayout&&<strong>{featuredPayout}</strong>}<span>{featured.name}</span></div><button onClick={()=>openGig(featured.slug)}>{t.browse} →</button></div>}
  <footer><div className="logo">PAIR<span>VOICE</span></div><p>{t.footer}</p><div className="footerLinks"><a href="/privacy">Privacy</a><a href="/terms">Terms</a></div><span>© 2026 PairVoice</span></footer>
 </main>;
}
