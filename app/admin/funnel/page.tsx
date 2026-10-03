import {redirect} from 'next/navigation';
import {requireAdmin} from '../../../lib/admin-server';

const clientStages=['landing_view','campaign_view','signup_started','signup_completed','partner_invite_created','partner_matching_joined'] as const;
const businessStages=['partner_invite_accepted','pair_created','pair_qualified','gig_started','submission_completed','submission_approved','earning_available','payout_completed'] as const;

const label=(value:string)=>value.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase());

export default async function AdminFunnelPage(){
 const admin=await requireAdmin();
 if(!admin)redirect('/?signin=1');
 const since=new Date(Date.now()-30*86400000).toISOString();
 const [{data:client},{data:business}]=await Promise.all([
  admin.db.from('funnel_events').select('event_name,session_id,metadata').gte('created_at',since),
  admin.db.from('business_funnel_events').select('event_name').gte('occurred_at',since)
 ]);
 const clientRows=client||[],businessRows=business||[];
 const clientCounts=Object.fromEntries(clientStages.map(e=>[e,clientRows.filter(r=>r.event_name===e).length])) as Record<string,number>;
 const businessCounts=Object.fromEntries(businessStages.map(e=>[e,businessRows.filter(r=>r.event_name===e).length])) as Record<string,number>;
 const ratio=(n:number,d:number)=>d?((100*n/d).toFixed(1)+'%'):'—';
 const sources=new Map<string,{events:number;signups:number}>();
 for(const row of clientRows){
  const m=(row.metadata||{}) as Record<string,any>,ft=(m.first_touch||{}) as Record<string,any>;
  const source=String(ft.utm_source||ft.source||'direct');
  const item=sources.get(source)||{events:0,signups:0};item.events++;if(row.event_name==='signup_completed')item.signups++;sources.set(source,item);
 }
 const sourceRows=[...sources.entries()].map(([source,v])=>({source,...v})).sort((a,b)=>b.signups-a.signups||b.events-a.events).slice(0,10);

 return <main style={{maxWidth:1100,margin:'0 auto',padding:'32px 20px'}}>
  <div className="logo">PAIR<span>VOICE</span></div>
  <p className="eyebrow">ADMIN · GROWTH</p>
  <h1>30-day <em>funnel command center.</em></h1>
  <p>Role: {admin.role}. Anonymous acquisition telemetry is separated from authoritative PairVoice workflow milestones.</p>

  <section className="opportunityGrid" style={{marginTop:24}}>
   <article className="opportunityCard"><small>LANDING → SIGNUP</small><h3>{ratio(clientCounts.signup_completed||0,clientCounts.landing_view||0)}</h3><p>{clientCounts.signup_completed||0} completed signups</p></article>
   <article className="opportunityCard"><small>SIGNUP → PAIR</small><h3>{ratio(businessCounts.pair_created||0,clientCounts.signup_completed||0)}</h3><p>{businessCounts.pair_created||0} authoritative pairs</p></article>
   <article className="opportunityCard"><small>PAIR → SUBMISSION</small><h3>{ratio(businessCounts.submission_completed||0,businessCounts.pair_created||0)}</h3><p>{businessCounts.submission_completed||0} submissions</p></article>
   <article className="opportunityCard"><small>SUBMISSION → APPROVAL</small><h3>{ratio(businessCounts.submission_approved||0,businessCounts.submission_completed||0)}</h3><p>{businessCounts.submission_approved||0} approved pairs</p></article>
  </section>

  <section style={{marginTop:36}}>
   <h2>Acquisition events</h2>
   <div className="opportunityGrid">{clientStages.map(e=><article className="opportunityCard" key={e}><small>{label(e)}</small><h3>{clientCounts[e]||0}</h3></article>)}</div>
  </section>

  <section style={{marginTop:36}}>
   <h2>Authoritative workflow events</h2>
   <div className="opportunityGrid">{businessStages.map(e=><article className="opportunityCard" key={e}><small>{label(e)}</small><h3>{businessCounts[e]||0}</h3></article>)}</div>
  </section>

  <section style={{marginTop:36}}>
   <h2>Top first-touch sources</h2>
   {sourceRows.length?<div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse'}}>
    <thead><tr><th style={{textAlign:'left',padding:10}}>Source</th><th style={{textAlign:'right',padding:10}}>Events</th><th style={{textAlign:'right',padding:10}}>Signups</th></tr></thead>
    <tbody>{sourceRows.map(r=><tr key={r.source}><td style={{padding:10,borderTop:'1px solid #ddd'}}>{r.source}</td><td style={{padding:10,borderTop:'1px solid #ddd',textAlign:'right'}}>{r.events}</td><td style={{padding:10,borderTop:'1px solid #ddd',textAlign:'right'}}>{r.signups}</td></tr>)}</tbody>
   </table></div>:<p>No acquisition telemetry yet.</p>}
  </section>
 </main>;
}
