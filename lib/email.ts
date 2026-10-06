type WelcomeEmailArgs={to:string;firstName:string;language:'en'|'es';inviteUrl:string;partnerJoined?:boolean};

const DEFAULT_FROM='Star from PairVoice <hello@pairvoice.com>';

export async function sendWelcomeEmail({to,firstName,language,inviteUrl,partnerJoined}:WelcomeEmailArgs){
  const apiKey=process.env.RESEND_API_KEY;
  if(!apiKey) return {sent:false,queued:true};

  const templateId=language==='es'?'pairvoice-welcome-es':'pairvoice-welcome-en';
  const response=await fetch('https://api.resend.com/emails',{
    method:'POST',
    headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},
    body:JSON.stringify({
      from:process.env.PAIRVOICE_EMAIL_FROM||DEFAULT_FROM,
      to,
      template:{id:templateId,variables:{NAME:firstName,INVITE_URL:inviteUrl}}
    })
  });

  if(!response.ok){
    const detail=await response.text().catch(()=> '');
    throw new Error(`Email provider returned ${response.status}${detail?`: ${detail}`:''}`);
  }
  return {sent:true,queued:false,partnerJoined:!!partnerJoined};
}

// Keep legacy lead recovery compatible while production routes use the neutral name.
export const sendEarlyAccessWelcome=sendWelcomeEmail;

export async function sendPartnerJoinedEmail(to:string,firstName:string,language:'en'|'es'){
  const apiKey=process.env.RESEND_API_KEY;
  if(!apiKey)return {sent:false,queued:true};

  const subject=language==='es'?'Tu compañero se ha unido a PairVoice':'Your partner joined PairVoice';
  const text=language==='es'
    ?`Hola ${firstName},\n\nTu compañero se ha registrado. Abre tu panel de PairVoice para completar los siguientes pasos del proyecto.\n\n— Star, PairVoice`
    :`Hi ${firstName},\n\nYour partner has signed up. Open your PairVoice dashboard to complete the next steps for the gig.\n\n— Star, PairVoice`;

  const response=await fetch('https://api.resend.com/emails',{
    method:'POST',
    headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},
    body:JSON.stringify({
      from:process.env.PAIRVOICE_EMAIL_FROM||DEFAULT_FROM,
      to,subject,text,html:text.replaceAll('\n','<br>')
    })
  });
  if(!response.ok)throw new Error(`Email provider returned ${response.status}`);
  return {sent:true,queued:false};
}


type LifecycleEmailArgs={
 to:string;
 firstName:string;
 language:'en'|'es';
 templateKey:'PAIR_FORMED'|'WORK_READY'|'SUBMISSION_RECEIVED'|'REWORK_REQUIRED'|'APPROVED'|'REJECTED'|'PAYOUT_PAID';
 dashboardUrl:string;
};

export async function sendLifecycleEmail({to,firstName,language,templateKey,dashboardUrl}:LifecycleEmailArgs){
 const apiKey=process.env.RESEND_API_KEY;
 if(!apiKey)return {sent:false,providerReference:null};
 const messages={
  en:{
   PAIR_FORMED:['Your PairVoice pair is connected',`Hi ${firstName},\n\nYour PairVoice pair is connected. Open your dashboard to see what comes next.\n\n${dashboardUrl}\n\n— PairVoice`],
   WORK_READY:['Your PairVoice job is ready',`Hi ${firstName},\n\nYour pair is ready for the next step. Open PairVoice for the current job instructions and work access.\n\n${dashboardUrl}\n\n— PairVoice`],
   SUBMISSION_RECEIVED:['We received your PairVoice submission',`Hi ${firstName},\n\nYour work was submitted and is now in the review process. We’ll update your PairVoice status when review is complete.\n\n${dashboardUrl}\n\n— PairVoice`],
   REWORK_REQUIRED:['Action needed on your PairVoice job',`Hi ${firstName},\n\nThis job needs another action before it can be approved. Open your dashboard for the current status and next step.\n\n${dashboardUrl}\n\n— PairVoice`],
   APPROVED:['Your PairVoice work was approved',`Hi ${firstName},\n\nYour PairVoice work was approved and the earning is now reflected in your PairVoice account.\n\n${dashboardUrl}\n\n— PairVoice`],
   REJECTED:['Update on your PairVoice submission',`Hi ${firstName},\n\nYour PairVoice submission was not approved. Open your dashboard for the current status.\n\n${dashboardUrl}\n\n— PairVoice`],
   PAYOUT_PAID:['Your PairVoice payout was sent',`Hi ${firstName},\n\nPairVoice recorded your payout as sent after provider reconciliation. Open your account for the latest status.\n\n${dashboardUrl}\n\n— PairVoice`]
  },
  es:{
   PAIR_FORMED:['Tu pareja de PairVoice está conectada',`Hola ${firstName},\n\nTu pareja de PairVoice ya está conectada. Abre tu panel para ver el siguiente paso.\n\n${dashboardUrl}\n\n— PairVoice`],
   WORK_READY:['Tu proyecto de PairVoice está listo',`Hola ${firstName},\n\nTu pareja está lista para el siguiente paso. Abre PairVoice para ver las instrucciones actuales y el acceso al proyecto.\n\n${dashboardUrl}\n\n— PairVoice`],
   SUBMISSION_RECEIVED:['Hemos recibido tu entrega de PairVoice',`Hola ${firstName},\n\nTu trabajo se ha enviado y está en proceso de revisión. Actualizaremos tu estado de PairVoice cuando termine la revisión.\n\n${dashboardUrl}\n\n— PairVoice`],
   REWORK_REQUIRED:['Se necesita una acción en tu proyecto de PairVoice',`Hola ${firstName},\n\nEste proyecto necesita otra acción antes de poder aprobarse. Abre tu panel para ver el estado actual y el siguiente paso.\n\n${dashboardUrl}\n\n— PairVoice`],
   APPROVED:['Tu trabajo de PairVoice ha sido aprobado',`Hola ${firstName},\n\nTu trabajo de PairVoice ha sido aprobado y la ganancia ya aparece en tu cuenta de PairVoice.\n\n${dashboardUrl}\n\n— PairVoice`],
   REJECTED:['Actualización sobre tu entrega de PairVoice',`Hola ${firstName},\n\nTu entrega de PairVoice no ha sido aprobada. Abre tu panel para ver el estado actual.\n\n${dashboardUrl}\n\n— PairVoice`],
   PAYOUT_PAID:['Tu pago de PairVoice ha sido enviado',`Hola ${firstName},\n\nPairVoice ha registrado tu pago como enviado después de la conciliación con el proveedor. Abre tu cuenta para ver el estado más reciente.\n\n${dashboardUrl}\n\n— PairVoice`]
  }
 } as const;
 const [subject,text]=messages[language][templateKey];
 const from=process.env.PAIRVOICE_EMAIL_FROM||'PairVoice <hello@pairvoice.com>';
 const html=text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('\n','<br>').replace(dashboardUrl,`<a href="${dashboardUrl}">${dashboardUrl}</a>`);
 const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({from,to,subject,html,text})});
 if(!response.ok)throw new Error(`Email provider returned ${response.status}`);
 const payload=await response.json().catch(()=>({})) as {id?:string};
 return {sent:true,providerReference:payload.id||null};
}


type AuthEmailArgs={to:string;confirmUrl:string;language?:'en'|'es'};

export async function sendAuthConfirmationEmail({to,confirmUrl,language='en'}:AuthEmailArgs){
 const apiKey=process.env.RESEND_API_KEY;
 if(!apiKey)throw new Error('Email delivery is not configured');
 const es=language==='es';
 const subject=es?'Confirma tu acceso a PairVoice':'Confirm your PairVoice access';
 const text=es
  ?`Abre PairVoice y confirma tu acceso. Por seguridad, el enlace abre una página de confirmación antes de iniciar sesión.\n\n${confirmUrl}\n\nSi no solicitaste este correo, puedes ignorarlo.\n\n— PairVoice`
  :`Open PairVoice and confirm your access. For security, the link opens a confirmation page before signing you in.\n\n${confirmUrl}\n\nIf you did not request this email, you can ignore it.\n\n— PairVoice`;
 const escaped=confirmUrl.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
 const html=(es
  ?`<p>Abre PairVoice y confirma tu acceso.</p><p><a href="${escaped}">Continuar a PairVoice</a></p><p>Por seguridad, el enlace abre una página de confirmación antes de iniciar sesión.</p><p>Si no solicitaste este correo, puedes ignorarlo.</p><p>— PairVoice</p>`
  :`<p>Open PairVoice and confirm your access.</p><p><a href="${escaped}">Continue to PairVoice</a></p><p>For security, the link opens a confirmation page before signing you in.</p><p>If you did not request this email, you can ignore it.</p><p>— PairVoice</p>`);
 const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({from:process.env.PAIRVOICE_EMAIL_FROM||DEFAULT_FROM,to,subject,text,html})});
 if(!response.ok){const detail=await response.text().catch(()=> '');throw new Error(`Email provider returned ${response.status}${detail?`: ${detail}`:''}`)}
 const payload=await response.json().catch(()=>({})) as {id?:string};
 return {sent:true,providerReference:payload.id||null};
}
