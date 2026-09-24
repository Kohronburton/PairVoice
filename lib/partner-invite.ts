export function buildPartnerInviteUrl(siteUrl:string,inviteCode:string){
  return `${siteUrl.replace(/\/$/,'')}/pair/${encodeURIComponent(inviteCode.trim().toUpperCase())}`;
}

export function buildPartnerInviteMessage(language:'en'|'es',inviteUrl:string){
  return language==='es'
    ? `Únete conmigo a PairVoice para oportunidades de voz pagadas: ${inviteUrl}`
    : `Join me on PairVoice for paid voice opportunities: ${inviteUrl}`;
}

export function isValidInviteCode(value:unknown){
  return typeof value==='string'&&/^[A-Z0-9]{12}$/.test(value.trim().toUpperCase());
}
