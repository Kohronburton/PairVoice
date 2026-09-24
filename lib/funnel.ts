export const funnelEvents=[
 'landing_view','opportunity_view','signup_started','signup_submitted','signup_completed','email_queued',
 'invite_created','invite_view','partner_signup_started','partner_signup_completed','share_clicked',
 'onboarding_view','onboarding_completed','magic_link_sent','login_view','dashboard_view',
 'readiness_started','readiness_completed'
] as const;
export type FunnelEventName=typeof funnelEvents[number];

export function getFunnelSessionId(){
 if(typeof window==='undefined')return '';
 const key='pairvoice_funnel_session';
 let id=window.localStorage.getItem(key);
 if(!id){id=crypto.randomUUID();window.localStorage.setItem(key,id)}
 return id;
}

export function trackFunnelEvent(event:FunnelEventName,metadata:Record<string,unknown>={}){
 if(typeof window==='undefined')return;
 const body={event,session_id:getFunnelSessionId(),page_path:window.location.pathname,language_code:document.documentElement.lang||undefined,metadata};
 void fetch('/api/analytics',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),keepalive:true}).catch(()=>{});
}
