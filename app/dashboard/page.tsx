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

function nextAction(job:Job,es:boolean){
 switch(job.pairState){
  case 'PARTNER_PENDING':return es
   ?{title:'Invita a tu compañero/a',body:'Este proyecto necesita dos personas. Envía tu enlace personal a la persona con la que quieres grabar.',tone:'action'}
   :{title:'Invite your partner',body:'This gig needs two people. Send your personal invite link to the person you want to record with.',tone:'action'};
  case 'PAIRED':case 'READINESS_PENDING':
   if(job.readinessCompleted)return es
    ?{title:'Esperando a tu compañero/a',body:'Ya completaste la preparación. Tu compañero/a debe confirmar la suya.',tone:'wait'}
    :{title:'Waiting on your partner',body:'You completed the recording checklist. Your partner needs to confirm theirs next.',tone:'wait'};
   return es
    ?{title:'Completa la preparación',body:'Confirma que tienes un lugar tranquilo, el dispositivo requerido y tiempo para seguir las instrucciones.',tone:'action'}
    :{title:'Complete the recording checklist',body:'Confirm you have a quiet place, the required device, and time to follow the gig instructions.',tone:'action'};
  case 'READY':return es
   ?{title:'Pareja preparada',body:'Los dos estáis listos. PairVoice está preparando el acceso y las instrucciones finales.',tone:'wait'}
   :{title:'Pair ready',body:'Both people are ready. PairVoice is preparing the recording access and final gig instructions.',tone:'wait'};
  case 'RECORDING':return es
   ?{title:'Graba el proyecto',body:'Sigue exactamente las instrucciones, graba en un lugar tranquilo y completa todas las sesiones.',tone:'action'}
   :{title:'Record the gig',body:'Follow the campaign instructions exactly, record in a quiet place, and complete every required session.',tone:'action'};
  case 'SUBMITTED':case 'INTERNAL_QA':case 'CLIENT_QA':return es
   ?{title:'Trabajo en revisión',body:'Tu entrega está en control de calidad. Actualizaremos este panel cuando cambie el resultado.',tone:'wait'}
   :{title:'Work under review',body:'Your submission is in quality review. We’ll update this dashboard when the result changes.',tone:'wait'};
  case 'REWORK_REQUIRED':return es
   ?{title:'Acción necesaria',body:'Este proyecto necesita una corrección o nueva grabación. Sigue las últimas instrucciones antes de reenviar.',tone:'action'}
   :{title:'Action required',body:'This gig needs a correction or re-recording. Follow the latest instructions before resubmitting.',tone:'action'};
  case 'APPROVED':case 'PAYABLE':return es
   ?{title:'Aprobado para pago',body:'Tu trabajo superó la revisión. El siguiente paso es procesar el pago.',tone:'success'}
   :{title:'Approved for payout',body:'Your work passed review. Payout processing is the next step.',tone:'success'};
  case 'PAID':return es?{title:'Pagado',body:'Este proyecto está completo y pagado.',tone:'success'}:{title:'Paid',body:'This gig is complete and paid.',tone:'success'};
  case 'PAYMENT_FAILED':return es
   ?{title:'El pago necesita atención',body:'El pago no pudo completarse. PairVoice te mostrará el siguiente paso.',tone:'action'}
   :{title:'Payout needs attention',body:'The payout could not complete. PairVoice support will provide the next payment step.',tone:'action'};
  case 'REJECTED':return es
   ?{title:'Proyecto cerrado',body:'Esta entrega no fue aprobada. Revisa cualquier aviso específico del proyecto.',tone:'wait'}
   :{title:'Gig closed',body:'This submission was not approved. Check any project-specific notice for details.',tone:'wait'};
  case 'ON_HOLD':return es
   ?{title:'En pausa temporal',body:'Este proyecto está en pausa. No necesitas hacer nada hasta que cambie el estado.',tone:'wait'}
   :{title:'Temporarily on hold',body:'This gig is paused. No action is required until the status changes.',tone:'wait'};
  case 'CANCELLED':return es?{title:'Proyecto cancelado',body:'Esta inscripción ya no está activa.',tone:'wait'}:{title:'Gig cancelled',body:'This enrollment is no longer active.',tone:'wait'};
  default:return es
   ?{title:'Inscripción activa',body:'Tu inscripción está activa. Aquí verás el siguiente paso.',tone:'wait'}
   :{title:'Enrollment active',body:'Your PairVoice enrollment is active. We’ll show the next action here.',tone:'wait'};
 }
}

export default function DashboardPage(){
 const[data,setData]=useState<Dashboard|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[signedOut,setSignedOut]=useState(false),[readyPair,setReadyPair]=useState<string|null>(null),[lang,setLang]=useState<'en'|'es'>('en');
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
   const parsed=dash as Dashboard;
   setData(parsed);
   if(parsed.participant?.languageCode==='es'){setLang('es');document.documentElement.lang='es'}
   trackFunnelEvent('dashboard_view',{jobs:Array.isArray(parsed?.jobs)?parsed.jobs.length:0});
  }catch(err){setError(err instanceof Error?err.message:'Unable to load your PairVoice account.')}
  finally{setLoading(false)}
 },[]);

 useEffect(()=>{
  const browserEs=navigator.language.toLowerCase().startsWith('es');
  if(browserEs){setLang('es');document.documentElement.lang='es'}
  const supabase=getBrowserSupabase();
  void load();
  const{data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{if(session?.user)void load()});
  return()=>subscription.unsubscribe();
 },[load]);

 const jobs=useMemo(()=>data?.jobs||[],[data]),es=lang==='es';
 const t=es?{
  loading:'Cargando tu panel de PairVoice…',find:'Ver trabajos',signedOut:'Has cerrado sesión.',open:'Abre tu panel de trabajo.',
  access:'Usa el correo con el que te registraste para ver tus proyectos, pareja, pasos de grabación y pagos.',link:'Enviarme un enlace seguro →',
  noProfile:'Todavía no hay un perfil activo.',noProfileBody:'Has iniciado sesión, pero este correo aún no está inscrito en un proyecto de PairVoice.',choose:'Elegir un proyecto →',
  another:'Ver otro trabajo',signout:'Salir',eyebrow:'TU TRABAJO EN PAIRVOICE',welcome:'Bienvenido/a de nuevo',hero:'Una cuenta para tus proyectos activos, tu pareja, los pasos de grabación y el progreso del pago.',
  id:'ID PAIRVOICE',noGigs:'Todavía no tienes proyectos.',noGigsBody:'Elige una oportunidad disponible para empezar.',share:'Tu parte',pairTotal:'Total pareja',
  progress:'Progreso',next:'SIGUIENTE PASO',quiet:'Lugar tranquilo con el mínimo ruido de fondo',device:'Dispositivo requerido disponible y cargado',
  time:'Tiempo suficiente sin interrupciones para las sesiones',instructions:'Preparado/a para seguir exactamente las instrucciones',saving:'Guardando…',ready:'Estoy listo/a para grabar →',
  sessions:'Sesiones',length:'Duración objetivo',see:'Ver instrucciones',pairCode:'Código de pareja',pending:'Pendiente'
 }:{
  loading:'Loading your PairVoice dashboard…',find:'Find a gig',signedOut:'You’re signed out.',open:'Open your work dashboard.',
  access:'Use the email you registered with to access your PairVoice gigs, partner status, recording steps, and payout progress.',link:'Email me a sign-in link →',
  noProfile:'No active participant profile yet.',noProfileBody:'This email is signed in, but it has not enrolled in a PairVoice gig yet.',choose:'Choose a paid gig →',
  another:'Find another gig',signout:'Sign out',eyebrow:'YOUR PAIRVOICE WORK',welcome:'Welcome back',hero:'One account for your active voice gigs, partner status, recording steps, and payout progress.',
  id:'PAIRVOICE ID',noGigs:'No gigs yet.',noGigsBody:'Choose an available opportunity to start a new enrollment.',share:'Your share',pairTotal:'Pair total',
  progress:'Progress',next:'NEXT ACTION',quiet:'Quiet place with minimal background noise',device:'Required phone/device available and charged',
  time:'Enough uninterrupted time for the listed sessions',instructions:'Ready to follow the gig instructions exactly',saving:'Saving…',ready:"I’m ready to record →",
  sessions:'Sessions',length:'Target length',see:'See instructions',pairCode:'Pair code',pending:'Pending'
 };

 async function markReady(job:Job){
  if(!job.pairCode)return;
  setReadyPair(job.pairCode);setError('');trackFunnelEvent('readiness_started',{pair_code:job.pairCode,campaign_slug:job.campaignSlug});
  try{
   const supabase=getBrowserSupabase();
   const{error:rpcError}=await supabase.rpc('mark_my_pair_ready',{p_pair_code:job.pairCode});
   if(rpcError)throw rpcError;
   trackFunnelEvent('readiness_completed',{pair_code:job.pairCode,campaign_slug:job.campaignSlug});
   await load();
  }catch(err){setError(err instanceof Error?err.message:(es?'No se pudo guardar la preparación.':'Unable to save readiness.'))}
  finally{setReadyPair(null)}
 }

 async function signOut(){
  const supabase=getBrowserSupabase();await supabase.auth.signOut();setData(null);setSignedOut(true);
 }

 if(loading)return <main className="flowPage"><nav><a className="logo logoLink" href="/">PAIR<span>VOICE</span></a></nav><section className="flowShell narrow"><div className="dashboardLoading">{t.loading}</div></section></main>;

 if(!data)return <main className="flowPage"><nav><a className="logo logoLink" href="/">PAIR<span>VOICE</span></a><a href={`/join?lang=${lang}`}>{t.find}</a></nav><section className="flowShell narrow"><div className="eyebrow">{es?'CUENTA PAIRVOICE':'PAIRVOICE ACCOUNT'}</div><h1>{signedOut?t.signedOut:t.open}</h1><p className="lead">{t.access}</p><a className="primary inlineCta" href={`/login?lang=${lang}`}>{t.link}</a></section></main>;

 if(!data.ok)return <main className="flowPage"><nav><a className="logo logoLink" href="/">PAIR<span>VOICE</span></a><button className="language" onClick={signOut}>{t.signout}</button></nav><section className="flowShell narrow"><div className="eyebrow">{es?'CUENTA PAIRVOICE':'PAIRVOICE ACCOUNT'}</div><h1>{t.noProfile}</h1><p className="lead">{t.noProfileBody}</p><a className="primary inlineCta" href={`/join?lang=${lang}`}>{t.choose}</a></section></main>;

 return <main className="dashboardPage">
  <nav><a className="logo logoLink" href="/">PAIR<span>VOICE</span></a><div className="navright"><a href={`/join?lang=${lang}`}>{t.another}</a><button className="language" onClick={()=>{const next=es?'en':'es';setLang(next);document.documentElement.lang=next}}>{es?'EN':'ES'}</button><button className="language" onClick={signOut}>{t.signout}</button></div></nav>
  <section className="dashboardShell">
   <header className="dashboardHero"><div><div className="eyebrow">{t.eyebrow}</div><h1>{t.welcome}, {data.participant?.firstName}.</h1><p>{t.hero}</p></div><div className="accountChip"><span>{t.id}</span><strong>{data.participant?.participantCode}</strong><small>{data.participant?.email}</small></div></header>
   {error&&<p className="error">{error}</p>}
   {!jobs.length?<div className="emptyDashboard"><h2>{t.noGigs}</h2><p>{t.noGigsBody}</p><a className="primary inlineCta" href={`/join?lang=${lang}`}>{t.choose}</a></div>:
   <div className="dashboardJobs">{jobs.map(job=>{
    const state=job.pairState||'PARTNER_PENDING',progress=stateProgress[state]??0,action=nextAction(job,es);
    const inviteUrl=job.inviteCode&&typeof window!=='undefined'?`${window.location.origin}/pair/${encodeURIComponent(job.inviteCode)}?lang=${lang}`:'';
    return <article className="dashboardJob" key={job.enrollmentId}>
     <div className="jobHeader"><div><span className="jobMarket">{job.countryCode} · {job.languageCode.toUpperCase()}</span><h2>{job.campaignName}</h2></div><div className="payoutBox"><span>{t.share}</span><strong>{money(job.participantPayoutCents,job.currency)}</strong><small>{t.pairTotal} {money(job.pairPayoutCents,job.currency)}</small></div></div>
     <div className="jobProgress"><div><span>{t.progress}</span><b>{progress}%</b></div><div className="progressTrack"><i style={{width:`${progress}%`}}/></div><small>{state.replaceAll('_',' ')}</small></div>
     <div className={`nextAction ${action.tone}`}><span>{t.next}</span><h3>{action.title}</h3><p>{action.body}</p>
      {state==='PARTNER_PENDING'&&inviteUrl&&<InviteShareButtons inviteUrl={inviteUrl} language={es?'es':'en'}/>}
      {(state==='PAIRED'||state==='READINESS_PENDING')&&!job.readinessCompleted&&<div className="readinessBox">
       <ul><li>{t.quiet}</li><li>{t.device}</li><li>{t.time}</li><li>{t.instructions}</li></ul>
       <button onClick={()=>markReady(job)} disabled={readyPair===job.pairCode}>{readyPair===job.pairCode?t.saving:t.ready}</button>
      </div>}
     </div>
     <div className="jobFacts"><div><span>{t.sessions}</span><strong>{job.sessionsRequired||'—'}</strong></div><div><span>{t.length}</span><strong>{job.targetMinutesMin&&job.targetMinutesMax?`${job.targetMinutesMin}–${job.targetMinutesMax} min`:t.see}</strong></div><div><span>{t.pairCode}</span><strong>{job.pairCode||t.pending}</strong></div></div>
    </article>
   })}</div>}
  </section>
 </main>;
}
