'use client';
import {useState} from 'react';
import {buildPartnerInviteMessage} from '../lib/partner-invite';
import {trackFunnelEvent} from '../lib/funnel';

type Props={inviteUrl:string;language:'en'|'es'};

export default function InviteShareButtons({inviteUrl,language}:Props){
 const[copied,setCopied]=useState(false);
 const message=buildPartnerInviteMessage(language,inviteUrl);
 const subject=language==='es'?'Únete a PairVoice':'Join me on PairVoice';
 async function copy(){
  try{await navigator.clipboard.writeText(inviteUrl);}catch{const area=document.createElement('textarea');area.value=inviteUrl;document.body.appendChild(area);area.select();document.execCommand('copy');area.remove();}
  setCopied(true);window.setTimeout(()=>setCopied(false),1800);
 }
 const links={
  whatsapp:`https://wa.me/?text=${encodeURIComponent(message)}`,
  sms:`sms:?&body=${encodeURIComponent(message)}`,
  email:`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`,
  facebook:`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(inviteUrl)}&quote=${encodeURIComponent(message)}`
 };
 function click(channel:string){
  trackFunnelEvent('partner_invite_share_clicked',{channel});
  trackFunnelEvent('share_clicked',{channel,share_type:'partner_invite'});
 }
 return <div className="sharePanel"><p className="shareLabel">{language==='es'?'Envíalo por:':'Share it by:'}</p><div className="shareButtons"><a className="shareButton whatsapp" href={links.whatsapp} onClick={()=>click('whatsapp')} target="_blank" rel="noreferrer"><span>◉</span> WhatsApp</a><a className="shareButton sms" href={links.sms} onClick={()=>click('sms')}><span>✉</span> SMS</a><a className="shareButton email" href={links.email} onClick={()=>click('email')}><span>✉</span> Email</a><a className="shareButton facebook" href={links.facebook} onClick={()=>click('facebook')} target="_blank" rel="noreferrer"><span>f</span> Facebook</a><button className="shareButton copy" type="button" onClick={()=>{click('copy');copy()}}><span>⧉</span> {copied?(language==='es'?'¡Copiado!':'Copied!'):(language==='es'?'Copiar enlace':'Copy link')}</button></div></div>;
}
