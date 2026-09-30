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
 const[code,setCode]=useState(''),[mine,setMine]=useState(''),[requests,setRequests]=useState<RequestRow[]>([]),[status,setStatus]=useState(''),[busy,setBusy]=useState(false);
 async function load(){
  const r=await fetch('/api/existing-partner',{cache:'no-store'}),d=await r.json();
  if(r.ok){setMine(d.participantCode||'');setRequests(d.requests||[])}
 }
 useEffect(()=>{void load()},[]);
 async function request(){
  if(!code.trim())return;setBusy(true);setStatus('');
  const r=await fetch('/api/existing-partner',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'REQUEST',campaignSlug,partnerCode:code.trim().toUpperCase()})});
  const d=await r.json();setBusy(false);
  if(!r.ok){setStatus(d.error||'Unable to send request.');return}
  setStatus('Partner request sent. They need to accept it from their PairVoice account.');setCode('');await load();
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
 return <article className="opportunityCard">
  <small>CONNECT AN EXISTING USER</small><h3>{campaignName}</h3>
  <p>If your partner already has PairVoice and already joined this same gig, use their PairVoice code. Both accounts and campaign history stay intact.</p>
  <p><strong>Your code:</strong> <code>{mine||'…'}</code></p>
  <label>Partner’s PairVoice code<input value={code} onChange={e=>setCode(e.target.value)} placeholder="ABC1234567" autoCapitalize="characters"/></label>
  <button type="button" onClick={request} disabled={busy||!code.trim()}>{busy?'Saving…':'Send connection request →'}</button>
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
