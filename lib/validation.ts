export function normalizeEmail(value:unknown){return String(value??'').trim().toLowerCase()}
export function isValidEmail(value:unknown){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value))}
export function normalizeMarket(value:unknown){const code=String(value??'UNKNOWN').trim().toUpperCase();return ['US','ES','IT','AU','GB','MX','AR','CO'].includes(code)?code:'UNKNOWN'}
export function clampText(value:unknown,max:number){const text=String(value??'').trim();return text?text.slice(0,max):null}