import {describe,expect,it} from 'vitest';
import {INVITATION_CODE_PLACEHOLDER,isInvitationCodeConfigured} from './invitation-code';

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
