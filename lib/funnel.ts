export const funnelEvents=[
 'landing_view','opportunity_view','campaign_view','campaign_cta_click',
 'signup_started','signup_submitted','signup_completed','email_queued',
 'invite_created','partner_invite_created','invite_view','partner_signup_started','partner_signup_completed',
 'partner_choice_have','partner_choice_need_match','partner_matching_requested','partner_matching_joined',
 'partner_invite_share_clicked','partner_invite_opened','partner_invite_accepted',
 'pair_created','pair_qualified','gig_instructions_viewed','gig_started',
 'submission_started','submission_completed','submission_approved','submission_rejected',
 'earning_available','payout_requested','payout_completed','referral_shared','referral_clicked','referral_signup','referral_pair_completed',
 'share_clicked'
] as const;
export type FunnelEventName=typeof funnelEvents[number];

type Attribution={
 utm_source?:string;
 utm_medium?:string;
 utm_campaign?:string;
 utm_content?:string;
 utm_term?:string;
 ref?:string;
 invite?:string;
 fbclid?:string;
 gclid?:string;
 source?:string;
 landing_path?:string;
 referrer?:string;
 captured_at?:string;
};

const ATTRIBUTION_KEY='pairvoice_first_touch';

function compact(values:Record<string,string|null|undefined>):Attribution{
 return Object.fromEntries(Object.entries(values).filter(([,v])=>Boolean(v))) as Attribution;
}

export function getCurrentAttribution():Attribution{
 if(typeof window==='undefined')return {};
 const q=new URLSearchParams(window.location.search);
 return compact({
  utm_source:q.get('utm_source'),
  utm_medium:q.get('utm_medium'),
  utm_campaign:q.get('utm_campaign'),
  utm_content:q.get('utm_content'),
  utm_term:q.get('utm_term'),
  ref:q.get('ref'),
  invite:q.get('invite'),
  fbclid:q.get('fbclid'),
  gclid:q.get('gclid'),
  source:q.get('source')||q.get('src'),
  landing_path:window.location.pathname,
  referrer:document.referrer||null,
  captured_at:new Date().toISOString()
 });
}

export function getFirstTouchAttribution():Attribution{
 if(typeof window==='undefined')return {};
 try{
  const existing=window.localStorage.getItem(ATTRIBUTION_KEY);
  if(existing)return JSON.parse(existing) as Attribution;
  const current=getCurrentAttribution();
  window.localStorage.setItem(ATTRIBUTION_KEY,JSON.stringify(current));
  return current;
 }catch{
  return getCurrentAttribution();
 }
}

export function getFunnelSessionId(){
 if(typeof window==='undefined')return '';
 const key='pairvoice_funnel_session';
 try{
  let id=window.localStorage.getItem(key);
  if(!id){id=crypto.randomUUID();window.localStorage.setItem(key,id)}
  return id;
 }catch{
  return crypto.randomUUID();
 }
}

function deviceType(){
 if(typeof window==='undefined')return 'unknown';
 if(window.matchMedia?.('(max-width: 767px)').matches)return 'mobile';
 if(window.matchMedia?.('(max-width: 1100px)').matches)return 'tablet';
 return 'desktop';
}

export function trackFunnelEvent(event:FunnelEventName,metadata:Record<string,unknown>={}){
 if(typeof window==='undefined')return;
 const body={
  event,
  session_id:getFunnelSessionId(),
  page_path:window.location.pathname,
  language_code:document.documentElement.lang||undefined,
  metadata:{
   ...metadata,
   device_type:deviceType(),
   first_touch:getFirstTouchAttribution(),
   last_touch:getCurrentAttribution()
  }
 };
 void fetch('/api/analytics',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),keepalive:true}).catch(()=>{});
}
