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
  trackFunnelEvent('landing_view',{market_code:marketForLocale(locale),surface:'hormozi_marketplace'});
  fetch('/api/opportunities').then(async r=>{if(!r.ok)throw new Error('catalog');return r.json()})
   .then(d=>setOps(Array.isArray(d.opportunities)?d.opportunities:[]))
   .catch(()=>{setOps([]);setError(true)}).finally(()=>setLoading(false));
 },[]);

 const sorted=useMemo(()=>[...ops].sort((a,b)=>(a.countryCode===market?0:1)-(b.countryCode===market?0:1)||a.name.localeCompare(b.name)),[ops,market]);
 const featured=sorted.find(o=>o.countryCode===market)||sorted[0]||null;
 const featuredPayout=featured?.participantPayoutCents!=null?money(featured.participantPayoutCents,featured.payoutCurrency):null;
 const es=lang==='es';

 const t=es?{
  navGigs:'Proyectos',navHow:'Cómo funciona',navFaq:'Preguntas',signIn:'Entrar',create:'Crear cuenta',
  eyebrow:'PROYECTOS DE VOZ REMUNERADOS · GRATIS PARA ENTRAR',
  title:'Hablad.',accent:'Grabad. Cobrad.',
  lead:'PairVoice convierte una conversación con alguien que ya conoces en un flujo de trabajo claro: mira el pago, comprueba si calificas, sigue las instrucciones y cobra después de la aprobación.',
  seeQualify:'Ver si califico',seeAll:'Ver todos los proyectos',availableNow:'DISPONIBLE AHORA',
  pairApproved:'por pareja aprobada',participantApproved:'por participante aprobado',
  noExp:'Sin experiencia requerida',free:'Gratis para registrarte',noCard:'Sin tarjeta',upfront:'Requisitos antes de grabar',
  valueTitle:'La oferta es simple.',valueLead:'Más claridad antes de empezar. Menos pasos inútiles. Un camino directo desde el proyecto hasta el pago.',
  valueItems:[
   ['RESULTADO','Convierte una conversación en trabajo remunerado.'],
   ['CONFIANZA','Ves el pago y los requisitos antes de empezar.'],
   ['VELOCIDAD','Una cuenta PairVoice para todo el flujo del proyecto.'],
   ['ESFUERZO','Sin tarifa de registro, sin tarjeta y sin experiencia previa requerida.']
  ],
  work:'PROYECTOS ABIERTOS',workTitle:'Mira el dinero. Luego decide.',workLead:'Cada tarjeta responde cuánto paga, qué haces, cuánto puede durar y si necesitas compañero.',
  partner:'Compañero requerido',solo:'Individual',sessions:'sesiones',what:'QUÉ HACES',when:'CUÁNDO COBRAS',time:'TIEMPO ESTIMADO',next:'SIGUIENTE PASO',check:'Comprueba requisitos y elegibilidad',
  doText:'Graba conversaciones siguiendo las instrucciones del proyecto.',payText:'Después de que el trabajo requerido sea revisado y aprobado.',
  riskTitle:'No empieces a ciegas.',riskLead:'PairVoice reduce el riesgo de perder tiempo mostrándote la información importante antes de grabar.',
  riskItems:[
   ['Pago visible','Sabes el pago publicado antes de entrar al flujo del proyecto.'],
   ['Requisitos visibles','Mercado, idioma y requisitos se muestran antes de grabar.'],
   ['Sin coste de entrada','Crear una cuenta PairVoice es gratis y no requiere tarjeta.'],
   ['Estado rastreable','Tu cuenta conserva el estado del proyecto, revisión y pago.']
  ],
  howTitle:'De proyecto a pago en cuatro pasos.',steps:[
   ['Elige','Mira el pago y los requisitos.'],
   ['Califica','Confirma que cumples lo que pide el proyecto.'],
   ['Conecta','Invita o conecta a tu compañero cuando haga falta.'],
   ['Completa','Graba, envía y sigue la revisión hasta el pago.']
  ],
  faqTitle:'Las preguntas que importan antes de empezar.',faqs:[
   ['¿Necesito experiencia?','No. Los proyectos muestran sus requisitos antes de que empieces.'],
   ['¿Necesito compañero?','Solo si el proyecto lo requiere. Puedes invitar a alguien o conectar con un usuario existente de PairVoice.'],
   ['¿Cuándo cobro?','Después de que el trabajo requerido sea revisado y aprobado.'],
   ['¿Cuesta entrar?','No. Crear una cuenta PairVoice es gratis y no requiere tarjeta.']
  ],
  finalTitle:'Si el proyecto encaja contigo, el siguiente paso tarda un minuto.',finalBody:'Comprueba si calificas. Si no, no tienes que grabar nada.',finalCta:'Comprobar si califico',
  noGigs:'No hay proyectos publicados ahora mismo.',retry:'Vuelve a intentarlo en unos minutos.',footer:'Tu voz tiene valor.'
 }:{
  navGigs:'Gigs',navHow:'How it works',navFaq:'FAQ',signIn:'Sign in',create:'Create account',
  eyebrow:'PAID VOICE GIGS · FREE TO JOIN',
  title:'Talk together.',accent:'Record. Get paid.',
  lead:'PairVoice turns a conversation with someone you already know into a clear work flow: see the payout, check your fit, follow the instructions, and get paid after approval.',
  seeQualify:'See if I qualify',seeAll:'See all gigs',availableNow:'AVAILABLE NOW',
  pairApproved:'per approved pair',participantApproved:'per approved participant',
  noExp:'No experience required',free:'Free to join',noCard:'No card required',upfront:'Requirements before recording',
  valueTitle:'The offer is simple.',valueLead:'More clarity before you start. Less wasted effort. One direct path from gig to payout.',
  valueItems:[
   ['OUTCOME','Turn a conversation into paid work.'],
   ['CONFIDENCE','See the payout and requirements before you start.'],
   ['SPEED','One PairVoice account for the full gig workflow.'],
   ['EFFORT','No signup fee, no card, and no prior experience required.']
  ],
  work:'OPEN GIGS',workTitle:'See the money. Then decide.',workLead:'Every card answers what it pays, what you do, how long it may take, and whether you need a partner.',
  partner:'Partner required',solo:'Individual',sessions:'sessions',what:'WHAT YOU DO',when:'WHEN YOU GET PAID',time:'ESTIMATED TIME',next:'NEXT STEP',check:'Check requirements & eligibility',
  doText:'Record conversations by following the gig instructions.',payText:'After the required work is reviewed and approved.',
  riskTitle:"Don't start blind.",riskLead:'PairVoice reduces the risk of wasting time by showing the important details before you record.',
  riskItems:[
   ['Payout first','See the published payout before entering the gig workflow.'],
   ['Requirements first','Market, language, and requirements appear before recording.'],
   ['No cost to join','Creating a PairVoice account is free and requires no card.'],
   ['Track the status','Your account keeps the gig, review, and payout status together.']
  ],
  howTitle:'From gig to payout in four steps.',steps:[
   ['Choose','See the payout and requirements.'],
   ['Qualify','Confirm you fit what the gig needs.'],
   ['Connect','Invite or connect your partner when required.'],
   ['Complete','Record, submit, and follow review through payout.']
  ],
  faqTitle:'The questions that matter before you start.',faqs:[
   ['Do I need experience?','No. Each gig shows its requirements before you start.'],
   ['Do I need a partner?','Only when the gig requires one. You can invite someone or connect with an existing PairVoice user.'],
   ['When do I get paid?','After the required work is reviewed and approved.'],
   ['Does it cost anything to join?','No. Creating a PairVoice account is free and requires no card.']
  ],
  finalTitle:'If the gig fits you, the next step takes about a minute.',finalBody:"Check whether you qualify. If you don't, you do not need to record anything.",finalCta:'Check if I qualify',
  noGigs:'No gigs are published right now.',retry:'Please check back in a few minutes.',footer:'Your voice has value.'
 };

 function openGig(slug:string){
  trackFunnelEvent('campaign_cta_click',{campaign_slug:slug,surface:'hormozi_marketplace'});
  location.href='/join?campaign='+encodeURIComponent(slug);
 }

 return <main className="pv2 hormoziPage">
  <nav className="pvnav hormoziNav">
   <a className="logo" href="/">PAIR<span>VOICE</span></a>
   <div className="navlinks"><a href="#gigs">{t.navGigs}</a><a href="#how">{t.navHow}</a><a href="#faq">{t.navFaq}</a></div>
   <div className="navright">
    <select className="language" value={lang} onChange={e=>setLang(e.target.value as 'en'|'es')}><option value="en">EN</option><option value="es">ES</option></select>
    <a className="navsignin" href="/signin">{t.signIn}</a>
    <a className="navcta" href={featured?'/join?campaign='+encodeURIComponent(featured.slug):'/join'}>{t.seeQualify}</a>
   </div>
  </nav>

  <section className="hormoziHero">
   <div className="heroMessage">
    <div className="statusline"><span></span>{t.eyebrow}</div>
    <h1>{t.title}<br/><em>{t.accent}</em></h1>
    <p className="hormoziLead">{t.lead}</p>
    {featured&&<div className="heroDeal">
      <div className="heroDealMain"><span>{t.availableNow}</span><strong>{featuredPayout||'—'}</strong><b>{featured.name}</b><small>{featured.requiresPair?t.pairApproved:t.participantApproved}</small></div>
      <div className="heroDealMeta">
       <span>{marketName(featured.countryCode)}</span><span>{featured.languageCode.toUpperCase()}</span><span>{featured.requiresPair?t.partner:t.solo}</span>
       {(featured.sessionMinutesMin||featured.sessionMinutesMax)&&<span>{featured.sessionMinutesMin&&featured.sessionMinutesMax?featured.sessionMinutesMin+'–'+featured.sessionMinutesMax+' min':featured.sessionMinutesMax?'≤ '+featured.sessionMinutesMax+' min':featured.sessionMinutesMin+'+ min'}</span>}
      </div>
    </div>}
    <div className="heroActions hormoziActions">
     {featured?<button className="primary heroPrimary" onClick={()=>openGig(featured.slug)}>{t.seeQualify} →</button>:<a className="primary" href="#gigs">{t.seeAll} →</a>}
     <a className="secondary" href="#gigs">{t.seeAll}</a>
    </div>
    <div className="trustPills"><span>✓ {t.noExp}</span><span>✓ {t.free}</span><span>✓ {t.noCard}</span><span>✓ {t.upfront}</span></div>
   </div>

   <aside className="valueEquationCard">
    <div className="valueEquationHead"><span>PAIRVOICE VALUE</span><b>{es?'Más resultado. Menos fricción.':'More outcome. Less friction.'}</b></div>
    <div className="valueEquationGrid">
     {t.valueItems.map((item,i)=><div key={i}><small>{item[0]}</small><strong>{item[1]}</strong></div>)}
    </div>
    {featured&&<button onClick={()=>openGig(featured.slug)}>{t.seeQualify} →</button>}
   </aside>
  </section>

  <section className="hormoziProof">
   <div><b>{loading?'—':ops.length}</b><span>{es?'proyectos publicados':'published gigs'}</span></div>
   <div><b>0</b><span>{es?'tarjetas requeridas':'cards required'}</span></div>
   <div><b>1</b><span>{es?'cuenta PairVoice':'PairVoice account'}</span></div>
   <div><b>✓</b><span>{es?'pago y requisitos primero':'payout + requirements first'}</span></div>
  </section>

  <section className="valueSection">
   <div className="sectionIntro"><div><div className="eyebrow">{es?'LA ECUACIÓN DE VALOR':'THE VALUE EQUATION'}</div><h2>{t.valueTitle}</h2></div><p>{t.valueLead}</p></div>
   <div className="valueCards">{t.valueItems.map((item,i)=><article key={i}><span>0{i+1}</span><small>{item[0]}</small><h3>{item[1]}</h3></article>)}</div>
  </section>

  <section className="workSection hormoziGigs" id="gigs">
   <div className="sectionIntro"><div><div className="eyebrow">{t.work}</div><h2>{t.workTitle}</h2></div><p>{t.workLead}</p></div>
   <div className="missionGrid">
    {loading&&<article className="missionCardPublic skeleton"><h3>{es?'Cargando proyectos…':'Loading gigs…'}</h3></article>}
    {!loading&&sorted.map((o,n)=>{
     const payout=o.participantPayoutCents!=null?money(o.participantPayoutCents,o.payoutCurrency):(es?'Pago por confirmar':'Payout being finalized');
     const time=o.sessionMinutesMin&&o.sessionMinutesMax?o.sessionMinutesMin+'–'+o.sessionMinutesMax+' min':o.sessionMinutesMax?'≤ '+o.sessionMinutesMax+' min':o.sessionMinutesMin?o.sessionMinutesMin+'+ min':null;
     return <article className={'missionCardPublic hormoneOfferCard '+(o.countryCode===market?'featured':'')} key={o.slug}>
      <div className="missionTop"><span className="missionNo">{String(n+1).padStart(2,'0')}</span><div>{o.countryCode===market&&<b>{es?'TU MERCADO':'YOUR MARKET'}</b>}<span>{marketName(o.countryCode)}</span></div></div>
      <div className="offerCardHeadline"><div><h3>{o.name}</h3><p>{o.jobFamily||'Voice recording'}</p></div><div><strong>{payout}</strong><small>{o.payoutUnit==='PAIR'?t.pairApproved:t.participantApproved}</small></div></div>
      <div className="offerQuickFacts">
       <div><b>{t.what}</b><span>{t.doText}</span></div>
       <div><b>{t.when}</b><span>{t.payText}</span></div>
       {time&&<div><b>{t.time}</b><span>{time}{o.sessionCount&&o.sessionCount>1?' × '+o.sessionCount:''}</span></div>}
       <div><b>{t.next}</b><span>{t.check}</span></div>
      </div>
      <div className="chips"><span>{o.languageCode.toUpperCase()}</span><span>{o.requiresPair?t.partner:t.solo}</span>{o.sessionCount&&<span>{o.sessionCount} {t.sessions}</span>}{o.deviceRequirement&&<span>{o.deviceRequirement}</span>}</div>
      <button onClick={()=>openGig(o.slug)}>{t.seeQualify} →</button>
     </article>
    })}
    {!loading&&!sorted.length&&<article className="missionCardPublic skeleton"><h3>{error?t.retry:t.noGigs}</h3></article>}
   </div>
  </section>

  <section className="riskSection">
   <div className="sectionIntro"><div><div className="eyebrow">{es?'REDUCCIÓN DE RIESGO':'RISK REVERSAL'}</div><h2>{t.riskTitle}</h2></div><p>{t.riskLead}</p></div>
   <div className="riskGrid">{t.riskItems.map((item,i)=><article key={i}><div>✓</div><h3>{item[0]}</h3><p>{item[1]}</p></article>)}</div>
  </section>

  <section className="howSection hormoziHow" id="how">
   <div className="eyebrow">PAIRVOICE FLOW</div><h2>{t.howTitle}</h2>
   <div className="flowGrid">{t.steps.map((x,i)=><div key={i}><i>{i+1}</i><h3>{x[0]}</h3><p>{x[1]}</p></div>)}</div>
  </section>

  <section className="faqSection" id="faq">
   <div className="sectionIntro"><div><div className="eyebrow">FAQ</div><h2>{t.faqTitle}</h2></div><p>{es?'Sin letra pequeña escondida. Las reglas importantes aparecen antes del trabajo.':'No hidden fine print. Important rules appear before the work.'}</p></div>
   <div className="faqGrid">{t.faqs.map((item,i)=><details key={i}><summary>{item[0]}<span>+</span></summary><p>{item[1]}</p></details>)}</div>
  </section>

  <section className="finalOffer">
   <div><div className="eyebrow">{es?'SIGUIENTE PASO':'NEXT STEP'}</div><h2>{t.finalTitle}</h2><p>{t.finalBody}</p></div>
   <div className="finalOfferAction">{featuredPayout&&<strong>{featuredPayout}</strong>}{featured&&<span>{featured.name}</span>}{featured?<button onClick={()=>openGig(featured.slug)}>{t.finalCta} →</button>:<a href="/join">{t.create} →</a>}<small>{es?'Gratis para registrarte · Sin tarjeta':'Free to join · No card required'}</small></div>
  </section>

  {featured&&<div className="mobileConversionBar"><div>{featuredPayout&&<strong>{featuredPayout}</strong>}<span>{featured.name}</span></div><button onClick={()=>openGig(featured.slug)}>{t.seeQualify} →</button></div>}

  <footer><div className="logo">PAIR<span>VOICE</span></div><p>{t.footer}</p><div className="footerLinks"><a href="/privacy">Privacy</a><a href="/terms">Terms</a></div><span>© 2026 PairVoice</span></footer>
 </main>;
}
