'use client';
import {FormEvent,useEffect,useState} from 'react';

const marketForLocale=(locale:string)=>{
 const l=(locale||'').toLowerCase();
 if(l.includes('es-es'))return'ES_ES';
 if(l.includes('it'))return'IT_IT';
 if(l.includes('en-au'))return'AU_EN';
 if(l.includes('en-gb'))return'GB_EN';
 if(l.includes('es-mx'))return'MX_ES';
 if(l.includes('es-ar'))return'AR_ES';
 if(l.includes('es-co'))return'CO_ES';
 return'US_EN';
};

export default function Home(){
 const [done,setDone]=useState(false),[error,setError]=useState(''),[loading,setLoading]=useState(false),[lang,setLang]=useState<'en'|'es'|'it'>('en'),[market,setMarket]=useState('US_EN'),[detectedLocale,setDetectedLocale]=useState('');
 useEffect(()=>{
  const locale=navigator.language||'en-US';
  setDetectedLocale(locale);
  if(locale.toLowerCase().startsWith('es'))setLang('es');
  else if(locale.toLowerCase().startsWith('it'))setLang('it');
  setMarket(marketForLocale(locale));
 },[]);
 const dict:any={
  en:{join:'Early access',eyebrow:'PAID VOICE OPPORTUNITIES',h1:'Your voice',h2:'has value.',lead:'Join PairVoice to hear about paid voice-recording opportunities matched to your market and language.',cta:'Join the list →',free:'Free • No account required yet',start:'Get early access.',formTitle:'Join the PairVoice list',email:'Email address',market:'Your market',consent:'Send me PairVoice opportunities and launch updates by email.',button:'Notify me about new opportunities →',loading:'Saving…',done:"You're on the PairVoice list.",next:"We'll email you when paid voice opportunities become available for your market.",note:'Later, you can add your phone number and create your full PairVoice account.'},
  es:{join:'Acceso anticipado',eyebrow:'OPORTUNIDADES DE VOZ PAGADAS',h1:'Tu voz',h2:'tiene valor.',lead:'Únete a PairVoice para recibir oportunidades pagadas de grabación de voz según tu mercado e idioma.',cta:'Únete a la lista →',free:'Gratis • Sin cuenta todavía',start:'Recibe acceso anticipado.',formTitle:'Únete a la lista de PairVoice',email:'Correo electrónico',market:'Tu mercado',consent:'Quiero recibir por correo oportunidades de PairVoice y actualizaciones de lanzamiento.',button:'Avísame de nuevas oportunidades →',loading:'Guardando…',done:'Ya estás en la lista de PairVoice.',next:'Te enviaremos un correo cuando haya oportunidades pagadas disponibles para tu mercado.',note:'Más adelante podrás añadir tu número de teléfono y crear tu cuenta completa.'},
  it:{join:'Accesso anticipato',eyebrow:'OPPORTUNITÀ VOCALI RETRIBUITE',h1:'La tua voce',h2:'ha valore.',lead:'Unisciti a PairVoice per ricevere opportunità retribuite di registrazione vocale adatte al tuo mercato e alla tua lingua.',cta:'Iscriviti alla lista →',free:'Gratis • Nessun account richiesto per ora',start:"Ottieni l'accesso anticipato.",formTitle:'Unisciti alla lista PairVoice',email:'Indirizzo email',market:'Il tuo mercato',consent:'Inviami via email opportunità PairVoice e aggiornamenti sul lancio.',button:'Avvisami delle nuove opportunità →',loading:'Salvataggio…',done:'Sei nella lista PairVoice.',next:'Ti invieremo un’email quando saranno disponibili opportunità retribuite per il tuo mercato.',note:'Più avanti potrai aggiungere il numero di telefono e creare il tuo account PairVoice completo.'}
 };
 const t=dict[lang];
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setLoading(true);setError('');
  const f=new FormData(e.currentTarget),q=new URLSearchParams(location.search);
  const payload={
   email:f.get('email'),
   market_code:market,
   consent:f.get('consent')==='on',
   detected_locale:detectedLocale,
   detected_languages:Array.from(navigator.languages||[]),
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
  <nav><div className="logo">PAIR<span>VOICE</span></div><div className="navright"><select className="language" value={lang} onChange={e=>setLang(e.target.value as any)}><option value="en">EN</option><option value="es">ES</option><option value="it">IT</option></select><a href="#join">{t.join}</a></div></nav>
  <section className="hero"><div className="eyebrow">{t.eyebrow}</div><h1>{t.h1}<br/><em>{t.h2}</em></h1><p className="lead">{t.lead}</p><div className="actions"><a className="primary" href="#join">{t.cta}</a><span>{t.free}</span></div><div className="chips"><b>English</b><b>Español</b><b>Italiano</b><b>United States</b><b>Spain</b><b>Italy</b><b>Australia</b><b>United Kingdom</b></div></section>
  <section className="steps"><div><i>01</i><h3>Join the list</h3><p>Enter your email and market.</p></div><div><i>02</i><h3>We detect language</h3><p>Your device language is saved as a matching signal.</p></div><div><i>03</i><h3>Get notified</h3><p>We email you when a matching opportunity opens.</p></div><div><i>04</i><h3>Create your account later</h3><p>Add your phone and full profile when you're ready to participate.</p></div></section>
  <section className="join" id="join"><div><div className="eyebrow">PAIRVOICE EARLY ACCESS</div><h2>{t.start}</h2><p>{t.note}</p></div><div className="card">{done?<div className="success"><div>✓</div><h3>{t.done}</h3><p>{t.next}</p><small>{t.note}</small></div>:<form onSubmit={submit}><h3>{t.formTitle}</h3><label>{t.email}<input required type="email" name="email" autoComplete="email"/></label><label>{t.market}<select required value={market} onChange={e=>setMarket(e.target.value)}><option value="US_EN">United States — English</option><option value="ES_ES">España — Español</option><option value="IT_IT">Italia — Italiano</option><option value="AU_EN">Australia — English</option><option value="GB_EN">United Kingdom — English</option><option value="MX_ES">México — Español</option><option value="AR_ES">Argentina — Español</option><option value="CO_ES">Colombia — Español</option></select></label><label className="check"><input required name="consent" type="checkbox"/><span>{t.consent}</span></label>{error&&<p className="error">{error}</p>}<button disabled={loading}>{loading?t.loading:t.button}</button><small>Detected device language: {detectedLocale||'—'}. You can choose a different market above.</small></form>}</div></section>
  <footer><div className="logo">PAIR<span>VOICE</span></div><p>Paid voices. Real people. Global opportunities.</p></footer>
 </main>
}
