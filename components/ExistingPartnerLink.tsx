'use client';
import {useEffect,useState} from 'react';

type RequestRow={
 id:string;status:string;created_at:string;requester_participant_id:string;target_participant_id:string;
 campaigns:{slug:string;name:string}|{slug:string;name:string}[]|null;
 requester:{first_name:string;public_code:string}|{first_name:string;public_code:string}[]|null;
 target:{first_name:string;public_code:string}|{first_name:string;public_code:string}[]|null;
};
const one=<T,>(v:T|T[]|null)=>Array.isArray(v)?v[0]||null:v;

export default function ExistingPartnerLink({campaignSlug,campaignName}:{campaignSlug:string;campaignName:string}){
 const[code,setCode]=useState(''),[email,setEmail]=useState(''),[mode,setMode]=useState<'code'|'email'>('code'),[mine,setMine]=useState(''),[copied,setCopied]=useState(false),[requests,setRequests]=useState<RequestRow[]>([]),[status,setStatus]=useState(''),[busy,setBusy]=useState(false);
 async function load(){
  const r=await fetch('/api/existing-partner',{cache:'no-store'}),d=await r.json();
  if(r.ok){setMine(d.participantCode||'');setRequests(d.requests||[])}
 }
 useEffect(()=>{void load()},[]);
 async function request(){
  if(mode==='code'&&!code.trim())return;if(mode==='email'&&!email.trim())return;setBusy(true);setStatus('');
  const r=await fetch('/api/existing-partner',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'REQUEST',campaignSlug,partnerCode:mode==='code'?code.trim().toUpperCase():undefined,partnerEmail:mode==='email'?email.trim().toLowerCase():undefined})});
  const d=await r.json();setBusy(false);
  if(!r.ok){setStatus(d.error||'Unable to send request.');return}
  setStatus('Request sent. Your partner just needs to accept it.');setCode('');setEmail('');await load();
 }
 async function respond(id:string,accept:boolean){
  setBusy(true);setStatus('');
  const r=await fetch('/api/existing-partner',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'RESPOND',requestId:id,accept})});
  const d=await r.json();setBusy(false);
  if(!r.ok){setStatus(d.error||'Unable to respond.');return}
  setStatus(accept?'Pair connected. Refreshing…':'Request declined.');await load();
  if(accept)window.location.reload();
 }
 const related=requests.filter(r=>one(r.campaigns)?.slug===campaignSlug);
 const inviteUrl=typeof window!=='undefined'&&mine?`${window.location.origin}/join?campaign=${encodeURIComponent(campaignSlug)}&partnerCode=${encodeURIComponent(mine)}`:'';
 const inviteMessage=inviteUrl?`Join me on PairVoice for ${campaignName}. Your partner code is already filled in — just open this link and continue: ${inviteUrl}`:'';
 function shareBy(kind:'sms'|'email'|'native'){
  if(!inviteUrl)return;
  if(kind==='sms'){window.location.href=`sms:?&body=${encodeURIComponent(inviteMessage)}`;return}
  if(kind==='email'){window.location.href=`mailto:?subject=${encodeURIComponent('Join me on PairVoice')}&body=${encodeURIComponent(inviteMessage)}`;return}
  if(navigator.share){void navigator.share({title:'Join me on PairVoice',text:`Join me on PairVoice for ${campaignName}. Your partner code is already filled in.`,url:inviteUrl});return}
  void navigator.clipboard.writeText(inviteMessage);setCopied(true);setTimeout(()=>setCopied(false),1600);
 }
 return <article className="opportunityCard">
  <small>CONNECT AN EXISTING USER</small><h3>{campaignName}</h3>
  <p>Connect with someone who already has PairVoice. Use their code or the email on their account.</p>
  <div className="myPairCode"><small>YOUR PAIRVOICE CODE</small><strong>{mine||'…'}</strong><div className="pairShareActions"><button type="button" disabled={!mine} onClick={async()=>{if(!mine)return;await navigator.clipboard.writeText(mine);setCopied(true);setTimeout(()=>setCopied(false),1600)}}>{copied?'Copied ✓':'Copy code'}</button><button type="button" disabled={!mine} onClick={()=>shareBy('native')}>Share ↗</button></div><div className="pairQuickShare"><button type="button" disabled={!mine} onClick={()=>shareBy('sms')}>Text it</button><button type="button" disabled={!mine} onClick={()=>shareBy('email')}>Email it</button></div><p>Your partner opens the link with your code already filled in. They just continue.</p></div>
  <div className="partnerLookupTabs"><button type="button" className={mode==='code'?'active':''} onClick={()=>{setMode('code');setStatus('')}}>Use partner code</button><button type="button" className={mode==='email'?'active':''} onClick={()=>{setMode('email');setStatus('')}}>Find by email</button></div>
  {mode==='code'?<label>Partner’s code<input value={code} onChange={e=>setCode(e.target.value)} placeholder="ABC1234567" autoCapitalize="characters" autoComplete="off"/></label>:<label>Partner’s PairVoice email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="partner@email.com" autoComplete="email"/></label>}
  <button type="button" onClick={request} disabled={busy||(mode==='code'?!code.trim():!email.trim())}>{busy?'Connecting…':'Connect my partner →'}</button>
  {related.map(r=>{
   const requester=one(r.requester),target=one(r.target),incoming=r.target_participant_id!==undefined&&target?.public_code===mine;
   return <div key={r.id} style={{marginTop:14,paddingTop:14,borderTop:'1px solid #30403a'}}>
    <p>{incoming?<><strong>{requester?.first_name||'A PairVoice user'}</strong> wants to connect with you for this gig.</>:<>Waiting for <strong>{target?.first_name||'your partner'}</strong> to accept.</>}</p>
    {incoming&&<div style={{display:'flex',gap:8}}><button type="button" disabled={busy} onClick={()=>respond(r.id,true)}>Accept</button><button type="button" disabled={busy} onClick={()=>respond(r.id,false)}>Decline</button></div>}
   </div>
  })}
  {status&&<p role="status">{status}</p>}
 </article>;
}
