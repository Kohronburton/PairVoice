'use client';
import {useState} from 'react';
import {trackFunnelEvent} from '../lib/funnel';

export default function PartnerPoolButton(){
 const[status,setStatus]=useState<'idle'|'loading'|'waiting'|'error'>('idle');
 async function join(){
  setStatus('loading');
  trackFunnelEvent('partner_choice_need_match');
  trackFunnelEvent('partner_matching_requested');
  const r=await fetch('/api/partner-pool',{method:'POST',headers:{'content-type':'application/json'},body:'{}'});
  if(r.ok){
   setStatus('waiting');
   const d=await r.json().catch(()=>({}));
   trackFunnelEvent('partner_matching_joined',{match_available:Boolean(d.matchAvailable)});
  }else{
   setStatus('error');
  }
 }
 if(status==='waiting')return <p>✓ You’re in the Partner Pool. We’ll look for a compatible participant.</p>;
 return <button onClick={join} disabled={status==='loading'}>{status==='loading'?'Finding…':'Find my partner →'}</button>;
}
