'use client';
import {FormEvent,useEffect,useState} from 'react';

export default function Preview(){
 const [done,setDone]=useState(false),[lang,setLang]=useState<'en'|'es'|'it'>('en');
 useEffect(()=>{const l=navigator.language.toLowerCase();if(l.startsWith('es'))setLang('es');else if(l.startsWith('it'))setLang('it')},[]);
 const copy:any={
  en:{eyebrow:'PAIRVOICE DESIGN PREVIEW',h1:'Your voice',h2:'has value.',lead:'Preview the low-friction PairVoice acquisition experience before it reaches staging or production.',button:'Preview signup →',done:'Preview complete — no data was saved.'},
  es:{eyebrow:'VISTA PREVIA DE PAIRVOICE',h1:'Tu voz',h2:'tiene valor.',lead:'Vista previa de la experiencia de adquisición de PairVoice antes de pasar a staging o producción.',button:'Probar registro →',done:'Vista previa completa — no se guardaron datos.'},
  it:{eyebrow:'ANTEPRIMA PAIRVOICE',h1:'La tua voce',h2:'ha valore.',lead:'Anteprima dell’esperienza PairVoice prima dello staging o della produzione.',button:'Prova registrazione →',done:'Anteprima completata — nessun dato salvato.'}
 };
 const t=copy[lang];
 function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setDone(true)}
 return <main>
  <div style={{background:'#f4b942',color:'#07100e',padding:'8px 16px',textAlign:'center',fontWeight:900,fontSize:12}}>PREVIEW — DESIGN/UX ONLY — SUBMISSIONS ARE NOT SAVED</div>
  <nav><div className="logo">PAIR<span>VOICE</span></div><div className="navright"><select className="language" value={lang} onChange={e=>setLang(e.target.value as any)}><option value="en">EN</option><option value="es">ES</option><option value="it">IT</option></select></div></nav>
  <section className="hero"><div className="eyebrow">{t.eyebrow}</div><h1>{t.h1}<br/><em>{t.h2}</em></h1><p className="lead">{t.lead}</p><div className="chips"><b>Email only</b><b>Auto locale</b><b>Low friction</b><b>KPI-ready</b></div></section>
  <section className="join"><div><div className="eyebrow">PREVIEW FLOW</div><h2>See the signup experience.</h2><p>This branch is for reviewing copy, layout and interaction without polluting lead data.</p></div><div className="card">{done?<div className="success"><div>✓</div><h3>{t.done}</h3><button onClick={()=>setDone(false)}>Reset preview</button></div>:<form onSubmit={submit}><h3>Early access</h3><label>Email address<input required type="email" name="email" placeholder="you@example.com"/></label><label className="check"><input required type="checkbox"/><span>Send me PairVoice opportunities and launch updates by email.</span></label><button>{t.button}</button><small>Preview branch: no submission reaches Supabase.</small></form>}</div></section>
  <footer><div className="logo">PAIR<span>VOICE</span></div><p>Preview environment</p></footer>
 </main>
}
