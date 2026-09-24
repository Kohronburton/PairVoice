import {redirect} from 'next/navigation';
import {sessionClient} from '../../lib/supabase-server';
import PartnerPoolButton from '../../components/PartnerPoolButton';
import WorkAccessCard from '../../components/WorkAccessCard';
import ExistingPartnerLink from '../../components/ExistingPartnerLink';
import CampaignConsentCard from '../../components/CampaignConsentCard';

export default async function Dashboard(){
 const auth=await sessionClient(),{data}=await auth.auth.getUser();
 if(!data.user)redirect('/?signin=1');
 const db=auth;
 const {data:p}=await db.from('participants').select('id,first_name,email,country_code,primary_language_code,phone,phone_verified_at').eq('auth_user_id',data.user.id).maybeSingle();
 if(!p)redirect('/?auth=join-first');
 const [{data:pool},{count:approvedJobs},{count:referrals}]=await Promise.all([
  db.from('partner_pool').select('status').eq('participant_id',p.id).maybeSingle(),
  db.from('pair_members').select('pair_id,pairs!inner(state)',{count:'exact',head:true}).eq('pairs.state','APPROVED'),
  db.from('referral_relationships').select('id',{count:'exact',head:true}).eq('referrer_participant_id',p.id)
 ]);
 const {data:enrollments}=await db.from('campaign_enrollments').select('id').eq('participant_id',p.id);
 const enrollmentIds=(enrollments||[]).map(e=>e.id);
 const {data:members}=enrollmentIds.length?await db.from('pair_members').select('pair_id').in('enrollment_id',enrollmentIds).eq('active',true):{data:[] as {pair_id:string}[]};
 const pairIds=[...new Set((members||[]).map(m=>m.pair_id))];
 const {data:allActivePairs}=pairIds.length?await db.from('pairs').select('id,public_code,state,campaigns(name,slug)').in('id',pairIds):{data:[] as any[]};
 const workPairs=(allActivePairs||[]).filter((pair:any)=>['READY','RECORDING','REWORK_REQUIRED','SUBMITTED'].includes(pair.state));
 const pendingPairs=(allActivePairs||[]).filter((pair:any)=>pair.state==='PARTNER_PENDING');
 const nextAction=pendingPairs.length?'Connect your partner':workPairs.length?'Continue your active job':!pool?'Find a partner':'You are ready for matching';
 return <main style={{maxWidth:760,margin:'0 auto',padding:'32px 20px'}}>
  <div className="logo">PAIR<span>VOICE</span></div>
  <p className="eyebrow">YOUR PAIRVOICE</p>
  <h1>Hi {p.first_name}. <em>Here’s what’s next.</em></h1>
  <section className="card"><small>NEXT STEP</small><h2>{nextAction}</h2>
   {!pool&&<PartnerPoolButton/>}
   {pool?.status==='WAITING'&&<p>✓ You’re in the Partner Pool. We’ll match you with a compatible participant.</p>}
  </section>
  <p style={{margin:'18px 0 28px'}}><a className="primary" href="/wallet">Open Wallet →</a></p>
  <div className="opportunityGrid">
   <section className="opportunityCard"><small>PROFILE</small><h3>{p.primary_language_code.toUpperCase()} · {p.country_code}</h3><p>{p.phone_verified_at?'Phone verified ✓':'Phone verification is requested only when a campaign requires it.'}</p></section>
   <section className="opportunityCard"><small>PARTNER</small><h3>{pool?.status==='WAITING'?'Finding a match…':pool?.status||'Not connected'}</h3><p>Bring someone, connect an existing user, or let PairVoice find someone.</p></section>
   <section className="opportunityCard"><small>PROGRESS</small><h3>{approvedJobs||0} approved jobs</h3><p>{referrals||0} people referred · milestone rewards unlock only after qualification.</p></section>
  </div>
  {(allActivePairs||[]).length>0&&<section style={{marginTop:36}}><p className="eyebrow">CAMPAIGN CONSENT</p><h2>Review before recording</h2><div className="opportunityGrid">{(allActivePairs||[]).map((pair:any)=>{const campaign=Array.isArray(pair.campaigns)?pair.campaigns[0]:pair.campaigns;return campaign?.slug?<CampaignConsentCard key={'consent-'+pair.id} campaignSlug={campaign.slug} campaignName={campaign.name||'PairVoice opportunity'}/>:null})}</div></section>}
  {pendingPairs.length>0&&<section style={{marginTop:36}}><p className="eyebrow">YOUR PARTNER</p><h2>Already registered?</h2><div className="opportunityGrid">{pendingPairs.map((pair:any)=>{const campaign=Array.isArray(pair.campaigns)?pair.campaigns[0]:pair.campaigns;return campaign?.slug?<ExistingPartnerLink key={pair.id} campaignSlug={campaign.slug} campaignName={campaign.name||'PairVoice opportunity'}/>:null})}</div></section>}
  {workPairs.length>0&&<section style={{marginTop:36}}><p className="eyebrow">ACTIVE WORK</p><h2>Ready jobs</h2><div className="opportunityGrid">{workPairs.map((pair:any)=>{const campaign=Array.isArray(pair.campaigns)?pair.campaigns[0]:pair.campaigns;return <WorkAccessCard key={pair.id} pairId={pair.id} pairCode={pair.public_code} state={pair.state} campaignName={campaign?.name||'PairVoice opportunity'}/>})}</div></section>}
  <p style={{marginTop:28}}>Jobs and Wallet unlock as production opportunities become available. Your account, partner history and progress stay with you.</p>
 </main>;
}
