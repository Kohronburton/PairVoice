'use client';
import {FormEvent,useEffect,useState} from 'react';

type Campaign={campaignKey:string;leads:number;customers:number;spendCents:number;cplCents:number|null;cacCents:number|null;conversionRate:number|null};
type Break={market?:string;language?:string;count:number};
type Stats={leads:number;customers:number;target:number;progress:number;totalSpendCents:number;cplCents:number|null;cacCents:number|null;leadConversionRate:number|null;totalClicks:number;totalImpressions:number;ctr:number|null;cpcCents:number|null;campaigns:Campaign[];markets:Break[];languages:Break[]};
type ExternalAccess={provider:string;invitationCode:string;revealState:string;updatedAt:string|null};
type ExternalAccessResponse={campaign:{slug:string;name:string};externalAccess:ExternalAccess|null;error?:string};

const money=(c:number|null)=>c==null?'—':'$'+(c/100).toFixed(2);

export default function Admin(){
 const[s,setS]=useState<Stats|null>(null);
 const[provider,setProvider]=useState('FUNCROWD');
 const[invitationCode,setInvitationCode]=useState('');
 const[revealState,setRevealState]=useState('FUNCROWD_SETUP');
 const[showCode,setShowCode]=useState(false);
 const[saveState,setSaveState]=useState<'idle'|'saving'|'saved'|'error'>('idle');
 const[saveMessage,setSaveMessage]=useState('');

 useEffect(()=>{
  fetch('/api/admin/stats').then(r=>r.json()).then(setS);
  fetch('/api/admin/campaigns/es-spain-v1/external-access')
   .then(async r=>({ok:r.ok,body:await r.json() as ExternalAccessResponse}))
   .then(({ok,body})=>{
    if(!ok)throw new Error(body.error||'Unable to load external access settings.');
    if(body.externalAccess){
     setProvider(body.externalAccess.provider);
     setInvitationCode(body.externalAccess.invitationCode);
     setRevealState(body.externalAccess.revealState);
    }
   })
   .catch(e=>{setSaveState('error');setSaveMessage(e instanceof Error?e.message:'Unable to load external access settings.');});
 },[]);

 async function saveExternalAccess(e:FormEvent){
  e.preventDefault();
  setSaveState('saving');setSaveMessage('');
  try{
   const res=await fetch('/api/admin/campaigns/es-spain-v1/external-access',{
    method:'PATCH',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({provider,invitationCode,revealState})
   });
   const body=await res.json();
   if(!res.ok)throw new Error(body.error||'Unable to save.');
   setProvider(body.externalAccess.provider);
   setInvitationCode(body.externalAccess.invitationCode);
   setRevealState(body.externalAccess.revealState);
   setSaveState('saved');setSaveMessage('Spain campaign access updated.');
  }catch(e){
   setSaveState('error');setSaveMessage(e instanceof Error?e.message:'Unable to save.');
  }
 }

 return <main className="admin">
  <div className="logo">PAIR<span>VOICE</span> <small>GROWTH</small></div>
  <h1>20,000 Lead Mission</h1>
  {!s?<p>Loading…</p>:<>
   <div className="meter"><i style={{width:Math.min(s.progress,100)+'%'}}/></div>
   <strong className="progress">{s.leads.toLocaleString()} / {s.target.toLocaleString()} <em>{s.progress}%</em></strong>
   <div className="stats">
    <article><b>{s.leads.toLocaleString()}</b><span>Email leads</span></article>
    <article><b>{money(s.cplCents)}</b><span>Cost per lead (CPL)</span></article>
    <article><b>{money(s.cacCents)}</b><span>Customer acquisition cost (CAC)</span></article>
    <article><b>{money(s.totalSpendCents)}</b><span>Total acquisition spend</span></article>
    <article><b>{s.customers.toLocaleString()}</b><span>Converted customers</span></article>
    <article><b>{s.leadConversionRate==null?'—':s.leadConversionRate+'%'}</b><span>Lead → customer</span></article>
    <article><b>{s.ctr==null?'—':s.ctr+'%'}</b><span>Ad CTR</span></article>
    <article><b>{money(s.cpcCents)}</b><span>Cost per click</span></article>
   </div>
   <h2>Markets</h2>
   <div className="stats">{s.markets.map((m:any)=><article key={m.market}><b>{m.count}</b><span>{m.market}</span></article>)}</div>
   <h2>Languages</h2>
   <div className="stats">{s.languages.map((l:any)=><article key={l.language}><b>{l.count}</b><span>{l.language}</span></article>)}</div>
   <h2>Campaign KPIs</h2>
   <div className="stats">{s.campaigns.map(c=><article key={c.campaignKey}><strong>{c.campaignKey}</strong><span>{c.leads} leads · CPL {money(c.cplCents)} · CAC {money(c.cacCents)} · {c.conversionRate==null?'—':c.conversionRate+'%'} converted</span></article>)}</div>
  </>}

  <h2>Spain external recording access</h2>
  <form onSubmit={saveExternalAccess} style={{display:'grid',gap:12,maxWidth:620}}>
   <label>Provider
    <input value={provider} onChange={e=>setProvider(e.target.value)} autoComplete="off" style={{display:'block',width:'100%',padding:10,marginTop:4}}/>
   </label>
   <label>Campaign invitation code
    <div style={{display:'flex',gap:8,marginTop:4}}>
     <input type={showCode?'text':'password'} value={invitationCode} onChange={e=>setInvitationCode(e.target.value)} autoComplete="off" style={{flex:1,padding:10}}/>
     <button type="button" onClick={()=>setShowCode(v=>!v)}>{showCode?'Hide':'Show'}</button>
    </div>
   </label>
   <label>Reveal at workflow state
    <select value={revealState} onChange={e=>setRevealState(e.target.value)} style={{display:'block',width:'100%',padding:10,marginTop:4}}>
     <option value="FUNCROWD_SETUP">FUNCROWD_SETUP</option>
     <option value="FUNCROWD_TEST">FUNCROWD_TEST</option>
     <option value="READY">READY</option>
    </select>
   </label>
   <p style={{margin:0}}>This is the shared external provider code for the Spain campaign. PairVoice pair invite codes remain unique and separate.</p>
   <div style={{display:'flex',gap:12,alignItems:'center'}}>
    <button type="submit" disabled={saveState==='saving'}>{saveState==='saving'?'Saving…':'Save campaign access'}</button>
    {saveMessage&&<span>{saveMessage}</span>}
   </div>
  </form>
 </main>
}
