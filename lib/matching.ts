export type MatchCandidate={id:string;countryCode:string;languageCode:string;status:'WAITING'|'OFFERED'|'MATCHED'|'PAUSED';joinedAt:string};
export function compatible(a:MatchCandidate,b:MatchCandidate){
 return a.id!==b.id&&a.status==='WAITING'&&b.status==='WAITING'&&a.countryCode===b.countryCode&&a.languageCode===b.languageCode;
}
export function rankMatches(me:MatchCandidate,candidates:MatchCandidate[]){
 return candidates.filter(c=>compatible(me,c)).sort((a,b)=>Date.parse(a.joinedAt)-Date.parse(b.joinedAt));
}
