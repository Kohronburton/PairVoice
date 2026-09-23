type WelcomeEmailArgs={to:string;firstName:string;language:'en'|'es';inviteUrl:string;partnerJoined?:boolean};

export async function sendEarlyAccessWelcome({to,firstName,language,inviteUrl,partnerJoined}:WelcomeEmailArgs){
  const apiKey=process.env.RESEND_API_KEY;
  const from=process.env.PAIRVOICE_EMAIL_FROM||'PairVoice <hello@pairvoice.com>';
  const subject=language==='es'?'Estás en el acceso anticipado de PairVoice':'You’re on the PairVoice early-access list';
  const body=language==='es'
    ? `Hola ${firstName},\n\nYa estás en la lista de acceso anticipado de PairVoice. Para participar en oportunidades que requieren dos personas, invita a tu compañero usando este enlace:\n\n${inviteUrl}\n\nCuando se registre, conectaremos ambos perfiles y te avisaremos por correo.\n\n— PairVoice`
    : `Hi ${firstName},\n\nYou’re on the PairVoice early-access list. For opportunities that require two people, invite your partner using this link:\n\n${inviteUrl}\n\nWhen they join, we’ll connect both profiles and email you what happens next.\n\n— PairVoice`;
  if(!apiKey) return {sent:false,queued:true};
  const html=body.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('\n','<br>')
    .replace(inviteUrl,`<a href="${inviteUrl}">${inviteUrl}</a>`);
  const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({from,to,subject,html,text:body})});
  if(!response.ok) throw new Error(`Email provider returned ${response.status}`);
  return {sent:true,queued:false,partnerJoined:!!partnerJoined};
}

export async function sendPartnerJoinedEmail(to:string,firstName:string,language:'en'|'es'){
  const apiKey=process.env.RESEND_API_KEY;if(!apiKey)return {sent:false,queued:true};
  const subject=language==='es'?'Tu compañero se ha unido a PairVoice':'Your partner joined PairVoice';
  const text=language==='es'?`Hola ${firstName},\n\nTu compañero se ha registrado. PairVoice ya puede revisar vuestra pareja para las próximas oportunidades pagadas.\n\n— PairVoice`:`Hi ${firstName},\n\nYour partner has signed up. PairVoice can now review your pair for upcoming paid opportunities.\n\n— PairVoice`;
  const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({from:process.env.PAIRVOICE_EMAIL_FROM||'PairVoice <hello@pairvoice.com>',to,subject,text,html:text.replaceAll('\n','<br>')})});
  if(!response.ok)throw new Error(`Email provider returned ${response.status}`);return {sent:true,queued:false};
}
