import {redirect} from 'next/navigation';
import {requireAdmin} from '../../../lib/admin-server';

const title=(s:string)=>s.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase());

export default async function OperationsPage(){
 const admin=await requireAdmin();
 if(!admin)redirect('/?signin=1');
 const db=admin.db;
 const [pairsQ,payoutsQ,attemptsQ,controlsQ,outboxQ]=await Promise.all([
  db.from('pairs').select('id,public_code,state,updated_at,campaigns(name)').in('state',['SUBMITTED','INTERNAL_QA','CLIENT_QA','REWORK_REQUIRED']).order('updated_at',{ascending:true}).limit(50),
  db.from('payouts').select('id,participant_id,amount_cents,currency,state,provider,external_reference,failure_reason,created_at,updated_at').in('state',['REQUESTED','PROCESSING','FAILED']).order('created_at',{ascending:true}).limit(50),
  db.from('provider_payout_attempts').select('id,payout_id,provider,state,provider_reference,last_error,created_at,updated_at').in('state',['PROCESSING','UNKNOWN','MANUAL_REVIEW','FAILED']).order('created_at',{ascending:true}).limit(50),
  db.from('subsystem_controls').select('subsystem,enabled,reason,updated_at').order('subsystem'),
  db.from('outbox_events').select('id,event_type,status,attempts,last_error,next_attempt_at,created_at,payload').in('status',['FAILED','DEAD_LETTER']).order('created_at',{ascending:true}).limit(50)
 ]);
 const errors=[pairsQ.error,payoutsQ.error,attemptsQ.error,controlsQ.error,outboxQ.error].filter(Boolean);
 if(errors.length)console.error(errors);

 return <main style={{maxWidth:1200,margin:'0 auto',padding:'32px 20px'}}>
  <div className="logo">PAIR<span>VOICE</span></div>
  <p className="eyebrow">ADMIN · OPERATIONS</p>
  <h1>Production <em>operations console.</em></h1>
  <p>Signed in as {admin.role}. This view is read-only by design; mutations remain behind role-protected, audited APIs.</p>

  <section style={{marginTop:30}}><h2>Subsystem controls</h2><div className="opportunityGrid">
   {(controlsQ.data||[]).map((c:any)=><article className="opportunityCard" key={c.subsystem}><small>{c.subsystem}</small><h3>{c.enabled?'Enabled':'PAUSED'}</h3><p>{c.reason||'No incident reason.'}</p><small>Updated {new Date(c.updated_at).toLocaleString()}</small></article>)}
  </div></section>

  <section style={{marginTop:36}}><h2>QA / rework queue</h2>
   {(pairsQ.data||[]).length?<div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse'}}><thead><tr><th>Pair</th><th>Campaign</th><th>State</th><th>Waiting since</th></tr></thead><tbody>
    {(pairsQ.data||[]).map((p:any)=>{const campaign=Array.isArray(p.campaigns)?p.campaigns[0]:p.campaigns;return <tr key={p.id}><td>{p.public_code}</td><td>{campaign?.name||'—'}</td><td>{title(p.state)}</td><td>{new Date(p.updated_at).toLocaleString()}</td></tr>})}
   </tbody></table></div>:<p>No pairs are waiting for QA or rework.</p>}
  </section>

  <section style={{marginTop:36}}><h2>Payout exceptions / in-flight</h2>
   {(payoutsQ.data||[]).length?<div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse'}}><thead><tr><th>State</th><th>Amount</th><th>Provider</th><th>Reference / error</th></tr></thead><tbody>
    {(payoutsQ.data||[]).map((p:any)=><tr key={p.id}><td>{title(p.state)}</td><td>{(p.amount_cents/100).toFixed(2)} {p.currency}</td><td>{p.provider||'—'}</td><td>{p.external_reference||p.failure_reason||'Awaiting action'}</td></tr>)}
   </tbody></table></div>:<p>No payouts require action.</p>}
   {(attemptsQ.data||[]).filter((a:any)=>['UNKNOWN','MANUAL_REVIEW'].includes(a.state)).length>0&&<p><strong>Attention:</strong> unknown/manual-review attempts must be reconciled before any retry.</p>}
  </section>

  <section style={{marginTop:36}}><h2>Messaging exceptions</h2>
   {(outboxQ.data||[]).length?<div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse'}}><thead><tr><th>Status</th><th>Event</th><th>Attempts</th><th>Error</th><th>Next retry</th></tr></thead><tbody>
    {(outboxQ.data||[]).map((e:any)=><tr key={e.id}><td>{e.status}</td><td>{e.event_type}</td><td>{e.attempts}</td><td>{e.last_error||'—'}</td><td>{e.next_attempt_at?new Date(e.next_attempt_at).toLocaleString():'—'}</td></tr>)}
   </tbody></table></div>:<p>No failed or dead-letter lifecycle messages.</p>}
  </section>
 </main>;
}
