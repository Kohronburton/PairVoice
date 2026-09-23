import{describe,expect,it}from'vitest';
import{funnelEvents}from'./funnel';

describe('demand funnel event contract',()=>{
 it('tracks the complete conversion path',()=>{
  expect(funnelEvents).toEqual(expect.arrayContaining(['landing_view','opportunity_view','signup_submitted','signup_completed','email_queued','invite_created','share_clicked','partner_signup_completed']));
 });
 it('does not include sensitive payment or identity data',()=>{
  expect(funnelEvents.some(event=>event.includes('payment')||event.includes('password'))).toBe(false);
 });
});
