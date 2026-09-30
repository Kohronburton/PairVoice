import {redirect} from 'next/navigation';
import {sessionClient,serviceClient} from '../../lib/supabase-server';
import WalletActions from '../../components/WalletActions';

const money=(cents:number,currency:string)=>new Intl.NumberFormat('en-US',{style:'currency',currency}).format(cents/100);

export default async function WalletPage(){
 const auth=await sessionClient(),{data}=await auth.auth.getUser();
 if(!data.user)redirect('/?signin=1');
 const db=serviceClient();
 const {data:p}=await db.from('participants').select('id,first_name').eq('auth_user_id',data.user.id).maybeSingle();
 if(!p)redirect('/?auth=join-first');
 const [{data:ledger},{data:payouts},{data:methods}]=await Promise.all([
  db.from('ledger_entries').select('id,entry_type,amount_cents,currency,created_at,metadata').eq('participant_id',p.id).order('created_at',{ascending:false}).limit(100),
  db.from('payouts').select('id,amount_cents,currency,state,provider,created_at,updated_at').eq('participant_id',p.id).order('created_at',{ascending:false}).limit(50),
  db.from('participant_payout_methods').select('id,provider,label,status,is_default').eq('participant_id',p.id).neq('status','DISABLED').order('created_at',{ascending:false})
 ]);
 const currencies=[...new Set((ledger||[]).map(x=>x.currency))];
 const currency=currencies[0]||'USD';
 const {data:available}=await db.rpc('participant_available_balance',{p_participant_id:p.id,p_currency:currency});
 const availableCents=Number(available||0);
 const totalEarned=(ledger||[]).filter(x=>x.amount_cents>0).reduce((s,x)=>s+x.amount_cents,0);
 const paid=(payouts||[]).filter(x=>x.state==='PAID').reduce((s,x)=>s+x.amount_cents,0);
 return <main style={{maxWidth:860,margin:'0 auto',padding:'32px 20px'}}>
  <div className="logo">PAIR<span>VOICE</span></div>
  <p className="eyebrow">WALLET</p>
  <h1>Hi {p.first_name}. <em>Your earnings stay traceable.</em></h1>
  <div className="opportunityGrid">
   <article className="opportunityCard"><small>AVAILABLE</small><h3>{money(availableCents,currency)}</h3><p>Approved earnings not already reserved for an active payout.</p></article>
   <article className="opportunityCard"><small>TOTAL EARNED</small><h3>{money(totalEarned,currency)}</h3><p>Campaign and configured referral earnings recorded in your ledger.</p></article>
   <article className="opportunityCard"><small>PAID</small><h3>{money(paid,currency)}</h3><p>Payouts marked paid only after reconciliation.</p></article>
  </div>
  <WalletActions availableCents={availableCents} currency={currency} methods={methods||[]}/>
  <section style={{marginTop:36}}><p className="eyebrow">RECENT ACTIVITY</p><h2>Ledger</h2>
   {(ledger||[]).length?<div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse'}}><thead><tr><th style={{textAlign:'left'}}>Type</th><th style={{textAlign:'right'}}>Amount</th><th style={{textAlign:'right'}}>Date</th></tr></thead><tbody>
    {(ledger||[]).map(x=><tr key={x.id}><td style={{padding:'10px 0',borderTop:'1px solid #30403a'}}>{x.entry_type.replaceAll('_',' ')}</td><td style={{padding:'10px 0',borderTop:'1px solid #30403a',textAlign:'right'}}>{money(x.amount_cents,x.currency)}</td><td style={{padding:'10px 0',borderTop:'1px solid #30403a',textAlign:'right'}}>{new Date(x.created_at).toLocaleDateString()}</td></tr>)}
   </tbody></table></div>:<p>No earnings yet. Approved work will appear here.</p>}
  </section>
  <section style={{marginTop:36}}><p className="eyebrow">PAYOUT STATUS</p>
   {(payouts||[]).length?(payouts||[]).map(x=><article className="opportunityCard" key={x.id} style={{marginTop:10,minHeight:0}}><small>{x.state}</small><h3>{money(x.amount_cents,x.currency)}</h3><p>{x.provider||'PairVoice payout'} · requested {new Date(x.created_at).toLocaleDateString()}</p></article>):<p>No payout requests yet.</p>}
  </section>
  <p style={{marginTop:28}}><a className="primary" href="/dashboard">← Back to dashboard</a></p>
 </main>;
}
