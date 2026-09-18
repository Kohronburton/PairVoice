import {describe,expect,it} from 'vitest';
import {isValidEmail,normalizeCampaignKey,normalizeEmail} from './lead-validation';
describe('lead validation helpers',()=>{
 it('normalizes email',()=>expect(normalizeEmail(' Test@Example.COM ')).toBe('test@example.com'));
 it('validates expected addresses',()=>expect(isValidEmail('person@example.com')).toBe(true));
 it('rejects malformed addresses',()=>{expect(isValidEmail('person')).toBe(false);expect(isValidEmail('person@')).toBe(false);expect(isValidEmail('@example.com')).toBe(false)});
 it('defaults campaign attribution',()=>expect(normalizeCampaignKey(null)).toBe('organic'));
 it('caps campaign keys',()=>expect(normalizeCampaignKey('x'.repeat(150))).toHaveLength(120));
});
