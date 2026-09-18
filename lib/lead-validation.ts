export function normalizeEmail(value:unknown):string{
 return String(value||'').trim().toLowerCase();
}

export function isValidEmail(email:string):boolean{
 return /^\S+@\S+\.\S+$/.test(email);
}

export function normalizeCampaignKey(value:unknown):string{
 return String(value||'organic').slice(0,120);
}
