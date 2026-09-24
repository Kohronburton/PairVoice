type WelcomeEmailArgs={to:string;firstName:string;language:'en'|'es';inviteUrl:string;partnerJoined?:boolean};

const DEFAULT_FROM='Star from PairVoice <hello@pairvoice.com>';

export async function sendEarlyAccessWelcome({to,firstName,language,inviteUrl,partnerJoined}:WelcomeEmailArgs){
  const apiKey=process.env.RESEND_API_KEY;
  if(!apiKey) return {sent:false,queued:true};

  const templateId=language==='es'?'pairvoice-welcome-es':'pairvoice-welcome-en';
  const response=await fetch('https://api.resend.com/emails',{
    method:'POST',
    headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},
    body:JSON.stringify({
      from:process.env.PAIRVOICE_EMAIL_FROM||DEFAULT_FROM,
      to,
      template:{
        id:templateId,
        variables:{NAME:firstName,INVITE_URL:inviteUrl}
      }
    })
  });

  if(!response.ok){
    const detail=await response.text().catch(()=> '');
    throw new Error(`Email provider returned ${response.status}${detail?`: ${detail}`:''}`);
  }

  return {sent:true,queued:false,partnerJoined:!!partnerJoined};
}

export async function sendPartnerJoinedEmail(to:string,firstName:string,language:'en'|'es'){
  const apiKey=process.env.RESEND_API_KEY;
  if(!apiKey)return {sent:false,queued:true};

  const subject=language==='es'?'Tu compañero se ha unido a PairVoice':'Your partner joined PairVoice';
  const text=language==='es'
    ?`Hola ${firstName},\n\nTu compañero se ha registrado. PairVoice ya puede revisar vuestra pareja para las próximas oportunidades pagadas.\n\n— Star, PairVoice`
    :`Hi ${firstName},\n\nYour partner has signed up. PairVoice can now review your pair for upcoming paid opportunities.\n\n— Star, PairVoice`;

  const response=await fetch('https://api.resend.com/emails',{
    method:'POST',
    headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},
    body:JSON.stringify({
      from:process.env.PAIRVOICE_EMAIL_FROM||DEFAULT_FROM,
      to,
      subject,
      text,
      html:text.replaceAll('\n','<br>')
    })
  });

  if(!response.ok)throw new Error(`Email provider returned ${response.status}`);
  return {sent:true,queued:false};
}
