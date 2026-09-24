import{describe,expect,it}from'vitest';
import{buildPartnerInviteMessage,buildPartnerInviteUrl,isValidInviteCode}from'./partner-invite';

describe('partner invite flow helpers',()=>{
 it('builds a stable production pair URL without a double slash',()=>expect(buildPartnerInviteUrl('https://pairvoice.com/',' ab12cd34ef56 ')).toBe('https://pairvoice.com/pair/AB12CD34EF56'));
 it('uses the selected language for share copy',()=>{
  expect(buildPartnerInviteMessage('en','https://pairvoice.com/pair/ABC')).toContain('Join me');
  expect(buildPartnerInviteMessage('es','https://pairvoice.com/pair/ABC')).toContain('Únete conmigo');
 });
 it('accepts only twelve-character invite codes',()=>{
  expect(isValidInviteCode('AB12CD34EF56')).toBe(true);
  expect(isValidInviteCode('short')).toBe(false);
  expect(isValidInviteCode('AB12-CD34EF56')).toBe(false);
 });
});
