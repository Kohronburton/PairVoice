import{NextResponse}from'next/server';
import{requireAdmin}from'../../../../lib/admin-server';

const clientStages=['landing_view','campaign_view','signup_started','signup_completed','partner_invite_created','partner_matching_joined'] as const;
const businessStages=['partner_invite_accepted','pair_created','pair_qualified','gig_started','submission_completed','submission_approved','earning_available','payout_completed'] as const;

export async function GET(){
 const admin=await requireAdmin();
 if(!admin)return NextResponse.json({error:'Forbidden'},{status:403});
 try{
  const since=new Date(Date.now()-30*86400000).toISOString();
  const [{data:client,error:clientError},{data:business,error:businessError}]=await Promise.all([
   admin.db.from('funnel_events').select('event_name,session_id,created_at,metadata').gte('created_at',since),
   admin.db.from('business_funnel_events').select('event_name,campaign_id,pair_id,participant_id,occurred_at,metadata').gte('occurred_at',since)
  ]);
  if(clientError)throw clientError;if(businessError)throw businessError;
  const clientRows=client||[],businessRows=business||[];
  const clientCounts=Object.fromEntries(clientStages.map(e=>[e,clientRows.filter(r=>r.event_name===e).length]));
  const businessCounts=Object.fromEntries(businessStages.map(e=>[e,businessRows.filter(r=>r.event_name===e).length]));
  const uniqueSessions=new Set(clientRows.map(r=>r.session_id)).size;

  const sources=new Map<string,{events:number;signups:number}>();
  for(const row of clientRows){
   const m=(row.metadata||{}) as Record<string,any>,ft=(m.first_touch||{}) as Record<string,any>;
   const source=String(ft.utm_source||ft.source||'direct');
   const item=sources.get(source)||{events:0,signups:0};item.events++;
   if(row.event_name==='signup_completed')item.signups++;
   sources.set(source,item);
  }
  const sourceBreakdown=[...sources.entries()].map(([source,v])=>({source,...v})).sort((a,b)=>b.signups-a.signups||b.events-a.events);

  const ratio=(num:number,den:number)=>den>0?Number((100*num/den).toFixed(1)):null;
  const conversions={
   landingToSignupPct:ratio(clientCounts.signup_completed||0,clientCounts.landing_view||0),
   signupToPairPct:ratio(businessCounts.pair_created||0,clientCounts.signup_completed||0),
   pairToSubmissionPct:ratio(businessCounts.submission_completed||0,businessCounts.pair_created||0),
   submissionToApprovalPct:ratio(businessCounts.submission_approved||0,businessCounts.submission_completed||0)
  };

  return NextResponse.json({days:30,uniqueSessions,client:clientCounts,business:businessCounts,conversions,sources:sourceBreakdown});
 }catch(e){console.error(e);return NextResponse.json({error:'Unable to load funnel.'},{status:500})}
}
