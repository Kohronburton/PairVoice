import {describe,expect,it} from 'vitest';
import {languageCodeForLocale,languageName,marketForLocale} from './locale';

describe('locale helpers',()=>{
 it('detects supported regional markets',()=>{
  expect(marketForLocale('es-ES')).toBe('ES');
  expect(marketForLocale('en-AU')).toBe('AU');
  expect(marketForLocale('it-IT')).toBe('IT');
  expect(marketForLocale('es_MX')).toBe('MX');
 });
 it('does not invent a geography when region is absent or unsupported',()=>{
  expect(marketForLocale('es')).toBe('UNKNOWN');
  expect(marketForLocale('fr-FR')).toBe('UNKNOWN');
  expect(marketForLocale('')).toBe('UNKNOWN');
 });
 it('keeps language separate from market',()=>{
  expect(languageCodeForLocale('es-US')).toBe('es');
  expect(marketForLocale('es-US')).toBe('US');
  expect(languageName('es')).toBe('Spanish');
 });
});
