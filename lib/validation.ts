export function normalizeEmail(value:unknown){return String(value??'').trim().toLowerCase()}
export function isValidEmail(value:unknown){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value))}
export function normalizeMarket(value:unknown){const code=String(value??'UNKNOWN').trim().toUpperCase();return ['US','ES','IT','AU','GB','MX','AR','CO'].includes(code)?code:'UNKNOWN'}
export function clampText(value:unknown,max:number){const text=String(value??'').trim();return text?text.slice(0,max):null}
export function normalizePhone(value:unknown,countryCode='US'){
 const raw=String(value??'').trim(),digits=raw.replace(/\D/g,'');
 if(raw.startsWith('+')&&digits.length>=8&&digits.length<=15)return'+'+digits;
 const country=String(countryCode||'').toUpperCase();
 if((country==='US'||country==='CA')&&digits.length===10)return'+1'+digits;
 if((country==='US'||country==='CA')&&digits.length===11&&digits.startsWith('1'))return'+'+digits;
 if(country==='ES'&&digits.length===9)return'+34'+digits;
 if(country==='ES'&&digits.length===11&&digits.startsWith('34'))return'+'+digits;
 return null;
}
export function isValidPhone(value:unknown,countryCode='US'){return normalizePhone(value,countryCode)!==null}
