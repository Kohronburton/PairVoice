'use client';
import {FormEvent,useEffect,useState} from 'react';

const marketForLocale=(locale:string)=>{
 const parts=(locale||'').replace('_','-').split('-');
 const region=(parts[1]||'').toUpperCase();
 const supported=['US','ES','IT','AU','GB','MX','AR','CO'];
 return supported.includes(region)?region:'UNKNOWN';
};

type Lang='en'|'es'|'it';

export default function Home(){
 const [lang,setLang]=useState<Lang>('en');
 const [market,setMarket]=useState('UNKNOWN');
 const [locale,setLocale]=useState('');

 useEffect(()=>{
  const l=navigator.language||'';
  setLocale(l);
  setMarket(marketForLocale(l));
  if(l.toLowerCase().startsWith('es'))setLang('es');
  else if(l.toLowerCase().startsWith('it'))setLang('it');
 },[]);

 const copy:any={
  en:{
   eyebrow:'PAID VOICE OPPORTUNITIES',
   h1:'Your voice has value.',
   lead:'Join PairVoice and get notified when paid voice-recording projects match your language and location.',
   trust:'Free to join • Email only • No experience required',
   button:'Get Early Access →',
   email:'Email address',
   consent:'Send me PairVoice opportunities and launch updates by email.',
   saving:'Joining…',
   done:"You're on the list.",
   next:"We'll email you when a matching paid project opens.",
   examples:'Current project examples',
   why:'Why join now?',
   whyText:'Get notified early when projects open. Some projects have limited participant capacity and may only allow one completion per participant.',
   bottomTitle:'Want first access when a project matches you?',
   bottomText:'Join free now. We only need your email today.'
  },
  es:{
   eyebrow:'OPORTUNIDADES DE VOZ PAGADAS',
   h1:'Tu voz tiene valor.',
   lead:'Únete a PairVoice y recibe avisos cuando haya proyectos pagados de grabación de voz para tu idioma y ubicación.',
   trust:'Gratis • Solo correo • No necesitas experiencia',
   button:'Obtén acceso anticipado →',
   email:'Correo electrónico',
   consent:'Quiero recibir oportunidades de PairVoice y actualizaciones por correo.',
   saving:'Uniéndote…',
   done:'Ya estás en la lista.',
   next:'Te enviaremos un correo cuando haya un proyecto pagado compatible.',
   examples:'Ejemplos de proyectos actuales',
   why:'¿Por qué unirte ahora?',
   whyText:'Recibe avisos temprano cuando abran proyectos. Algunos tienen capacidad limitada y pueden permitir solo una participación por persona.',
   bottomTitle:'¿Quieres enterarte primero cuando haya un proyecto para ti?',
   bottomText:'Únete gratis ahora. Hoy solo necesitamos tu correo.'
  },
  it:{
   eyebrow:'OPPORTUNITÀ VOCALI RETRIBUITE',
   h1:'La tua voce ha valore.',
   lead:'Unisciti a PairVoice e ricevi un avviso quando ci sono progetti vocali retribuiti adatti alla tua lingua e località.',
   trust:'Gratis • Solo email • Nessuna esperienza richiesta',
   button:'Ottieni accesso anticipato →',
   email:'Indirizzo email',
   consent:'Inviami opportunità PairVoice e aggiornamenti via email.',
   saving:'Iscrizione…',
   done:'Sei nella lista.',
   next:'Ti invieremo un’email quando sarà disponibile un progetto adatto.',
   examples:'Esempi di progetti attuali',
   why:'Perché iscriversi ora?',
   whyText:'Ricevi un avviso in anticipo quando aprono nuovi progetti. Alcuni hanno posti limitati e possono consentire una sola partecipazione per persona.',
   bottomTitle:'Vuoi essere tra i primi quando arriva un progetto adatto?',
   bottomText:'Iscriviti gratis. Oggi ci serve solo la tua email.'
  }
 };
 const t=copy[lang];

 function SignupForm({placement}:{placement:string}){
  const [done,setDone]=useState(false);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(false);

  async function submit(e:FormEvent<HTMLFormElement>){
   e.preventDefault();setLoading(true);setError('');
   const f=new FormData(e.currentTarget),q=new URLSearchParams(location.search);
   const r=await fetch('/api/lead',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({
    email:f.get('email'),
    market_code:market,
    consent:f.get('consent')==='on',
    detected_locale:locale,
    detected_languages:Array.from(navigator.languages||[]),
    source:q.get('source')||q.get('src')||placement,
    campaign_key:q.get('campaign_key')||q.get('utm_campaign')||'coming-soon-organic',
    landing_path:location.pathname,
    referrer:document.referrer||null,
    fbclid:q.get('fbclid'),gclid:q.get('gclid'),
    utm_source:q.get('utm_source'),utm_medium:q.get('utm_medium'),utm_campaign:q.get('utm_campaign'),
    utm_content:q.get('utm_content')||placement,utm_term:q.get('utm_term')
   })});
   const data=await r.json();setLoading(false);
   if(!r.ok){setError(data.error||'Signup failed');return}
   setDone(true);
  }

  if(done)return <div className="success compact"><div>✓</div><h3>{t.done}</h3><p>{t.next}</p></div>;

  return <form onSubmit={submit} className="capture-form">
   <label>{t.email}<input required type="email" name="email" autoComplete="email" placeholder="you@example.com"/></label>
   <label className="check"><input required type="checkbox" name="consent"/><span>{t.consent}</span></label>
   {error&&<p className="error">{error}</p>}
   <button disabled={loading}>{loading?t.saving:t.button}</button>
   <small>{t.trust}</small>
  </form>;
 }

 return <main>
  <nav>
   <div className="logo">PAIR<span>VOICE</span></div>
   <div className="navright">
    <select className="language" value={lang} onChange={e=>setLang(e.target.value as Lang)}>
     <option value="en">EN</option><option value="es">ES</option><option value="it">IT</option>
    </select>
    <a href="#join">{t.button.replace(' →','')}</a>
   </div>
  </nav>

  <section className="hero conversion-hero">
   <div className="hero-visual">
    <div className="hero-scrim"></div>
    <div className="hero-visual-copy">
     <div className="eyebrow">{t.eyebrow}</div>
     <h1>{t.h1}</h1>
     <p className="lead">{t.lead}</p>
     <div className="trust-row"><span>✓ Free to join</span><span>✓ Email only</span><span>✓ No experience required</span></div>
    </div>
    <div className="floating-pay floating-us"><small>U.S. PROJECT EXAMPLE</small><b>$60</b><span>total per accepted pair</span></div>
    <div className="floating-pay floating-es"><small>SPAIN PROJECT EXAMPLE</small><b>$50</b><span>total per accepted pair</span></div>
    <div className="waveform" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
   </div>
   <div className="hero-form card" id="join">
    <div className="form-kicker">EARLY ACCESS</div>
    <h2>Get on the list.</h2>
    <p>When a paid project matches your language and location, we email you. Nothing else required today.</p>
    <SignupForm placement="coming-soon-hero"/>
    <div className="form-proof"><span>🔒 No payment info</span><span>🎙 No voice sample today</span></div>
   </div>
  </section>

  <section className="opportunities">
   <div className="section-head">
    <div className="eyebrow">REAL OPPORTUNITY EXAMPLES</div>
    <h2>{t.examples}</h2>
    <p>Compensation shown below is the total PairVoice participant payout for an accepted completed pair project.</p>
   </div>
   <div className="opportunity-grid">
    <article className="opportunity-card featured">
     <div className="market-badge">🇺🇸 UNITED STATES</div>
     <h3>English Pair Voice Project</h3>
     <strong className="pay">$60</strong>
     <span className="pay-label">total per accepted completed pair project</span>
     <ul><li>2 participants</li><li>Voice recording project</li><li>No professional voice experience required</li><li>One-time eligibility may apply</li></ul>
     <a href="#join-bottom">Join the list →</a>
    </article>
    <article className="opportunity-card">
     <div className="market-badge">🇪🇸 SPAIN</div>
     <h3>Spanish Pair Voice Project</h3>
     <strong className="pay">$50</strong>
     <span className="pay-label">total per accepted completed pair project</span>
     <ul><li>2 participants</li><li>Spain Spanish project</li><li>Voice requirements vary by campaign</li><li>One-time eligibility may apply</li></ul>
     <a href="#join-bottom">Join the list →</a>
    </article>
   </div>
  </section>

  <section className="value-strip">
   <div><b>01</b><h3>Join free</h3><p>Enter your email. That is all we need today.</p></div>
   <div><b>02</b><h3>Get matched</h3><p>We look at language and market signals behind the scenes.</p></div>
   <div><b>03</b><h3>See the opportunity</h3><p>We contact you when a relevant paid project opens.</p></div>
   <div><b>04</b><h3>Decide then</h3><p>Only complete more setup if you want that project.</p></div>
  </section>

  <section className="why">
   <div>
    <div className="eyebrow">LOW EFFORT. CLEAR VALUE.</div>
    <h2>{t.why}</h2>
    <p>{t.whyText}</p>
   </div>
   <div className="trust-box">
    <b>What we do not ask for today</b>
    <span>No password</span>
    <span>No payment information</span>
    <span>No voice sample</span>
    <span>No long application</span>
   </div>
  </section>

  <section className="bottom-capture" id="join-bottom">
   <div>
    <div className="eyebrow">GET EARLY ACCESS</div>
    <h2>{t.bottomTitle}</h2>
    <p>{t.bottomText}</p>
   </div>
   <div className="card"><SignupForm placement="coming-soon-bottom"/></div>
  </section>

  <footer>
   <div className="logo">PAIR<span>VOICE</span></div>
   <p>Paid voices. Real people. Global opportunities.</p>
  </footer>
 </main>
}
