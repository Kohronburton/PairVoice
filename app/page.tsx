import type {Metadata} from 'next';
import {headers} from 'next/headers';
import {getPublicOpportunities,type PublicOpportunity} from '../lib/public-marketplace';
import {LandingTelemetry,TrackedGigLink} from '../components/MarketplaceClientBits';

export const metadata:Metadata={
 title:'Get Paid to Talk | PairVoice',
 description:'Browse paid voice gigs, see payout and requirements before you start, connect your partner, record, submit, and track approval and payment.'
};

const marketForLocale=(l:string)=>{const first=(l||'en-US').split(',')[0].split(';')[0].trim().replace('_','-');const p=first.split('-');return(p[1]||'').toUpperCase()||'UNKNOWN'};
const marketName=(c:string)=>({US:'United States',ES:'Spain',CA:'Canada',GB:'United Kingdom',AU:'Australia',MX:'Mexico',AR:'Argentina',CO:'Colombia'} as Record<string,string>)[c]||c;
const money=(c:number,x:string)=>{try{return new Intl.NumberFormat('en-US',{style:'currency',currency:x,maximumFractionDigits:0}).format(c/100)}catch{return'$'+Math.round(c/100)}};
const sortOpportunities=(ops:PublicOpportunity[],market:string)=>[...ops].sort((a,b)=>(a.countryCode===market?0:1)-(b.countryCode===market?0:1)||a.name.localeCompare(b.name));

export default async function Home({searchParams}:{searchParams:Promise<{lang?:string}>}){
 const [sp,h,ops]=await Promise.all([searchParams,headers(),getPublicOpportunities()]);
 const acceptLanguage=h.get('accept-language')||'en-US';
 const market=marketForLocale(acceptLanguage);
 const es=sp.lang==='es'||(!sp.lang&&acceptLanguage.toLowerCase().startsWith('es'));
 const sorted=sortOpportunities(ops,market);
 const featured=sorted.find(o=>o.countryCode===market)||sorted[0]||null;
 const featuredPayout=featured?.participantPayoutCents!=null?money(featured.participantPayoutCents,featured.payoutCurrency):null;
 const joinHref=(slug:string)=>'/join?campaign='+encodeURIComponent(slug)+(es?'&lang=es':'');

 const t=es?{
  work:'Proyectos',how:'Cómo funciona',faq:'Preguntas',signIn:'Entrar',create:'Crear cuenta',
  eyebrow:'PROYECTOS DE VOZ REMUNERADOS · GRATIS PARA ENTRAR',title:'Hablad.',accent:'Grabad. Cobrad.',
  lead:'PairVoice convierte una conversación con alguien que ya conoces en un flujo de trabajo claro: mira el pago, comprueba si calificas, sigue las instrucciones y cobra después de la aprobación.',
  qualify:'Ver si califico',all:'Ver proyectos',available:'DISPONIBLE AHORA',perPair:'por pareja aprobada',perPerson:'por participante aprobado',
  proofA:'GRATIS',proofALabel:'sin tarifa de registro',proofBLabel:'proyectos publicados',proofC:'ANTES',proofCLabel:'pago y requisitos primero',proofD:'RASTREO',proofDLabel:'aprobación y pago',
  why:'POR QUÉ PAIRVOICE',whyTitle:'Más resultado. Menos fricción.',whyLead:'La oferta mejora cuando aumenta el resultado y baja el tiempo, la incertidumbre y el esfuerzo.',
  values:[['RESULTADO','Convierte una conversación en trabajo remunerado.'],['CONFIANZA','Ves el pago y los requisitos antes de empezar.'],['VELOCIDAD','Una cuenta para todo el flujo del proyecto.'],['ESFUERZO','Sin tarifa, sin tarjeta y sin experiencia previa requerida.']],
  open:'PROYECTOS DISPONIBLES',pick:'Mira el dinero. Luego decide.',fit:'Cada tarjeta responde cuánto paga, qué haces, cuánto puede durar y si necesitas compañero.',
  partner:'Compañero requerido',solo:'Individual',sessions:'sesiones',effort:'TIEMPO ESTIMADO',next:'SIGUIENTE PASO',nextText:'Comprueba requisitos y elegibilidad',
  what:'QUÉ HACES',whatText:'Graba conversaciones siguiendo las instrucciones del proyecto.',when:'CUÁNDO COBRAS',whenText:'Después de que el trabajo requerido sea revisado y aprobado.',
  before:'ANTES DE GRABAR',beforeTitle:'No empieces a ciegas.',beforeLead:'PairVoice reduce el riesgo de perder tiempo mostrando la información importante antes de que hagas el trabajo.',
  beforeItems:[['Pago visible','Ves el pago publicado antes de entrar al flujo del proyecto.'],['Requisitos visibles','Mercado, idioma y requisitos aparecen antes de grabar.'],['Sin coste de entrada','Crear una cuenta es gratis y no requiere tarjeta.'],['Estado rastreable','Tu cuenta conserva el estado del proyecto, revisión y pago.']],
  howTitle:'De proyecto a pago en cuatro pasos.',steps:[['Elige','Mira el pago y los requisitos.'],['Califica','Confirma que encajas con el proyecto.'],['Conecta','Invita o conecta a tu compañero si hace falta.'],['Completa','Graba, envía y sigue la revisión hasta el pago.']],
  faqTitle:'Las preguntas que importan antes de empezar.',faqs:[['¿Necesito experiencia?','No. Cada proyecto muestra sus requisitos antes de empezar.'],['¿Necesito compañero?','Solo cuando el proyecto lo requiera. Puedes invitar a alguien o conectar con un usuario existente de PairVoice.'],['¿Cuándo cobro?','Después de que el trabajo requerido sea revisado y aprobado.'],['¿Cuesta entrar?','No. Crear una cuenta PairVoice es gratis y no requiere tarjeta.']],
  finalEyebrow:'SIGUIENTE PASO',finalTitle:'Si el proyecto encaja contigo, el siguiente paso es sencillo.',finalBody:'Comprueba si calificas. Si no, no tienes que grabar nada.',finalCta:'Comprobar si califico',
  footer:'Tu voz tiene valor.',catalogUnavailable:'No hay proyectos publicados en este momento.'
 }:{
  work:'Gigs',how:'How it works',faq:'FAQ',signIn:'Sign in',create:'Create account',
  eyebrow:'PAID VOICE GIGS · FREE TO JOIN',title:'Talk together.',accent:'Record. Get paid.',
  lead:'PairVoice turns a conversation with someone you already know into a clear work flow: see the payout, check your fit, follow the instructions, and get paid after approval.',
  qualify:'See if I qualify',all:'See all gigs',available:'AVAILABLE NOW',perPair:'per approved pair',perPerson:'per approved participant',
  proofA:'FREE',proofALabel:'no signup fee',proofBLabel:'published gigs',proofC:'BEFORE',proofCLabel:'payout + requirements first',proofD:'TRACKED',proofDLabel:'approval and payout',
  why:'WHY PAIRVOICE',whyTitle:'More outcome. Less friction.',whyLead:'The offer gets stronger when the outcome goes up and the time, uncertainty, and effort go down.',
  values:[['OUTCOME','Turn a conversation into paid work.'],['CONFIDENCE','See the payout and requirements before you start.'],['SPEED','One account for the full gig workflow.'],['EFFORT','No signup fee, no card, and no prior experience required.']],
  open:'OPEN GIGS',pick:'See the money. Then decide.',fit:'Every card answers what it pays, what you do, how long it may take, and whether you need a partner.',
  partner:'Partner required',solo:'Individual',sessions:'sessions',effort:'ESTIMATED TIME',next:'NEXT STEP',nextText:'Check requirements & eligibility',
  what:'WHAT YOU DO',whatText:'Record conversations by following the gig instructions.',when:'WHEN YOU GET PAID',whenText:'After the required work is reviewed and approved.',
  before:'BEFORE YOU RECORD',beforeTitle:"Don't start blind.",beforeLead:'PairVoice reduces the risk of wasting time by showing the important details before you do the work.',
  beforeItems:[['Payout first','See the published payout before entering the gig workflow.'],['Requirements first','Market, language, and requirements appear before recording.'],['No cost to join','Creating a PairVoice account is free and requires no card.'],['Track the status','Your account keeps the gig, review, and payout status together.']],
  howTitle:'From gig to payout in four steps.',steps:[['Choose','See the payout and requirements.'],['Qualify','Confirm you fit what the gig needs.'],['Connect','Invite or connect your partner when required.'],['Complete','Record, submit, and follow review through payout.']],
  faqTitle:'The questions that matter before you start.',faqs:[['Do I need experience?','No. Each gig shows its requirements before you start.'],['Do I need a partner?','Only when the gig requires one. You can invite someone or connect with an existing PairVoice user.'],['When do I get paid?','After the required work is reviewed and approved.'],['Does it cost anything to join?','No. Creating a PairVoice account is free and requires no card.']],
  finalEyebrow:'NEXT STEP',finalTitle:'If the gig fits you, the next step is simple.',finalBody:"Check whether you qualify. If you don't, you do not need to record anything.",finalCta:'Check if I qualify',
  footer:'Your voice has value.',catalogUnavailable:'No gigs are published right now.'
 };

 return <main className="pv2 hormoziPage">
  <LandingTelemetry market={market}/>

  <nav className="pvnav hormoziNav" aria-label="Primary">
   <a className="logo" href={es?'/?lang=es':'/'} aria-label="PairVoice home">PAIR<span>VOICE</span></a>
   <div className="navlinks"><a href="#gigs">{t.work}</a><a href="#how">{t.how}</a><a href="#faq">{t.faq}</a></div>
   <div className="navright">
    <div className="langToggle" aria-label="Language"><a className={!es?'active':''} href="/">EN</a><a className={es?'active':''} href="/?lang=es">ES</a></div>
    <a className="navsignin" href="/signin">{t.signIn}</a>
    <a className="navcta" href={featured?joinHref(featured.slug):(es?'/join?lang=es':'/join')}>{t.qualify}</a>
   </div>
  </nav>

  <section className="hormoziHero">
   <div className="heroMessage">
    <div className="statusline"><span></span>{t.eyebrow}</div>
    <h1>{t.title}<br/><em>{t.accent}</em></h1>
    <p className="hormoziLead">{t.lead}</p>

    {featured&&featuredPayout&&<div className="heroDeal">
     <div className="heroDealMain"><span>{t.available}</span><strong>{featuredPayout}</strong><b>{featured.name}</b><small>{featured.requiresPair?t.perPair:t.perPerson}</small></div>
     <div className="heroDealMeta"><span>{marketName(featured.countryCode)}</span><span>{featured.languageCode.toUpperCase()}</span><span>{featured.requiresPair?t.partner:t.solo}</span></div>
    </div>}

    <div className="hormoziActions">
     {featured?<TrackedGigLink className="heroCtaPrimary" slug={featured.slug} href={joinHref(featured.slug)}>{t.qualify} →</TrackedGigLink>:<a className="heroCtaPrimary" href="#gigs">{t.all} →</a>}
     <a className="heroCtaSecondary" href="#gigs">{t.all}</a>
    </div>
    <div className="trustPills"><span>✓ {es?'Sin experiencia requerida':'No experience required'}</span><span>✓ {es?'Gratis para entrar':'Free to join'}</span><span>✓ {es?'Sin tarjeta':'No card required'}</span><span>✓ {es?'Requisitos antes de grabar':'Requirements before recording'}</span></div>
   </div>

   <aside className="productStory hormoziStory" aria-label={es?'Cómo funciona PairVoice':'How PairVoice works'}>
    <div className="storyTop"><span>PAIRVOICE FLOW</span><b>{es?'Un camino claro desde aquí hasta el trabajo.':'A clear path from here to the work.'}</b></div>
    <div className="storyOrb" aria-hidden="true"><div className="waveBars">{[28,48,72,96,68,46,26].map((h,i)=><i key={i} style={{height:h}}/> )}</div></div>
    <div className="storySteps">
     <div><span>01</span><b>{es?'CUENTA':'ACCOUNT'}</b></div><i>→</i>
     <div><span>02</span><b>{es?'CALIFICA':'QUALIFY'}</b></div><i>→</i>
     <div><span>03</span><b>{es?'PAREJA':'PAIR'}</b></div><i>→</i>
     <div><span>04</span><b>{es?'TRABAJO':'WORK'}</b></div>
    </div>
    <div className="storyStatus"><span>{es?'PAGO':'PAYOUT'}</span><strong>{es?'Después de aprobación':'After approval'}</strong><small>{es?'Estado visible en tu cuenta':'Status visible in your account'}</small></div>
   </aside>
  </section>

  <section className="hormoziProof" aria-label={es?'Datos de PairVoice':'PairVoice facts'}>
   <div><b>{t.proofA}</b><span>{t.proofALabel}</span></div>
   <div><b>{ops.length}</b><span>{t.proofBLabel}</span></div>
   <div><b>{t.proofC}</b><span>{t.proofCLabel}</span></div>
   <div><b>{t.proofD}</b><span>{t.proofDLabel}</span></div>
  </section>

  <section className="valueSection">
   <div className="sectionIntroV2"><div><div className="eyebrow">{t.why}</div><h2>{t.whyTitle}</h2></div><p>{t.whyLead}</p></div>
   <div className="valueCards">{t.values.map((item,i)=><article key={item[0]}><span>0{i+1}</span><small>{item[0]}</small><h3>{item[1]}</h3></article>)}</div>
  </section>

  <section className="marketSection hormoziGigs" id="gigs">
   <div className="sectionIntroV2"><div><div className="eyebrow">{t.open}</div><h2>{t.pick}</h2></div><p>{t.fit}</p></div>
   <div className="missionGridV2">
    {sorted.map((o,n)=>{
     const payout=o.participantPayoutCents!=null?money(o.participantPayoutCents,o.payoutCurrency):(es?'Pago por confirmar':'Payout being finalized');
     const duration=o.sessionMinutesMin&&o.sessionMinutesMax?o.sessionMinutesMin+'–'+o.sessionMinutesMax+' min':o.sessionMinutesMax?'≤ '+o.sessionMinutesMax+' min':o.sessionMinutesMin?o.sessionMinutesMin+'+ min':null;
     return <article className={'gigCardV2 hormoziOfferCard '+(o.countryCode===market?'marketFit':'')} key={o.slug}>
      <header><span>{String(n+1).padStart(2,'0')}</span><div>{o.countryCode===market&&<b>{es?'TU MERCADO':'YOUR MARKET'}</b>}<small>{marketName(o.countryCode)}</small></div></header>
      <div className="offerCardHeadline"><div><h3>{o.name}</h3><p className="gigType">{o.jobFamily||'Voice recording'}</p></div><div><strong>{payout}</strong><small>{o.requiresPair?t.perPair:t.perPerson}</small></div></div>
      <dl className="offerQuickFacts">
       <div><dt>{t.what}</dt><dd>{t.whatText}</dd></div>
       <div><dt>{t.when}</dt><dd>{t.whenText}</dd></div>
       {duration&&<div><dt>{t.effort}</dt><dd>{duration}{o.sessionCount&&o.sessionCount>1?' × '+o.sessionCount:''}</dd></div>}
       <div><dt>{t.next}</dt><dd>{t.nextText}</dd></div>
      </dl>
      <div className="chips"><span>{o.languageCode.toUpperCase()}</span><span>{o.requiresPair?t.partner:t.solo}</span>{o.sessionCount&&<span>{o.sessionCount} {t.sessions}</span>}{o.deviceRequirement&&<span>{o.deviceRequirement}</span>}</div>
      <TrackedGigLink className="gigCtaV2" slug={o.slug} href={joinHref(o.slug)}>{t.qualify} →</TrackedGigLink>
     </article>
    })}
    {!sorted.length&&<article className="gigCardV2 emptyGig"><h3>{t.catalogUnavailable}</h3></article>}
   </div>
  </section>

  <section className="riskSection">
   <div className="sectionIntroV2"><div><div className="eyebrow">{t.before}</div><h2>{t.beforeTitle}</h2></div><p>{t.beforeLead}</p></div>
   <div className="riskGrid">{t.beforeItems.map(item=><article key={item[0]}><div>✓</div><h3>{item[0]}</h3><p>{item[1]}</p></article>)}</div>
  </section>

  <section className="flowSectionV2 hormoziHow" id="how">
   <div className="eyebrow">PAIRVOICE FLOW</div><h2>{t.howTitle}</h2>
   <div className="flowRail">{t.steps.map((x,i)=><article key={x[0]}><span>0{i+1}</span><div><h3>{x[0]}</h3><p>{x[1]}</p></div></article>)}</div>
  </section>

  <section className="faqSection" id="faq">
   <div className="sectionIntroV2"><div><div className="eyebrow">FAQ</div><h2>{t.faqTitle}</h2></div><p>{es?'Las reglas importantes aparecen antes del trabajo.':'The important rules appear before the work.'}</p></div>
   <div className="faqGrid">{t.faqs.map(item=><details key={item[0]}><summary>{item[0]}<span>+</span></summary><p>{item[1]}</p></details>)}</div>
  </section>

  <section className="finalOffer">
   <div><div className="eyebrow">{t.finalEyebrow}</div><h2>{t.finalTitle}</h2><p>{t.finalBody}</p></div>
   <aside className="finalOfferAction">{featuredPayout&&<strong>{featuredPayout}</strong>}{featured&&<span>{featured.name}</span>}{featured?<TrackedGigLink slug={featured.slug} href={joinHref(featured.slug)}>{t.finalCta} →</TrackedGigLink>:<a href={es?'/join?lang=es':'/join'}>{t.create} →</a>}<small>{es?'Gratis para entrar · Sin tarjeta':'Free to join · No card required'}</small></aside>
  </section>

  {featured&&<div className="mobileConversionBar"><div>{featuredPayout&&<strong>{featuredPayout}</strong>}<span>{featured.name}</span></div><TrackedGigLink slug={featured.slug} href={joinHref(featured.slug)}>{t.qualify} →</TrackedGigLink></div>}

  <footer><div className="logo">PAIR<span>VOICE</span></div><p>{t.footer}</p><div className="footerLinks"><a href="/privacy">Privacy</a><a href="/terms">Terms</a></div><span>© 2026 PairVoice</span></footer>
 </main>;
}
