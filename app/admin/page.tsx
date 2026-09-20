'use client';
import {FormEvent,useEffect,useState} from 'react';

type GrowthCampaign={campaignKey:string;leads:number;customers:number;spendCents:number;cplCents:number|null;cacCents:number|null;conversionRate:number|null};
type Break={market?:string;language?:string;count:number};
type Stats={leads:number;customers:number;target:number;progress:number;totalSpendCents:number;cplCents:number|null;cacCents:number|null;leadConversionRate:number|null;totalClicks:number;totalImpressions:number;ctr:number|null;cpcCents:number|null;campaigns:GrowthCampaign[];markets:Break[];languages:Break[]};

type SourcePosting={
 id:string;platform:string;external_job_id:string;url:string;title:string;
 compensation_type:string;observed_rate_cents:number|null;observed_currency:string;
 observations:Array<{worker_display_name:string|null;observed_hours:number|null;hourly_rate_cents:number|null;observed_month:string|null}>;
};

type CatalogCampaign={
 id:string;slug:string;name:string;country_code:string;language_code:string;participant_count:number;
 session_count:number|null;session_minutes_min:number|null;session_minutes_max:number|null;device_requirement:string|null;
 provider:string|null;participant_payout_cents:number|null;payout_currency:string;payout_unit:string;
 client_base_revenue_cents:number|null;client_referral_revenue_cents:number|null;status:string;
 family:{name:string;recording_mode:string;requires_pair:boolean}|null;
 sourcePostings:SourcePosting[];
 access:{provider:string;invitation_code:string|null;reveal_state:string;updated_at:string}|null;
 enrollmentCounts:Record<string,number>;
 pairCounts:Record<string,number>;
};

const money=(c:number|null,currency='USD')=>c==null?'—':new Intl.NumberFormat('en-US',{style:'currency',currency,maximumFractionDigits:0}).format(c/100);

export default function Admin(){
 const[s,setS]=useState<Stats|null>(null);
 const[catalog,setCatalog]=useState<CatalogCampaign[]>([]);
 const[message,setMessage]=useState('');

 async function load(){
  const [statsRes,catalogRes]=await Promise.all([fetch('/api/admin/stats'),fetch('/api/admin/catalog')]);
  const [stats,catalogData]=await Promise.all([statsRes.json(),catalogRes.json()]);
  if(statsRes.ok)setS(stats);
  if(catalogRes.ok)setCatalog(catalogData.campaigns||[]);
 }

 useEffect(()=>{load()},[]);

 async function saveAccess(e:FormEvent<HTMLFormElement>,slug:string){
  e.preventDefault();setMessage('Saving…');
  const form=new FormData(e.currentTarget);
  const res=await fetch('/api/admin/campaigns/'+encodeURIComponent(slug)+'/access',{
   method:'PATCH',
   headers:{'content-type':'application/json'},
   body:JSON.stringify({
    provider:form.get('provider'),
    invitationCode:form.get('invitationCode'),
    revealState:form.get('revealState')
   })
  });
  const body=await res.json();
  setMessage(res.ok?'Campaign access saved.':body.error||'Unable to save.');
  if(res.ok)await load();
 }

 return <main className="admin">
  <div className="logo">PAIR<span>VOICE</span> <small>OPERATIONS</small></div>
  <h1>Campaign Control</h1>

  {!s?<p>Loading growth data…</p>:<>
   <div className="meter"><i style={{width:Math.min(s.progress,100)+'%'}}/></div>
   <strong className="progress">{s.leads.toLocaleString()} / {s.target.toLocaleString()} leads <em>{s.progress}%</em></strong>
   <div className="stats">
    <article><b>{s.leads.toLocaleString()}</b><span>Email leads</span></article>
    <article><b>{money(s.cplCents)}</b><span>Cost per lead</span></article>
    <article><b>{s.customers.toLocaleString()}</b><span>Converted participants</span></article>
    <article><b>{money(s.totalSpendCents)}</b><span>Acquisition spend</span></article>
   </div>
  </>}

  <h2>Job catalog</h2>
  {message&&<p className="codeStatus">{message}</p>}
  <div className="catalogList">
   {catalog.map(c=>{
    const clientTotal=(c.client_base_revenue_cents??0)+(c.client_referral_revenue_cents??0);
    const spread=c.participant_payout_cents!=null&&clientTotal>0?clientTotal-c.participant_payout_cents:null;
    return <article className="catalogRow" key={c.id}>
     <div className="catalogRowHead">
      <div>
       <h3>{c.name}</h3>
       <p>{c.family?.name||'Voice project'} · {c.country_code} · {c.language_code.toUpperCase()} · {c.status}</p>
      </div>
      <div className="codeStatus">{c.sourcePostings.length} source posting{c.sourcePostings.length===1?'':'s'}</div>
     </div>

     <div className="catalogPills">
      <span>{c.participant_count} participant{c.participant_count===1?'':'s'}</span>
      {c.session_count&&<span>{c.session_count} sessions</span>}
      {c.device_requirement&&<span>{c.device_requirement}</span>}
      {c.participant_payout_cents!=null&&<span>PairVoice payout {money(c.participant_payout_cents,c.payout_currency)} / {c.payout_unit.toLowerCase()}</span>}
      {clientTotal>0&&<span>Client revenue {money(clientTotal,c.payout_currency)}</span>}
      {spread!=null&&<span>Gross spread {money(spread,c.payout_currency)}</span>}
      <span>{Object.values(c.enrollmentCounts||{}).reduce((a,b)=>a+b,0)} enrollments</span>
      <span>{Object.values(c.pairCounts||{}).reduce((a,b)=>a+b,0)} pairs</span>
     </div>

     {c.sourcePostings.length>0&&<div className="sourceList">
      {c.sourcePostings.map(p=><div key={p.id}>
       <a href={p.url} target="_blank" rel="noreferrer">{p.platform} · {p.external_job_id} · {p.title}</a>
       <span className="muted"> {p.observed_rate_cents!=null?' · observed '+money(p.observed_rate_cents,p.observed_currency)+(p.compensation_type==='HOURLY'?' / hr':''):''}</span>
      </div>)}
     </div>}

     {(c.provider||c.access)&&<form onSubmit={e=>saveAccess(e,c.slug)} style={{marginTop:20,paddingTop:18,borderTop:'1px solid #26332f',display:'grid',gridTemplateColumns:'1fr 1fr 1fr auto',gap:8,alignItems:'end'}}>
      <label style={{margin:0}}>Provider<input name="provider" defaultValue={c.access?.provider||c.provider||''}/></label>
      <label style={{margin:0}}>Invitation code<input name="invitationCode" type="password" defaultValue={c.access?.invitation_code||''} autoComplete="off"/></label>
      <label style={{margin:0}}>Reveal state<select name="revealState" defaultValue={c.access?.reveal_state||'READY'}><option>PARTNER_PENDING</option><option>PAIRED</option><option>READY</option><option>IN_PROGRESS</option></select></label>
      <button type="submit" style={{width:'auto',margin:0}}>Save</button>
     </form>}
    </article>
   })}
  </div>
 </main>
}
