import {describe,expect,it} from 'vitest';
import {INVITATION_CODE_PLACEHOLDER,invitationCodeReadiness,isInvitationCodeConfigured} from './invitation-code';

describe('isInvitationCodeConfigured',()=>{
 it('rejects missing, blank and placeholder codes',()=>{
  expect(isInvitationCodeConfigured(null)).toBe(false);
  expect(isInvitationCodeConfigured(undefined)).toBe(false);
  expect(isInvitationCodeConfigured('   ')).toBe(false);
  expect(isInvitationCodeConfigured(INVITATION_CODE_PLACEHOLDER)).toBe(false);
 });
 it('accepts a real code',()=>{
  expect(isInvitationCodeConfigured('ABC123XYZ9')).toBe(true);
 });
});

describe('invitationCodeReadiness',()=>{
 it('blocks PAIR_SPECIFIC even when a campaign-wide code is set',()=>{
  expect(invitationCodeReadiness('PAIR_SPECIFIC','ABC123XYZ9').pass).toBe(false);
 });
 it('passes CAMPAIGN_DEFAULT only with a real code',()=>{
  expect(invitationCodeReadiness('CAMPAIGN_DEFAULT','ABC123XYZ9')).toEqual({pass:true,detail:'Configured'});
  expect(invitationCodeReadiness('CAMPAIGN_DEFAULT','CONFIGURE_IN_ADMIN').pass).toBe(false);
  expect(invitationCodeReadiness('CAMPAIGN_DEFAULT',null).pass).toBe(false);
 });
});
