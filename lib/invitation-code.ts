// The baseline seed used this placeholder instead of the real provider invitation code.
export const INVITATION_CODE_PLACEHOLDER='CONFIGURE_IN_ADMIN';

export function isInvitationCodeConfigured(code:string|null|undefined){
 const value=String(code??'').trim();
 return value.length>0&&value!==INVITATION_CODE_PLACEHOLDER;
}
