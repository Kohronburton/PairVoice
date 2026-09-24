'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';
import InviteShareButtons from '../../components/InviteShareButtons';
import {trackFunnelEvent} from '../../lib/funnel';
import {PairState,stateProgress} from '../../lib/workflow';
import {getBrowserSupabase} from '../../lib/supabase-browser';

type Job={
 enrollmentId:string;enrollmentState:string;campaignSlug:string;campaignName:string;countryCode:string;languageCode:string;
 pairCode:string|null;pairState:PairState|null;inviteCode:string|null;role:'A'|'B'|null;readinessCompleted:boolean;
 pairPayoutCents:number|null;participantPayoutCents:number|null;currency:string;sessionsRequired:number|null;
 targetMinutesMin:number|null;targetMinutesMax:number|null;rules:Record<string,unknown>;createdAt:string;
};
type Dashboard={
 ok:boolean;reason?:string;participant?:{participantCode:string;firstName:string;email:string;countryCode:string;languageCode:string;onboardingCompleted:boolean};
 jobs:Job[];ledgerBalanceCents?:number;
};

const money=(cents:number|null|undefined,currency='USD')=>cents==null?'—':new Intl.NumberFormat(undefined,{style:'currency',currency,maximumFractionDigits:2}).format(cents/100);

function nextAction(job:Job){
 switch(job.pairState){
  case 'PARTNER_PENDING':return {title:'Invite your partner',body:'This gig needs two people. Send your personal invite link to the person you want to record with.',tone:'action'};
  case 'PAIRED':case 'READINESS_PENDING':return job.readinessCompleted
   ?{title:'Waiting on your partner',body:'You completed the recording checklist. Your partner needs to confirm theirs next.',tone:'wait'}
   :{title:'Complete the recording checklist',body:'Confirm you have a quiet place, the required device, and time to follow the gig instructions.',tone:'action'};
  case 'READY':return {title:'Pair ready',body:'Both people are ready. PairVoice is preparing the recording access and final gig instructions.',tone:'wait'};
  case 'RECORDING':return {title:'Record the gig',body:'Follow the campaign instructions exactly, record in a quiet place, and complete every required session.',tone:'action'};
  case 'SUBMITTED':case 'INTERNAL_QA':case 'CLIENT_QA':return {title:'Work under review',body:'Your submission is in quality review. We’ll update this dashboard when the result changes.',tone:'wait'};
  case 'REWORK_REQUIRED':return {title:'Action required',body:'This gig needs a correction or re-recording. Follow the latest instructions before resubmitting.',tone:'action'};
  case 'APPROVED':case 'PAYABLE':return {title:'Approved for payout',body:'Your work passed review. Payout processing is the next step.',tone:'success'};
  case 'PAID':return {title:'Paid',body:'This gig is complete and paid.',tone:'success'};
  case 'PAYMENT_FAILED':return {title:'Payout needs attention',body:'The payout could not complete. PairVoice support will provide the next payment step.',tone:'action'};
  case 'REJECTED':return {title:'Gig closed',body:'This submission was not approved. Check any project-specific notice for details.',tone:'wait'};
  case 'ON_HOLD':return {title:'Temporarily on hold',body:'This gig is paused. No action is required until the status changes.',tone:'wait'};
  case 'CANCELLED':return {title:'Gig cancelled',body:'This enrollment is no longer active.',tone:'wait'};
  default:return {title:'Enrollment active',body:'Your PairVoice enrollment is active. We’ll show the next action here.',tone:'wait'};
 }
}

export default function DashboardPage(){
 const[data,setData]=useState<Dashboard|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[signedOut,setSignedOut]=useState(false),[readyPair,setReadyPair]=useState<string|null>(null);
 const load=useCallback(async()=>{
  setLoading(true);setError('');
  try{
   const supabase=getBrowserSupabase();
   const{data:auth}=await supabase.auth.getUser();
   if(!auth.user){setData(null);setLoading(false);return}
   const{data:claim,error:claimError}=await supabase.rpc('claim_participant_account');
   if(claimError)throw claimError;
   if(claim&&!claim.ok){setData({ok:false,reason:claim.reason,jobs:[]});setLoading(false);return}
   const{data:dash,error:dashError}=await supabase.rpc('get_my_dashboard');
   if(dashError)throw dashError;
   setData(dash as Dashboard);trackFunnelEvent('dashboard_view',{jobs:Array.isArray(dash?.jobs)?dash.jobs.length:0});
  }catch(err){setError(err instanceof Error?err.message:'Unable to load your PairVoice account.')}
  finally{setLoading(false)}
 },[]);

 useEffect(()=>{
  const supabase=getBrowserSupabase();
  void load();
  const{data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{if(session?.user)void load()});
  return()=>subscription.unsubscribe();
 },[load]);

 const jobs=useMemo(()=>data?.jobs||[],[data]);

 async function markReady(job:Job){
  if(!job.pairCode)return;
  setReadyPair(job.pairCode);setError('');trackFunnelEvent('readiness_started',{pair_code:job.pairCode,campaign_slug:job.campaignSlug});
  try{
   const supabase=getBrowserSupabase();
   const{error:rpcError}=await supabase.rpc('mark_my_pair_ready',{p_pair_code:job.pairCode});
   if(rpcError)throw rpcError;
   trackFunnelEvent('readiness_completed',{pair_code:job.pairCode,campaign_slug:job.campaignSlug});
   await load();
  }catch(err){setError(err instanceof Error?err.message:'Unable to save readiness.')}
  finally{setReadyPair(null)}
 }

 async function signOut(){
  const supabase=getBrowserSupabase();await supabase.auth.signOut();setData(null);setSignedOut(true);
 }

 if(loading)return <main className="flowPage"><nav><a className="logo logoLink" href="/">PAIR<span>VOICE</span></a></nav><section className="flowShell narrow"><div className="dashboardLoading">Loading your PairVoice dashboard…</div></section></main>;

 if(!data)return <main className="flowPage"><nav><a className="logo logoLink" href="/">PAIR<span>VOICE</span></a><a href="/join">Find a gig</a></nav><section className="flowShell narrow"><div className="eyebrow">PAIRVOICE ACCOUNT</div><h1>{signedOut?'You’re signed out.':'Open your work dashboard.'}</h1><p className="lead">Use the email you registered with to access your PairVoice gigs, partner status, recording steps, and payout progress.</p><a className="primary inlineCta" href="/login">Email me a sign-in link →</a></section></main>;

 if(!data.ok)return <main className="flowPage"><nav><a className="logo logoLink" href="/">PAIR<span>VOICE</span></a><button className="language" onClick={signOut}>Sign out</button></nav><section className="flowShell narrow"><div className="eyebrow">PAIRVOICE ACCOUNT</div><h1>No active participant profile yet.</h1><p className="lead">This email is signed in, but it has not enrolled in a PairVoice gig yet.</p><a className="primary inlineCta" href="/join">Choose a paid gig →</a></section></main>;

 return <main className="dashboardPage">
  <nav><a className="logo logoLink" href="/">PAIR<span>VOICE</span></a><div className="navright"><a href="/join">Find another gig</a><button className="language" onClick={signOut}>Sign out</button></div></nav>
  <section className="dashboardShell">
   <header className="dashboardHero"><div><div className="eyebrow">YOUR PAIRVOICE WORK</div><h1>Welcome back, {data.participant?.firstName}.</h1><p>One account for your active voice gigs, partner status, recording steps, and payout progress.</p></div><div className="accountChip"><span>PAIRVOICE ID</span><strong>{data.participant?.participantCode}</strong><small>{data.participant?.email}</small></div></header>
   {error&&<p className="error">{error}</p>}
   {!jobs.length?<div className="emptyDashboard"><h2>No gigs yet.</h2><p>Choose an available opportunity to start a new enrollment.</p><a className="primary inlineCta" href="/join">Find a paid gig →</a></div>:
   <div className="dashboardJobs">{jobs.map(job=>{
    const state=job.pairState||'PARTNER_PENDING',progress=stateProgress[state]??0,action=nextAction(job);
    const inviteUrl=job.inviteCode&&typeof window!=='undefined'?`${window.location.origin}/pair/${encodeURIComponent(job.inviteCode)}`:'';
    return <article className="dashboardJob" key={job.enrollmentId}>
     <div className="jobHeader"><div><span className="jobMarket">{job.countryCode} · {job.languageCode.toUpperCase()}</span><h2>{job.campaignName}</h2></div><div className="payoutBox"><span>Your share</span><strong>{money(job.participantPayoutCents,job.currency)}</strong><small>Pair total {money(job.pairPayoutCents,job.currency)}</small></div></div>
     <div className="jobProgress"><div><span>Progress</span><b>{progress}%</b></div><div className="progressTrack"><i style={{width:`${progress}%`}}/></div><small>{state.replaceAll('_',' ')}</small></div>
     <div className={`nextAction ${action.tone}`}><span>NEXT ACTION</span><h3>{action.title}</h3><p>{action.body}</p>
      {state==='PARTNER_PENDING'&&inviteUrl&&<InviteShareButtons inviteUrl={inviteUrl} language={job.languageCode==='es'?'es':'en'}/>}
      {(state==='PAIRED'||state==='READINESS_PENDING')&&!job.readinessCompleted&&<div className="readinessBox">
       <ul><li>Quiet place with minimal background noise</li><li>Required phone/device available and charged</li><li>Enough uninterrupted time for the listed sessions</li><li>Ready to follow the gig instructions exactly</li></ul>
       <button onClick={()=>markReady(job)} disabled={readyPair===job.pairCode}>{readyPair===job.pairCode?'Saving…':"I’m ready to record →"}</button>
      </div>}
     </div>
     <div className="jobFacts"><div><span>Sessions</span><strong>{job.sessionsRequired||'—'}</strong></div><div><span>Target length</span><strong>{job.targetMinutesMin&&job.targetMinutesMax?`${job.targetMinutesMin}–${job.targetMinutesMax} min`:'See instructions'}</strong></div><div><span>Pair code</span><strong>{job.pairCode||'Pending'}</strong></div></div>
    </article>
   })}</div>}
  </section>
 </main>;
}
