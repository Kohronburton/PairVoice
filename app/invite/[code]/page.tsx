'use client';
import {FormEvent,useEffect,useState} from 'react';
import {trackFunnelEvent} from '../../../lib/funnel';

function countryFromLocale(){
 const region=(navigator.language.split('-')[1]||'US').toUpperCase();
 return ['US','ES'].includes(region)?region:'US';
}

export default function InvitePage({params}:{params:Promise<{code:string}>}){
 const[code,setCode]=useState(''),[lang,setLang]=useState<'en'|'es'>('en'),[country,setCountry]=useState('US'),[done,setDone]=useState(false),[error,setError]=useState(''),[loading,setLoading]=useState(false);
 useEffect(()=>{params.then(p=>setCode(p.code.toUpperCase()));const q=new URLSearchParams(location.search),browser=navigator.language.toLowerCase();setLang(q.get('lang')==='es'||(!q.get('lang')&&browser.startsWith('es'))?'es':'en');setCountry(countryFromLocale());trackFunnelEvent('invite_view');},[params]);
 const es=lang==='es';
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setLoading(true);setError('');trackFunnelEvent('partner_signup_started');
  const f=new FormData(e.currentTarget),countryCode=String(f.get('countryCode')||country).toUpperCase();
  const r=await fetch('/api/pair',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({
   inviteCode:code,firstName:f.get('first_name'),email:f.get('email'),phone:f.get('phone'),countryCode,
   languageCode:lang,is18Plus:f.get('is18Plus')==='on',consent:f.get('consent')==='on'
  })}),d=await r.json().catch(()=>({}));setLoading(false);
  if(!r.ok){setError(d.error||(es?'No se pudo unir la pareja.':'Unable to join pair.'));return}
  setDone(true);trackFunnelEvent('partner_signup_completed');trackFunnelEvent('partner_matching_joined');
 }
 return <main className="invitePage"><nav><div className="logo">PAIR<span>VOICE</span></div><button className="language" onClick={()=>setLang(es?'en':'es')}>{es?'EN':'ES'}</button></nav><section className="inviteWrap"><div className="eyebrow">{es?'INVITACIÓN DE PAREJA':'PARTNER INVITATION'}</div><h1>{es?'Únete a tu pareja.':'Join your partner.'}</h1><p className="lead">{es?'Tu compañero ya se registró en PairVoice. Completa estos datos para conectaros en la oportunidad de voz.':'Your partner has already joined PairVoice. Complete these details so we can connect your paid voice pair.'}</p><div className="card">{done?<div className="success"><div>✓</div><h3>{es?'¡Tu pareja está conectada!':'Your pair is connected!'}</h3><p>{es?'Te enviaremos un correo con los próximos pasos.':'We’ll email you the next steps.'}</p></div>:<form onSubmit={submit}><h3>{es?'Completa tu registro':'Complete your signup'}</h3><label htmlFor="partner-first-name">{es?'Nombre':'First name'}</label><input id="partner-first-name" required name="first_name" autoComplete="given-name" autoCapitalize="words" enterKeyHint="next"/><label htmlFor="partner-email">{es?'Correo electrónico':'Email address'}</label><input id="partner-email" required type="email" name="email" autoComplete="email" inputMode="email" autoCapitalize="none" spellCheck={false} enterKeyHint="next"/><label htmlFor="partner-phone">{es?'Teléfono':'Phone number'}</label><input id="partner-phone" required type="tel" name="phone" autoComplete="tel" inputMode="tel" enterKeyHint="next"/><label htmlFor="partner-country">{es?'País de la campaña':'Campaign country'}</label><select id="partner-country" name="countryCode" value={country} onChange={e=>setCountry(e.target.value)}><option value="US">United States</option><option value="ES">España</option></select><label className="check" htmlFor="partner-age"><input id="partner-age" required name="is18Plus" type="checkbox"/><span>{es?'Confirmo que tengo al menos 18 años.':'I confirm I am at least 18 years old.'}</span></label><label className="check" htmlFor="partner-consent"><input id="partner-consent" required name="consent" type="checkbox"/><span>{es?'Acepto comunicaciones operativas sobre esta oportunidad de PairVoice.':'I agree to operational communications about this PairVoice opportunity.'}</span></label>{error&&<p className="error">{error}</p>}<button disabled={loading}>{loading?(es?'Conectando…':'Connecting…'):(es?'Unirme a mi pareja →':'Join my partner →')}</button><small>{es?'Código de invitación: ':'Invitation code: '}{code}</small></form>}</div></section></main>;
}
