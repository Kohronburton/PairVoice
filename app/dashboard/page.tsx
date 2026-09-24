import {redirect} from 'next/navigation';
import {sessionClient,serviceClient} from '../../lib/supabase-server';
import PartnerPoolButton from '../../components/PartnerPoolButton';

export default async function Dashboard(){
 const auth=await sessionClient(),{data}=await auth.auth.getUser();
 if(!data.user)redirect('/?signin=1');
 const db=serviceClient();
 const {data:p}=await db.from('participants').select('id,first_name,email,country_code,primary_language_code,phone,phone_verified_at').eq('auth_user_id',data.user.id).maybeSingle();
 if(!p)redirect('/?auth=join-first');
 const [{data:pool},{count:approvedJobs},{count:referrals}]=await Promise.all([
  db.from('partner_pool').select('status').eq('participant_id',p.id).maybeSingle(),
  db.from('pair_members').select('pair_id,pairs!inner(state)',{count:'exact',head:true}).eq('pairs.state','APPROVED'),
  db.from('referral_relationships').select('id',{count:'exact',head:true}).eq('referrer_participant_id',p.id)
 ]);
 const nextAction=!p.phone_verified_at?'Verify your phone':!pool?'Find a partner':'You are ready for matching';
 return <main style={{maxWidth:760,margin:'0 auto',padding:'32px 20px'}}>
  <div className="logo">PAIR<span>VOICE</span></div>
  <p className="eyebrow">YOUR PAIRVOICE</p>
  <h1>Hi {p.first_name}. <em>Here’s what’s next.</em></h1>
  <section className="card"><small>NEXT STEP</small><h2>{nextAction}</h2>
   {!pool&&<PartnerPoolButton/>}
   {pool?.status==='WAITING'&&<p>✓ You’re in the Partner Pool. We’ll match you with a compatible participant.</p>}
  </section>
  <div className="opportunityGrid">
   <section className="opportunityCard"><small>PROFILE</small><h3>{p.primary_language_code.toUpperCase()} · {p.country_code}</h3><p>{p.phone_verified_at?'Phone verified ✓':'Phone verification needed'}</p></section>
   <section className="opportunityCard"><small>PARTNER</small><h3>{pool?.status==='WAITING'?'Finding a match…':pool?.status||'Not connected'}</h3><p>Bring someone, connect an existing user, or let PairVoice find someone.</p></section>
   <section className="opportunityCard"><small>PROGRESS</small><h3>{approvedJobs||0} approved jobs</h3><p>{referrals||0} people referred · milestone rewards unlock only after qualification.</p></section>
  </div>
  <p style={{marginTop:28}}>Jobs and Wallet unlock as production opportunities become available. Your account, partner history and progress stay with you.</p>
 </main>;
}
