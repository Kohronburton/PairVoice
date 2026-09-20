export type WhatsAppMessageStatus='RECOMMENDED'|'OPENED_FOR_SEND'|'OPERATOR_CONFIRMED_SENT'|'SKIPPED'|'FAILED_TO_OPEN';

export function buildWhatsAppLink(message:string,phone?:string){
 const digits=phone?.replace(/\\D/g,'')??'';
 const target=digits?`https://wa.me/${digits}`:'https://wa.me/';
 return `${target}?text=${encodeURIComponent(message)}`;
}

type PartnerNeededArgs={name:string;campaignName:string;inviteUrl:string};
type PairConfirmedArgs={campaignName:string;pairCode:string};
type QaPendingArgs={campaignName:string;pairCode:string};
type PaymentReadyArgs={campaignName:string;pairCode:string;amountLabel:string};

export const spanishTemplates={
 PARTNER_NEEDED:({name,campaignName,inviteUrl}:PartnerNeededArgs)=>
  `Hola ${name}. Has avanzado en ${campaignName}. Este proyecto necesita otra persona elegible. Comparte este enlace para formar tu pareja: ${inviteUrl}`,
 PAIR_CONFIRMED:({campaignName,pairCode}:PairConfirmedArgs)=>
  `Tu pareja para ${campaignName} ya está formada. Código de PairVoice: ${pairCode}. Ya podéis continuar con los siguientes pasos.`,
 QA_PENDING:({campaignName,pairCode}:QaPendingArgs)=>
  `Hemos recibido el trabajo de ${campaignName} para la pareja ${pairCode}. Está pendiente de revisión.`,
 PAYMENT_READY:({campaignName,pairCode,amountLabel}:PaymentReadyArgs)=>
  `El trabajo de ${campaignName} para la pareja ${pairCode} ha sido aprobado. El pago de ${amountLabel} está listo para procesarse.`,
} as const;

export const englishTemplates={
 PARTNER_NEEDED:({name,campaignName,inviteUrl}:PartnerNeededArgs)=>
  `Hi ${name}. You moved forward for ${campaignName}. This project needs another eligible participant. Share this link to form your pair: ${inviteUrl}`,
 PAIR_CONFIRMED:({campaignName,pairCode}:PairConfirmedArgs)=>
  `Your pair for ${campaignName} is confirmed. PairVoice code: ${pairCode}. You can continue to the next step.`,
 QA_PENDING:({campaignName,pairCode}:QaPendingArgs)=>
  `We received the work for ${campaignName}, pair ${pairCode}. It is pending review.`,
 PAYMENT_READY:({campaignName,pairCode,amountLabel}:PaymentReadyArgs)=>
  `The work for ${campaignName}, pair ${pairCode}, was approved. Your ${amountLabel} payment is ready to process.`,
} as const;
