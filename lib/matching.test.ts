import {describe,it,expect} from 'vitest';
import {rankMatches,type MatchCandidate} from './matching';
const me:MatchCandidate={id:'me',countryCode:'ES',languageCode:'es',status:'WAITING',joinedAt:'2026-09-23T00:00:00Z'};
describe('partner matching',()=>{
 it('matches only same eligible market/language and never self',()=>{
  const rows:MatchCandidate[]=[
   me,
   {id:'good',countryCode:'ES',languageCode:'es',status:'WAITING',joinedAt:'2026-09-22T00:00:00Z'},
   {id:'wrong-country',countryCode:'US',languageCode:'es',status:'WAITING',joinedAt:'2026-09-20T00:00:00Z'},
   {id:'busy',countryCode:'ES',languageCode:'es',status:'MATCHED',joinedAt:'2026-09-19T00:00:00Z'}
  ];
  expect(rankMatches(me,rows).map(x=>x.id)).toEqual(['good']);
 });
 it('uses longest-waiting compatible participant first',()=>{
  const rows:MatchCandidate[]=[
   {id:'new',countryCode:'ES',languageCode:'es',status:'WAITING',joinedAt:'2026-09-23T12:00:00Z'},
   {id:'old',countryCode:'ES',languageCode:'es',status:'WAITING',joinedAt:'2026-09-21T12:00:00Z'}
  ];
  expect(rankMatches(me,rows)[0].id).toBe('old');
 });
});
