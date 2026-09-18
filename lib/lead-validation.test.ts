import {describe,expect,it} from 'vitest';
import {isValidEmail,normalizeCampaignKey,normalizeEmail} from './lead-validation';

describe('lead validation helpers',()=>{
 it('normalizes email casing and whitespace',()=>expect(normalizeEmail(' Test@Example.COM ')).toBe('test@example.com'));
 it('accepts normal email addresses',()=>expect(isValidEmail('person@example.com')).toBe(true));
 it('rejects malformed email addresses',()=>{
  expect(isValidEmail('person')).toBe(false);
  expect(isValidEmail('person@')).toBe(false);
  expect(isValidEmail('@example.com')).toBe(false);
 });
 it('uses organic as the campaign fallback',()=>expect(normalizeCampaignKey(null)).toBe('organic'));
 it('caps campaign keys to 120 characters',()=>expect(normalizeCampaignKey('x'.repeat(150))).toHaveLength(120));
});
