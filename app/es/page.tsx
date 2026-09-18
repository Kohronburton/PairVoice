'use client';
import {FormEvent,useEffect,useState} from 'react';

export default function SpanishLanding(){
 const [locale,setLocale]=useState('es-ES');
 useEffect(()=>{setLocale(navigator.language||'es-ES')},[]);

 function SignupForm({placement}:{placement:string}){
  const [done,setDone]=useState(false);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(false);

  async function submit(e:FormEvent<HTMLFormElement>){
   e.preventDefault();setLoading(true);setError('');
   const f=new FormData(e.currentTarget),q=new URLSearchParams(location.search);
   const r=await fetch('/api/lead',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({
    email:f.get('email'),
    market_code:'ES',
    consent:f.get('consent')==='on',
    detected_locale:locale,
    detected_languages:Array.from(navigator.languages||[]),
    source:q.get('source')||q.get('src')||placement,
    campaign_key:q.get('campaign_key')||q.get('utm_campaign')||'spain-coming-soon',
    landing_path:location.pathname,
    referrer:document.referrer||null,
    fbclid:q.get('fbclid'),gclid:q.get('gclid'),
    utm_source:q.get('utm_source'),utm_medium:q.get('utm_medium'),utm_campaign:q.get('utm_campaign'),
    utm_content:q.get('utm_content')||placement,utm_term:q.get('utm_term')
   })});
   const data=await r.json();setLoading(false);
   if(!r.ok){setError(data.error||'No pudimos guardar tu correo.');return}
   setDone(true);
  }

  if(done)return <div className="success compact"><div>✓</div><h3>Ya estás en la lista.</h3><p>Te enviaremos un correo cuando haya un proyecto pagado compatible.</p></div>;

  return <form onSubmit={submit} className="capture-form">
   <label>Correo electrónico<input required type="email" name="email" autoComplete="email" placeholder="tu@email.com"/></label>
   <label className="check"><input required type="checkbox" name="consent"/><span>Quiero recibir oportunidades de PairVoice y actualizaciones por correo electrónico.</span></label>
   {error&&<p className="error">{error}</p>}
   <button disabled={loading}>{loading?'Uniéndote…':'Obtén acceso anticipado →'}</button>
   <small>Gratis • Solo correo electrónico • No necesitas experiencia profesional</small>
  </form>;
 }

 return <main>
  <nav>
   <div className="logo">PAIR<span>VOICE</span></div>
   <div className="navright"><a href="/">EN</a><a href="#join">Únete gratis</a></div>
  </nav>

  <section className="hero conversion-hero">
   <div className="hero-visual">
    <div className="hero-scrim"></div>
    <div className="hero-visual-copy">
     <div className="eyebrow">OPORTUNIDADES DE VOZ PAGADAS EN ESPAÑA</div>
     <h1>Tu voz tiene valor.</h1>
     <p className="lead">Únete a PairVoice y recibe avisos cuando haya proyectos pagados de grabación de voz para personas en España.</p>
     <div className="trust-row"><span>✓ Gratis</span><span>✓ Solo correo</span><span>✓ Sin experiencia profesional</span></div>
    </div>
    <div className="floating-pay floating-main"><small>EJEMPLO DE PROYECTO EN ESPAÑA</small><b>$50</b><span>total por pareja aceptada</span></div>
    <div className="waveform" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
   </div>

   <div className="hero-form card" id="join">
    <div className="form-kicker">ACCESO ANTICIPADO</div>
    <h2>Apúntate a la lista.</h2>
    <p>Cuando haya un proyecto pagado compatible con tu idioma y ubicación, te avisamos por correo. Nada más por hoy.</p>
    <SignupForm placement="spain-hero"/>
    <div className="form-proof"><span>🔒 Sin datos de pago</span><span>🎙 Sin muestra de voz hoy</span></div>
   </div>
  </section>

  <section className="opportunities">
   <div className="section-head">
    <div className="eyebrow">EJEMPLO DE OPORTUNIDAD ACTUAL</div>
    <h2>Proyecto de voz en español de España</h2>
    <p>La cantidad mostrada es el pago total de PairVoice por un proyecto en pareja aceptado y completado.</p>
   </div>

   <div className="opportunity-grid">
    <article className="opportunity-card featured">
     <div className="market-badge">🇪🇸 ESPAÑA</div>
     <h3>Proyecto de voz en pareja</h3>
     <strong className="pay">$50</strong>
     <span className="pay-label">total por proyecto en pareja aceptado y completado</span>
     <ul>
      <li>2 participantes</li>
      <li>Proyecto de grabación de voz</li>
      <li>Español de España</li>
      <li>No necesitas experiencia profesional</li>
      <li>Puede aplicarse participación única</li>
     </ul>
     <a href="#join-bottom">Quiero recibir oportunidades →</a>
    </article>

    <article className="opportunity-card">
     <div className="market-badge">PAIRVOICE</div>
     <h3>Más proyectos llegarán después</h3>
     <p style={{color:'#c8d0cc',lineHeight:1.7}}>También iremos añadiendo nuevas oportunidades según idioma, ubicación y requisitos de cada campaña.</p>
     <ul>
      <li>Te avisamos por correo</li>
      <li>Tú decides si te interesa</li>
      <li>No pedimos datos de pago hoy</li>
      <li>No pedimos muestra de voz hoy</li>
     </ul>
     <a href="#join-bottom">Únete gratis →</a>
    </article>
   </div>
  </section>

  <section className="value-strip">
   <div><b>01</b><h3>Únete gratis</h3><p>Introduce tu correo. Eso es todo por hoy.</p></div>
   <div><b>02</b><h3>Te encontramos proyectos</h3><p>Usamos señales de idioma y mercado para buscar oportunidades compatibles.</p></div>
   <div><b>03</b><h3>Recibes el aviso</h3><p>Te enviamos un correo cuando haya una oportunidad pagada relevante.</p></div>
   <div><b>04</b><h3>Tú decides</h3><p>Solo completas más pasos si quieres participar en ese proyecto.</p></div>
  </section>

  <section className="why">
   <div>
    <div className="eyebrow">POCO ESFUERZO. VALOR CLARO.</div>
    <h2>¿Por qué apuntarte ahora?</h2>
    <p>Recibe avisos temprano cuando abran proyectos. Algunas campañas tienen capacidad limitada y pueden permitir una sola participación por persona.</p>
   </div>
   <div className="trust-box">
    <b>Lo que no te pedimos hoy</b>
    <span>Ninguna contraseña</span>
    <span>Ningún dato de pago</span>
    <span>Ninguna muestra de voz</span>
    <span>Ninguna solicitud larga</span>
   </div>
  </section>

  <section className="bottom-capture" id="join-bottom">
   <div>
    <div className="eyebrow">ACCESO ANTICIPADO</div>
    <h2>¿Quieres enterarte primero cuando haya un proyecto para ti?</h2>
    <p>Únete gratis ahora. Hoy solo necesitamos tu correo.</p>
   </div>
   <div className="card"><SignupForm placement="spain-bottom"/></div>
  </section>

  <footer><div className="logo">PAIR<span>VOICE</span></div><p>Voces reales. Oportunidades pagadas. Acceso global.</p></footer>
 </main>
}
