export type WhatsAppMessageStatus = 'RECOMMENDED'|'OPENED_FOR_SEND'|'OPERATOR_CONFIRMED_SENT'|'SKIPPED'|'FAILED_TO_OPEN'

export function buildWhatsAppLink(message:string, phone?:string){
  const digits=phone?.replace(/\D/g,'') ?? ''
  const target=digits ? `https://wa.me/${digits}` : 'https://wa.me/'
  return `${target}?text=${encodeURIComponent(message)}`
}

export const spanishTemplates = {
  PARTNER_NEEDED: ({name,inviteUrl}:{name:string;inviteUrl:string}) =>
    `Hola ${name}. Has superado la primera parte. Ahora necesitamos registrar a tu pareja. Comparte este enlace: ${inviteUrl}`,
  PAIR_CONFIRMED: ({pairId}:{pairId:string}) =>
    `Hola. Tu pareja también ha sido aprobada. Código de pareja: ${pairId}. Ya podéis continuar con la preparación del proyecto.`,
  QA_PENDING: ({pairId}:{pairId:string}) =>
    `Hola. Hemos recibido la finalización reportada de ${pairId}. El trabajo está pendiente de la revisión externa requerida.`,
  PAYMENT_READY: ({pairId}:{pairId:string}) =>
    `Hola. El trabajo de ${pairId} ha sido aprobado. Estamos preparando el pago total de 50 $ correspondiente a la pareja.`,
} as const
