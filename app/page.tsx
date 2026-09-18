'use client';
import {FormEvent,useEffect,useState} from 'react';

export default function Home(){
 const [done,setDone]=useState(false),[error,setError]=useState(''),[loading,setLoading]=useState(false),[lang,setLang]=useState<'en'|'es'>('en');
 useEffect(()=>{if(navigator.language.toLowerCase().startsWith('es'))setLang('es')},[]);
 const t=lang==='es'?{
  join:'Acceso anticipado',
  eyebrow:'OPORTUNIDADES DE VOZ PAGADAS • ESPAÑA',
  h1:'Tu voz',h2:'tiene valor.',
  lead:'PairVoice conecta a personas con oportunidades pagadas de grabación de voz. La oportunidad introductoria en España paga $50 en total por pareja aceptada.',
  cta:'Únete a la lista →',
  free:'Gratis • Sin cuenta todavía',
  start:'Recibe acceso anticipado.',
  formTitle:'Únete a la lista de PairVoice',
  email:'Correo electrónico',
  country:'País',
  consent:'Quiero recibir por correo oportunidades de PairVoice y actualizaciones de lanzamiento.',
  button:'Avísame de nuevas oportunidades →',
  loading:'Guardando…',
  done:'Ya estás en la lista de PairVoice.',
  next:'Te enviaremos un correo cuando haya oportunidades pagadas disponibles para tu mercado.',
  note:'Más adelante podrás añadir tu número de teléfono y crear tu cuenta completa.'
 }:{
  join:'Early access',
  eyebrow:'PAID VOICE OPPORTUNITIES • UNITED STATES',
  h1:'Your voice',h2:'has value.',
  lead:'PairVoice connects people with paid voice-recording opportunities. Our introductory U.S. opportunity pays $60 total per accepted pair.',
  cta:'Join the list →',
  free:'Free • No account required yet',
  start:'Get early access.',
  formTitle:'Join the PairVoice list',
  email:'Email address',
  country:'Country',
  consent:'Send me PairVoice opportunities and launch updates by email.',
  button:'Notify me about new opportunities →',
  loading:'Saving…',
  done:"You're on the PairVoice list.",
  next:"We'll email you when paid voice opportunities become available for your market.",
  note:'Later, you can add your phone number and create your full PairVoice account.'
 };
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setLoading(true);setError('');
  const f=new FormData(e.currentTarget),q=new URLSearchParams(location.search);
  const payload={
   email:f.get('email'),
   country:f.get('country'),
   consent:f.get('consent')==='on',
   source:q.get('source')||q.get('src')||null,
   campaign_key:q.get('campaign_key')||q.get('utm_campaign')||'organic',
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
  <nav><div className="logo">PAIR<span>VOICE</span></div><div className="navright"><button className="language" onClick={()=>setLang(lang==='en'?'es':'en')}>{lang==='en'?'ES':'EN'}</button><a href="#join">{t.join}</a></div></nav>
  <section className="hero"><div className="eyebrow">{t.eyebrow}</div><h1>{t.h1}<br/><em>{t.h2}</em></h1><p className="lead">{t.lead}</p><div className="actions"><a className="primary" href="#join">{t.cta}</a><span>{t.free}</span></div><div className="chips"><b>English</b><b>Español</b><b>United States</b><b>Spain</b></div></section>
  <section className="steps"><div><i>01</i><h3>Join the list</h3><p>Enter your email and market.</p></div><div><i>02</i><h3>Get notified</h3><p>We email you when a matching opportunity opens.</p></div><div><i>03</i><h3>Create your account</h3><p>Add your phone and profile details when you're ready to participate.</p></div><div><i>04</i><h3>Complete paid work</h3><p>Accepted work becomes eligible for payment under project terms.</p></div></section>
  <section className="join" id="join"><div><div className="eyebrow">PAIRVOICE EARLY ACCESS</div><h2>{t.start}</h2><p>{t.note}</p></div><div className="card">{done?<div className="success"><div>✓</div><h3>{t.done}</h3><p>{t.next}</p><small>{t.note}</small></div>:<form onSubmit={submit}><h3>{t.formTitle}</h3><label>{t.email}<input required type="email" name="email" autoComplete="email"/></label><label>{t.country}<select required name="country" defaultValue=""><option value="" disabled>Select</option><option>United States</option><option>Spain</option></select></label><label className="check"><input required name="consent" type="checkbox"/><span>{t.consent}</span></label>{error&&<p className="error">{error}</p>}<button disabled={loading}>{loading?t.loading:t.button}</button><small>No signup fee. Opportunities, eligibility, and compensation vary by project.</small></form>}</div></section>
  <footer><div className="logo">PAIR<span>VOICE</span></div><p>Paid voices. Real people. Global opportunities.</p></footer>
 </main>
}
