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
