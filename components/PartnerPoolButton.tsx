'use client';
import {useState} from 'react';
export default function PartnerPoolButton(){
 const[status,setStatus]=useState<'idle'|'loading'|'waiting'|'error'>('idle');
 async function join(){
  setStatus('loading');
  const r=await fetch('/api/partner-pool',{method:'POST',headers:{'content-type':'application/json'},body:'{}'});
  setStatus(r.ok?'waiting':'error');
 }
 if(status==='waiting')return <p>✓ You’re in the Partner Pool. We’ll look for a compatible participant.</p>;
 return <button onClick={join} disabled={status==='loading'}>{status==='loading'?'Finding…':'Find my partner →'}</button>;
}
