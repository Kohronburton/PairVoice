import type {Metadata} from 'next';
import {headers} from 'next/headers';
import {getPublicOpportunities,type PublicOpportunity} from '../lib/public-marketplace';
import {LandingTelemetry,TrackedGigLink} from '../components/MarketplaceClientBits';

export const metadata:Metadata={
 title:'Get Paid to Talk | PairVoice',
 description:'Browse paid voice gigs, see payout and requirements before you start, connect your partner, record, submit, and track approval and payment.'
};

const marketForLocale=(l:string)=>{
 const first=(l||'en-US').split(',')[0].split(';')[0].trim().replace('_','-');
 const p=first.split('-');return(p[1]||'').toUpperCase()||'UNKNOWN';
};
const marketName=(c:string)=>({US:'United States',ES:'Spain',CA:'Canada',GB:'United Kingdom',AU:'Australia',MX:'Mexico',AR:'Argentina',CO:'Colombia'} as Record<string,string>)[c]||c;
const money=(c:number,x:string)=>{try{return new Intl.NumberFormat('en-US',{style:'currency',currency:x,maximumFractionDigits:0}).format(c/100)}catch{return'$'+Math.round(c/100)}};

function sortOpportunities(ops:PublicOpportunity[],market:string){
 return [...ops].sort((a,b)=>(a.countryCode===market?0:1)-(b.countryCode===market?0:1)||a.name.localeCompare(b.name));
}

export default async function Home({searchParams}:{searchParams:Promise<{lang?:string}>}){
 const [sp,h,ops]=await Promise.all([searchParams,headers(),getPublicOpportunities()]);
 const acceptLanguage=h.get('accept-language')||'en-US';
 const market=marketForLocale(acceptLanguage);
 const es=sp.lang==='es'||(!sp.lang&&acceptLanguage.toLowerCase().startsWith('es'));
 const sorted=sortOpportunities(ops,market);
 const featured=sorted.find(o=>o.countryCode===market)||sorted[0]||null;
 const featuredPayout=featured?.participantPayoutCents!=null?money(featured.participantPayoutCents,featured.payoutCurrency):null;

 const t=es?{
  work:'Proyectos',how:'Cómo funciona',signIn:'Entrar',create:'Crear cuenta',
  eyebrow:'PROYECTOS DE VOZ REMUNERADOS',title:'Cobrad por hablar.',accent:'Con alguien que conoces.',
  lead:'Mira el pago y los requisitos antes de empezar. Conecta a tu compañero, sigue las instrucciones y rastrea el trabajo hasta la aprobación y el pago.',
  qualify:'Ver si califico',all:'Ver proyectos',available:'DISPONIBLE AHORA',perPair:'por pareja aprobada',perPerson:'por participante aprobado',
  proofA:'GRATIS',proofALabel:'crear cuenta',proofBLabel:'proyectos publicados',proofC:'ANTES',proofCLabel:'requisitos antes de grabar',proofD:'RASTREO',proofDLabel:'aprobación y pago',
  open:'PROYECTOS DISPONIBLES',pick:'Mira el pago. Elige el proyecto.',fit:'Sin experiencia requerida. Mercado, idioma, requisitos y pago visibles antes de empezar.',
  partner:'Compañero requerido',solo:'Individual',sessions:'conversaciones',effort:'TIEMPO ESTIMADO',next:'SIGUIENTE PASO',nextText:'Comprueba requisitos y elegibilidad',
  what:'QUÉ HACES',whatText:'Graba conversaciones siguiendo las instrucciones del proyecto.',when:'CUÁNDO COBRAS',whenText:'Después de que tu trabajo sea revisado y aprobado.',
  noSurprises:'SIN SORPRESAS',trustTitle:'Sabes qué esperar antes de grabar.',trustLead:'PairVoice reduce la incertidumbre antes de que hagas el trabajo.',
  trust:[['¿Necesito experiencia?','No. Cada proyecto muestra sus requisitos antes de empezar.'],['¿Necesito compañero?','Solo cuando el proyecto lo indique. Puedes invitar o conectar a alguien que ya tenga PairVoice.'],['¿Cuándo cobro?','Después de que el trabajo requerido sea revisado y aprobado.'],['¿Tengo que pagar?','No. Crear una cuenta PairVoice es gratis y no requiere tarjeta.']],
  howTitle:'De proyecto a pago, paso a paso.',steps:[['Elige','Mira pago y requisitos.'],['Califica','Confirma que encajas.'],['Conecta','Invita o enlaza a tu compañero.'],['Completa','Graba, envía y sigue el pago.']],
  accountEyebrow:'TU CUENTA PAIRVOICE',ctaTitle:'Una cuenta. Más oportunidades.',ctaBody:'Crea tu perfil una vez y úsalo en los proyectos para los que calificas.',cta:'Crear cuenta gratis',
  ctaStrong:'Mira el pago. Comprueba si calificas. Luego empieza.',ctaText:'Después eliges proyectos, verificas requisitos y conectas a tu compañero cuando haga falta.',
  footer:'Tu voz tiene valor.',catalogUnavailable:'No hay proyectos publicados en este momento.'
 }:{
  work:'Gigs',how:'How it works',signIn:'Sign in',create:'Create account',
  eyebrow:'PAID VOICE GIGS',title:'Get paid to talk.',accent:'Bring someone you know.',
  lead:'See the payout and requirements before you start. Connect your partner, follow the instructions, and track the work through approval and payment.',
  qualify:'See if I qualify',all:'See all gigs',available:'AVAILABLE NOW',perPair:'per approved pair',perPerson:'per approved participant',
  proofA:'FREE',proofALabel:'to create an account',proofBLabel:'published gigs',proofC:'BEFORE',proofCLabel:'requirements before recording',proofD:'TRACKED',proofDLabel:'approval and payout',
  open:'AVAILABLE GIGS',pick:'See the money. Choose the gig.',fit:'No experience required. Market, language, requirements and payout are visible before you start.',
  partner:'Partner required',solo:'Individual',sessions:'conversations',effort:'ESTIMATED TIME',next:'NEXT STEP',nextText:'Check requirements & eligibility',
  what:'WHAT YOU DO',whatText:'Record conversations by following the gig instructions.',when:'WHEN YOU GET PAID',whenText:'After your completed work is reviewed and approved.',
  noSurprises:'NO SURPRISES',trustTitle:'Know what to expect before you record.',trustLead:'PairVoice removes uncertainty before you do the work.',
  trust:[['Do I need experience?','No. Each gig shows its requirements before you start.'],['Do I need a partner?','Only when the gig says so. Invite someone or connect with an existing PairVoice user.'],['When do I get paid?','After the required work is reviewed and approved.'],['Do I pay to join?','No. Creating a PairVoice account is free and requires no card.']],
  howTitle:'From gig to payout, step by step.',steps:[['Choose','See payout and requirements.'],['Qualify','Confirm you fit the gig.'],['Connect','Invite or link your partner.'],['Complete','Record, submit, and track payout.']],
  accountEyebrow:'YOUR PAIRVOICE ACCOUNT',ctaTitle:'One account. More opportunities.',ctaBody:'Create your profile once and reuse it across gigs you qualify for.',cta:'Create free account',
  ctaStrong:'See the payout. Check your fit. Then start.',ctaText:'Then choose gigs, verify requirements, and connect a partner when needed.',
  footer:'Your voice has value.',catalogUnavailable:'No gigs are published right now.'
 };

 const joinHref=(slug:string)=>'/join?campaign='+encodeURIComponent(slug)+(es?'&lang=es':'');

 return <main className="pv2 productionMarketplace">
  <LandingTelemetry market={market}/>

  <nav className="pvnav" aria-label="Primary">
   <a className="logo" href={es?'/?lang=es':'/'} aria-label="PairVoice home">PAIR<span>VOICE</span></a>
   <div className="navlinks"><a href="#work">{t.work}</a><a href="#how">{t.how}</a></div>
   <div className="navright">
    <div className="langToggle" aria-label="Language"><a className={!es?'active':''} href="/">EN</a><a className={es?'active':''} href="/?lang=es">ES</a></div>
    <a className="navsignin" href="/signin">{t.signIn}</a>
    <a className="navcta" href={es?'/join?lang=es':'/join'}>{t.create}</a>
   </div>
  </nav>

  <section className="productionHeroV2">
   <div className="heroCopyV2">
    <div className="statusline"><span></span>{t.eyebrow}</div>
    <h1>{t.title}<em>{t.accent}</em></h1>
    <p className="heroLeadV2">{t.lead}</p>

    {featured&&featuredPayout&&<div className="featuredOfferV2">
     <div><span>{t.available}</span><strong>{featuredPayout}</strong><small>{featured.requiresPair?t.perPair:t.perPerson}</small></div>
     <div><b>{featured.name}</b><p>{marketName(featured.countryCode)} · {featured.languageCode.toUpperCase()} · {featured.requiresPair?t.partner:t.solo}</p></div>
    </div>}

    <div className="heroActionsV2">
     {featured?<TrackedGigLink className="heroCtaPrimary" slug={featured.slug} href={joinHref(featured.slug)}>{t.qualify} →</TrackedGigLink>:<a className="heroCtaPrimary" href="#work">{t.all} →</a>}
     <a className="heroCtaSecondary" href="#work">{t.all}</a>
    </div>
    <p className="microTrust">✓ {es?'Sin experiencia requerida · Gratis · Sin tarjeta · Requisitos antes de grabar':'No experience required · Free to join · No card · Requirements before recording'}</p>
   </div>

   <aside className="productStory" aria-label={es?'Cómo funciona PairVoice':'How PairVoice works'}>
    <div className="storyTop"><span>PAIRVOICE FLOW</span><b>{es?'Trabajo simple. Estado claro.':'Simple work. Clear status.'}</b></div>
    <div className="storyOrb" aria-hidden="true"><div className="waveBars">{[28,48,72,96,68,46,26].map((h,i)=><i key={i} style={{height:h}}/> )}</div></div>
    <div className="storySteps">
     <div><span>01</span><b>{es?'PROYECTO':'GIG'}</b></div><i>→</i>
     <div><span>02</span><b>{es?'PAREJA':'PAIR'}</b></div><i>→</i>
     <div><span>03</span><b>{es?'GRABA':'RECORD'}</b></div><i>→</i>
     <div><span>04</span><b>{es?'COBRA':'PAID'}</b></div>
    </div>
    <div className="storyStatus"><span>{es?'PAGO':'PAYOUT'}</span><strong>{es?'Después de aprobación':'After approval'}</strong><small>{es?'Estado visible en tu cuenta':'Status visible in your account'}</small></div>
   </aside>
  </section>

  <section className="proofStripV2" aria-label={es?'Datos de PairVoice':'PairVoice facts'}>
   <div><b>{t.proofA}</b><span>{t.proofALabel}</span></div>
   <div><b>{ops.length}</b><span>{t.proofBLabel}</span></div>
   <div><b>{t.proofC}</b><span>{t.proofCLabel}</span></div>
   <div><b>{t.proofD}</b><span>{t.proofDLabel}</span></div>
  </section>

  <section className="marketSection" id="work">
   <div className="sectionIntroV2"><div><div className="eyebrow">{t.open}</div><h2>{t.pick}</h2></div><p>{t.fit}</p></div>
   <div className="missionGridV2">
    {sorted.map((o,n)=>{
     const payout=o.participantPayoutCents!=null?money(o.participantPayoutCents,o.payoutCurrency):(es?'Pago por confirmar':'Payout being finalized');
     const duration=o.sessionMinutesMin&&o.sessionMinutesMax?o.sessionMinutesMin+'–'+o.sessionMinutesMax+' min':o.sessionMinutesMax?'Up to '+o.sessionMinutesMax+' min':o.sessionMinutesMin?o.sessionMinutesMin+'+ min':null;
     return <article className={'gigCardV2 '+(o.countryCode===market?'marketFit':'')} key={o.slug}>
      <header><span>{String(n+1).padStart(2,'0')}</span><div>{o.countryCode===market&&<b>{es?'TU MERCADO':'YOUR MARKET'}</b>}<small>{marketName(o.countryCode)}</small></div></header>
      <h3>{o.name}</h3><p className="gigType">{o.jobFamily||'Voice recording'}</p>
      <div className="gigMoney"><strong>{payout}</strong><span>{o.requiresPair?t.perPair:t.perPerson}</span></div>
      <dl className="gigQuickFacts">
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

  <section className="trustSectionV2">
   <div className="sectionIntroV2"><div><div className="eyebrow">{t.noSurprises}</div><h2>{t.trustTitle}</h2></div><p>{t.trustLead}</p></div>
   <div className="trustGridV2">{t.trust.map((item,i)=><article key={item[0]}><span>0{i+1}</span><h3>{item[0]}</h3><p>{item[1]}</p></article>)}</div>
  </section>

  <section className="flowSectionV2" id="how">
   <div className="eyebrow">PAIRVOICE FLOW</div><h2>{t.howTitle}</h2>
   <div className="flowRail">{t.steps.map((x,i)=><article key={x[0]}><span>0{i+1}</span><div><h3>{x[0]}</h3><p>{x[1]}</p></div></article>)}</div>
  </section>

  <section className="accountBanner">
   <div><div className="eyebrow">{t.accountEyebrow}</div><h2>{t.ctaTitle}</h2><p>{t.ctaBody}</p></div>
   <aside><span>{es?'SIN TARIFA DE REGISTRO':'NO SIGNUP FEE'}</span><strong>{t.ctaStrong}</strong><p>{t.ctaText}</p><a href={es?'/join?lang=es':'/join'}>{t.cta} →</a><a className="textLink" href="/signin">{t.signIn}</a></aside>
  </section>

  {featured&&<div className="mobileConversionBar"><div>{featuredPayout&&<strong>{featuredPayout}</strong>}<span>{featured.name}</span></div><TrackedGigLink slug={featured.slug} href={joinHref(featured.slug)}>{t.qualify} →</TrackedGigLink></div>}

  <footer><div className="logo">PAIR<span>VOICE</span></div><p>{t.footer}</p><div className="footerLinks"><a href="/privacy">Privacy</a><a href="/terms">Terms</a></div><span>© 2026 PairVoice</span></footer>
 </main>;
}
