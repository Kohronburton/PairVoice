import {redirect} from 'next/navigation';
import Link from 'next/link';
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
 const partnerPairs=(allActivePairs||[]).filter((pair:any)=>['PARTNER_PENDING','PAIRED'].includes(pair.state));
 const nextAction=pendingPairs.length?'Connect your partner':workPairs.length?'Continue your active gig':!pool?'Find a partner':'Matching is active';
 const nextCopy=pendingPairs.length?'One connection unlocks the next step. If your partner already has PairVoice, connect them below.':workPairs.length?'Your gig is ready. Continue where you left off.':!pool?'PairVoice can look for a compatible partner for you. One tap starts matching.':'You’re in the Partner Pool. We’ll keep looking while you do other things.';
 const hasConnectedPair=(allActivePairs||[]).some((pair:any)=>['PAIRED','READY','RECORDING','REWORK_REQUIRED','SUBMITTED','APPROVED'].includes(pair.state));
 const step2Done=hasConnectedPair;
 return <main className="appDashboard">
  <header className="appTopbar"><div className="logo">PAIR<span>VOICE</span></div><Link className="walletPill" href="/wallet" prefetch>Wallet →</Link></header>
  <section className="appHero">
   <p className="eyebrow">YOUR PAIRVOICE</p>
   <h1>Hi {p.first_name}.</h1>
   <p className="appPromise">Get paired. Complete the gig. Get paid.</p>
   <div className="appSteps" aria-label="PairVoice progress"><span className="done">1 Joined ✓</span><span className={step2Done?'done':'active'}>2 Partner{step2Done?' ✓':''}</span><span className={workPairs.length?'active':''}>3 Get paid</span></div>
  </section>
  <section className="nextActionCard">
   <small>NEXT STEP</small><h2>{nextAction}</h2><p>{nextCopy}</p>
   {!pool&&<PartnerPoolButton/>}
   {pool?.status==='WAITING'&&<div className="matchActive">✓ Matching is on</div>}
   {partnerPairs.length>0&&<a className="primaryActionLink" href="#existing-partner">Connect or invite my partner →</a>}
   {workPairs.length>0&&<a className="primaryActionLink" href="#active-work">Continue my gig →</a>}
  </section>
  {partnerPairs.length>0&&<section id="existing-partner" className="taskSection taskSectionPriority"><div className="opportunityGrid">{partnerPairs.map((pair:any)=>{const campaign=Array.isArray(pair.campaigns)?pair.campaigns[0]:pair.campaigns;return campaign?.slug?<ExistingPartnerLink key={pair.id} campaignSlug={campaign.slug} campaignName={campaign.name||'PairVoice opportunity'}/>:null})}</div></section>}
  {workPairs.length>0&&<section id="active-work" className="taskSection taskSectionPriority"><div className="opportunityGrid">{workPairs.map((pair:any)=>{const campaign=Array.isArray(pair.campaigns)?pair.campaigns[0]:pair.campaigns;return <WorkAccessCard key={pair.id} pairId={pair.id} pairCode={pair.public_code} state={pair.state} campaignName={campaign?.name||'PairVoice opportunity'}/>})}</div></section>}
  <p className="appFinePrint">Your PairVoice account, partner history and progress stay with you across gigs.</p>
 </main>;
}
