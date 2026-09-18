export const SUPPORTED_MARKETS=['US','ES','IT','AU','GB','MX','AR','CO'] as const;
export type SupportedMarket=(typeof SUPPORTED_MARKETS)[number];

export function marketForLocale(locale:string):SupportedMarket|'UNKNOWN'{
 const parts=(locale||'').replace('_','-').split('-');
 const region=(parts[1]||'').toUpperCase();
 return (SUPPORTED_MARKETS as readonly string[]).includes(region)?region as SupportedMarket:'UNKNOWN';
}

export function languageCodeForLocale(locale:string):string{
 return ((locale||'').replace('_','-').split('-')[0]||'en').toLowerCase();
}

export function languageName(code:string):string{
 return code==='es'?'Spanish':code==='it'?'Italian':code==='en'?'English':code||'Unknown';
}
