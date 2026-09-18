'use client';
import {FormEvent,useEffect,useState} from 'react';

const marketForLocale=(locale:string)=>{
 const parts=(locale||'').replace('_','-').split('-');
 const region=(parts[1]||'').toUpperCase();
 const supported=['US','ES','IT','AU','GB','MX','AR','CO'];
 return supported.includes(region)?region:'UNKNOWN';
};

export default function Home(){
 const [done,setDone]=useState(false),[error,setError]=useState(''),[loading,setLoading]=useState(false),[lang,setLang]=useState<'en'|'es'|'it'>('en'),[market,setMarket]=useState('UNKNOWN'),[locale,setLocale]=useState('');
 useEffect(()=>{const l=navigator.language||'';setLocale(l);setMarket(marketForLocale(l));if(l.toLowerCase().startsWith('es'))setLang('es');else if(l.toLowerCase().startsWith('it'))setLang('it')},[]);
 const d:any={
  en:{eyebrow:'PAIRVOICE IS COMING SOON',h1:'Your voice',h2:'has value.',lead:'Join the early-access list for paid voice-recording opportunities matched to your language and market.',cta:'Join early access',email:'Email address',consent:'Send me PairVoice opportunities and launch updates by email.',button:'Join the list →',saving:'Saving…',done:"You're on the list.",next:"We'll email you when matching paid voice opportunities open."},
  es:{eyebrow:'PAIRVOICE LLEGA PRONTO',h1:'Tu voz',h2:'tiene valor.',lead:'Únete a la lista de acceso anticipado para oportunidades pagadas de grabación de voz según tu idioma y mercado.',cta:'Acceso anticipado',email:'Correo electrónico',consent:'Quiero recibir oportunidades de PairVoice y actualizaciones por correo.',button:'Únete a la lista →',saving:'Guardando…',done:'Ya estás en la lista.',next:'Te enviaremos un correo cuando haya oportunidades pagadas compatibles.'},
  it:{eyebrow:'PAIRVOICE ARRIVA PRESTO',h1:'La tua voce',h2:'ha valore.',lead:'Unisciti alla lista di accesso anticipato per opportunità retribuite di registrazione vocale adatte alla tua lingua e al tuo mercato.',cta:'Accesso anticipato',email:'Indirizzo email',consent:'Inviami opportunità PairVoice e aggiornamenti via email.',button:'Unisciti alla lista →',saving:'Salvataggio…',done:'Sei nella lista.',next:'Ti invieremo un’email quando saranno disponibili opportunità adatte.'}
 };
 const t=d[lang];
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setLoading(true);setError('');
  const f=new FormData(e.currentTarget),q=new URLSearchParams(location.search);
  const r=await fetch('/api/lead',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({
   email:f.get('email'),market_code:market,consent:f.get('consent')==='on',detected_locale:locale,
   detected_languages:Array.from(navigator.languages||[]),source:q.get('source')||'coming-soon',
   campaign_key:q.get('campaign_key')||q.get('utm_campaign')||'coming-soon-organic',landing_path:location.pathname,
   referrer:document.referrer||null,fbclid:q.get('fbclid'),gclid:q.get('gclid'),utm_source:q.get('utm_source'),
   utm_medium:q.get('utm_medium'),utm_campaign:q.get('utm_campaign'),utm_content:q.get('utm_content'),utm_term:q.get('utm_term')
  })});
  const data=await r.json();setLoading(false);if(!r.ok){setError(data.error||'Signup failed');return}setDone(true);
 }
 return <main>
  <nav><div className="logo">PAIR<span>VOICE</span></div><div className="navright"><select className="language" value={lang} onChange={e=>setLang(e.target.value as any)}><option value="en">EN</option><option value="es">ES</option><option value="it">IT</option></select><a href="#join">{t.cta}</a></div></nav>
  <section className="hero"><div className="eyebrow">{t.eyebrow}</div><h1>{t.h1}<br/><em>{t.h2}</em></h1><p className="lead">{t.lead}</p><div className="actions"><a className="primary" href="#join">{t.cta}</a><span>Free • Email only</span></div><div className="chips"><b>English</b><b>Español</b><b>Italiano</b><b>US</b><b>Spain</b><b>Italy</b><b>Australia</b><b>UK</b></div></section>
  <section className="join" id="join"><div><div className="eyebrow">EARLY ACCESS</div><h2>Be first in line.</h2><p>No phone number, password or voice sample required yet.</p></div><div className="card">{done?<div className="success"><div>✓</div><h3>{t.done}</h3><p>{t.next}</p></div>:<form onSubmit={submit}><h3>{t.cta}</h3><label>{t.email}<input required type="email" name="email" autoComplete="email"/></label><label className="check"><input required type="checkbox" name="consent"/><span>{t.consent}</span></label>{error&&<p className="error">{error}</p>}<button disabled={loading}>{loading?t.saving:t.button}</button><small>PairVoice — Your Voice Has Value.</small></form>}</div></section>
  <footer><div className="logo">PAIR<span>VOICE</span></div><p>Paid voices. Real people. Global opportunities.</p></footer>
 </main>
}
