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
 const nextAction=pendingPairs.length?'Connect your partner':workPairs.length?'Continue your active gig':!pool?'Find a partner':'Matching is active';
 const nextCopy=pendingPairs.length?'One connection unlocks the next step. If your partner already has PairVoice, connect them below.':workPairs.length?'Your gig is ready. Continue where you left off.':!pool?'PairVoice can look for a compatible partner for you. One tap starts matching.':'You’re in the Partner Pool. We’ll keep looking while you do other things.';
 const step2Done=!pendingPairs.length&&(Boolean(pool)||workPairs.length>0);
 return <main className="appDashboard">
  <header className="appTopbar"><div className="logo">PAIR<span>VOICE</span></div><a className="walletPill" href="/wallet">Wallet →</a></header>
  <section className="appHero">
   <p className="eyebrow">YOUR NEXT MOVE</p>
   <h1>Hi {p.first_name}.</h1>
   <div className="appSteps" aria-label="PairVoice progress"><span className="done">1 Account ✓</span><span className={step2Done?'done':'active'}>2 Partner{step2Done?' ✓':''}</span><span className={workPairs.length?'active':''}>3 Work</span></div>
  </section>
  <section className="nextActionCard">
   <small>DO THIS NOW</small><h2>{nextAction}</h2><p>{nextCopy}</p>
   {!pool&&<PartnerPoolButton/>}
   {pool?.status==='WAITING'&&<div className="matchActive">✓ Matching is on</div>}
   {pendingPairs.length>0&&<a className="secondaryAction" href="#existing-partner">My partner already has PairVoice ↓</a>}
  </section>
  <section className="appQuickStats">
   <a href="/wallet"><small>WALLET</small><strong>Open earnings</strong></a>
   <div><small>JOBS</small><strong>{approvedJobs||0} approved</strong></div>
   <div><small>REFERRALS</small><strong>{referrals||0}</strong></div>
  </section>
  <details className="appDetails">
   <summary>Account details</summary>
   <div className="compactDetails"><span>{p.primary_language_code.toUpperCase()} · {p.country_code}</span><span>{p.phone_verified_at?'Phone verified ✓':'Phone verified only when required'}</span><span>{pool?.status==='WAITING'?'Partner matching active':pool?.status||'Partner not connected'}</span></div>
  </details>
  {(allActivePairs||[]).length>0&&<section style={{marginTop:36}}><p className="eyebrow">CAMPAIGN CONSENT</p><h2>Review before recording</h2><div className="opportunityGrid">{(allActivePairs||[]).map((pair:any)=>{const campaign=Array.isArray(pair.campaigns)?pair.campaigns[0]:pair.campaigns;return campaign?.slug?<CampaignConsentCard key={'consent-'+pair.id} campaignSlug={campaign.slug} campaignName={campaign.name||'PairVoice opportunity'}/>:null})}</div></section>}
  {pendingPairs.length>0&&<section id="existing-partner" className="taskSection"><p className="eyebrow">ALREADY HAVE A PARTNER?</p><h2>Connect in seconds.</h2><div className="opportunityGrid">{pendingPairs.map((pair:any)=>{const campaign=Array.isArray(pair.campaigns)?pair.campaigns[0]:pair.campaigns;return campaign?.slug?<ExistingPartnerLink key={pair.id} campaignSlug={campaign.slug} campaignName={campaign.name||'PairVoice opportunity'}/>:null})}</div></section>}
  {workPairs.length>0&&<section style={{marginTop:36}}><p className="eyebrow">ACTIVE WORK</p><h2>Ready jobs</h2><div className="opportunityGrid">{workPairs.map((pair:any)=>{const campaign=Array.isArray(pair.campaigns)?pair.campaigns[0]:pair.campaigns;return <WorkAccessCard key={pair.id} pairId={pair.id} pairCode={pair.public_code} state={pair.state} campaignName={campaign?.name||'PairVoice opportunity'}/>})}</div></section>}
  <p className="appFinePrint">Your PairVoice account, partner history and progress stay with you across gigs.</p>
 </main>;
}
