'use client';
import {useEffect,useState} from 'react';
type Doc={id:string;document_key:string;title:string;body_text:string;version:number};
export default function CampaignConsentCard({campaignSlug,campaignName}:{campaignSlug:string;campaignName:string}){
 const[docs,setDocs]=useState<Doc[]>([]),[accepted,setAccepted]=useState<string[]>([]),[complete,setComplete]=useState(false),[status,setStatus]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{void(async()=>{const r=await fetch('/api/consent?campaign='+encodeURIComponent(campaignSlug),{cache:'no-store'}),d=await r.json();if(r.ok){setDocs(d.documents||[]);setAccepted(d.acceptedDocumentIds||[]);setComplete(Boolean(d.complete))}})()},[campaignSlug]);
 async function acceptAll(){
  if(docs.length!==2)return;setBusy(true);setStatus('');
  const r=await fetch('/api/consent',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({campaignSlug,documentIds:docs.map(d=>d.id)})}),d=await r.json();setBusy(false);
  if(!r.ok){setStatus(d.error||'Unable to record acceptance.');return}
  setAccepted(docs.map(d=>d.id));setComplete(true);setStatus('Accepted. Your exact document versions are recorded.');
 }
 if(!docs.length)return <article className="opportunityCard"><small>CONSENT REQUIRED</small><h3>{campaignName}</h3><p>The required campaign terms and participant consent have not been published yet. Work cannot start until approved documents are available.</p></article>;
 return <article className="opportunityCard"><small>{complete?'CONSENT COMPLETE':'REVIEW BEFORE WORK'}</small><h3>{campaignName}</h3>
  {docs.map(d=><details key={d.id} style={{margin:'10px 0'}}><summary><strong>{d.title}</strong> · v{d.version}{accepted.includes(d.id)?' ✓':''}</summary><div style={{whiteSpace:'pre-wrap',marginTop:10}}>{d.body_text}</div></details>)}
  {!complete&&<><p>By selecting Accept, you confirm you reviewed both published documents shown above. This does not replace any separate consent required by the external recording provider.</p><button type="button" disabled={busy} onClick={acceptAll}>{busy?'Saving…':'Accept both documents →'}</button></>}
  {status&&<p role="status">{status}</p>}
 </article>;
}
