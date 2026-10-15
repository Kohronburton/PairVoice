// The baseline seed used this placeholder instead of the real provider invitation code.
export const INVITATION_CODE_PLACEHOLDER='CONFIGURE_IN_ADMIN';

export function isInvitationCodeConfigured(code:string|null|undefined){
 const value=String(code??'').trim();
 return value.length>0&&value!==INVITATION_CODE_PLACEHOLDER;
}

export type InvitationCodeReadiness={pass:boolean;detail:string};

// Release readiness for a campaign whose published version needs an invitation code.
// PAIR_SPECIFIC stays blocking: work access refuses it until pair-bound codes exist.
export function invitationCodeReadiness(mode:string|null|undefined,code:string|null|undefined):InvitationCodeReadiness{
 if(mode==='PAIR_SPECIFIC')return {pass:false,detail:'Pair-specific invitation codes are not supported yet'};
 return isInvitationCodeConfigured(code)?{pass:true,detail:'Configured'}:{pass:false,detail:'Missing invitation code'};
}
