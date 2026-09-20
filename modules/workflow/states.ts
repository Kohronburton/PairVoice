export const enrollmentStates=[
 'INTERESTED','ELIGIBILITY','QUALIFIED','PARTNER_PENDING','PAIRED','IN_PROGRESS',
 'SUBMITTED','APPROVED','REJECTED','PAID','WITHDRAWN'
] as const;

export type EnrollmentState=typeof enrollmentStates[number];

export const pairStates=[
 'FORMING','READY','RECORDING','SUBMITTED','QA_PENDING','REWORK',
 'APPROVED','PAYMENT_DUE','PAID','CANCELLED'
] as const;

export type PairState=typeof pairStates[number];

export const allowedEnrollmentTransitions:Partial<Record<EnrollmentState,readonly EnrollmentState[]>>={
 INTERESTED:['ELIGIBILITY','WITHDRAWN'],
 ELIGIBILITY:['QUALIFIED','REJECTED','WITHDRAWN'],
 QUALIFIED:['PARTNER_PENDING','PAIRED','IN_PROGRESS','WITHDRAWN'],
 PARTNER_PENDING:['PAIRED','WITHDRAWN'],
 PAIRED:['IN_PROGRESS','WITHDRAWN'],
 IN_PROGRESS:['SUBMITTED','WITHDRAWN'],
 SUBMITTED:['APPROVED','REJECTED','IN_PROGRESS'],
 APPROVED:['PAID'],
};

export const allowedPairTransitions:Partial<Record<PairState,readonly PairState[]>>={
 FORMING:['READY','CANCELLED'],
 READY:['RECORDING','CANCELLED'],
 RECORDING:['SUBMITTED','CANCELLED'],
 SUBMITTED:['QA_PENDING','REWORK'],
 QA_PENDING:['APPROVED','REWORK','CANCELLED'],
 REWORK:['RECORDING','SUBMITTED','CANCELLED'],
 APPROVED:['PAYMENT_DUE'],
 PAYMENT_DUE:['PAID'],
};

export function canEnrollmentTransition(from:EnrollmentState,to:EnrollmentState){
 return allowedEnrollmentTransitions[from]?.includes(to)??false;
}

export function canPairTransition(from:PairState,to:PairState){
 return allowedPairTransitions[from]?.includes(to)??false;
}
