import {redirect} from 'next/navigation';
import {sessionClient} from '../../lib/supabase-server';
import WalletActions from '../../components/WalletActions';

const money=(cents:number,currency:string)=>new Intl.NumberFormat('en-US',{style:'currency',currency}).format(cents/100);

export default async function WalletPage(){
 const auth=await sessionClient(),{data}=await auth.auth.getUser();
 if(!data.user)redirect('/?signin=1');
 const db=auth;
 const {data:p}=await db.from('participants').select('id,first_name').eq('auth_user_id',data.user.id).maybeSingle();
 if(!p)redirect('/?auth=join-first');
 const [{data:ledger},{data:payouts},{data:methods}]=await Promise.all([
  db.from('ledger_entries').select('id,entry_type,amount_cents,currency,created_at').eq('participant_id',p.id).order('created_at',{ascending:false}).limit(20),
  db.from('payouts').select('id,amount_cents,currency,state,provider,created_at').eq('participant_id',p.id).order('created_at',{ascending:false}).limit(10),
  db.from('participant_payout_methods').select('id,provider,label,status,is_default').eq('participant_id',p.id).neq('status','DISABLED').order('created_at',{ascending:false})
 ]);
 const currencies=[...new Set((ledger||[]).map(x=>x.currency))],currency=currencies[0]||'USD';
 const {data:available}=await db.rpc('participant_available_balance',{p_participant_id:p.id,p_currency:currency});
 const availableCents=Number(available||0);
 const totalEarned=(ledger||[]).filter(x=>x.amount_cents>0).reduce((s,x)=>s+x.amount_cents,0);
 const paid=(payouts||[]).filter(x=>x.state==='PAID').reduce((s,x)=>s+x.amount_cents,0);
 const latestLedger=(ledger||[]).slice(0,3),latestPayout=(payouts||[])[0];
 return <main className="walletApp">
  <header className="walletTop"><a href="/dashboard" aria-label="Back to dashboard">←</a><div className="logo">PAIR<span>VOICE</span></div><span>WALLET</span></header>
  <section className="walletBalance"><small>AVAILABLE TO PAY OUT</small><strong>{money(availableCents,currency)}</strong><p>{availableCents>0?'Your approved money is ready.':'Complete approved gigs and your earnings will show here.'}</p></section>
  <section className="walletMiniStats"><div><small>EARNED</small><strong>{money(totalEarned,currency)}</strong></div><div><small>PAID</small><strong>{money(paid,currency)}</strong></div></section>
  <WalletActions availableCents={availableCents} currency={currency} methods={methods||[]}/>
  <details className="walletDetails"><summary>Recent activity <span>View</span></summary>
   <div className="walletActivity">{latestLedger.length?latestLedger.map(x=><div key={x.id}><span>{x.entry_type.replaceAll('_',' ')}</span><strong>{money(x.amount_cents,x.currency)}</strong></div>):<p>No earnings yet.</p>}</div>
   {latestPayout&&<p className="walletLatestPayout">Latest payout: {money(latestPayout.amount_cents,latestPayout.currency)} · {latestPayout.state}</p>}
  </details>
 </main>;
}
