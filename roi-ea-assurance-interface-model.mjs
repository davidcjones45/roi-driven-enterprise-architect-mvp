const text=v=>String(v??'').trim();
const list=v=>Array.isArray(v)?v:v==null?[]:[v];
const unique=v=>[...new Set(list(v).map(text).filter(Boolean))];
export const ASSURANCE_DOMAINS=Object.freeze(['SECURITY','PRIVACY','FUNCTIONAL_SAFETY','PHYSICAL_SAFETY','RESILIENCE','RELIABILITY','QUALITY','COMPLIANCE','SUPPLY_CHAIN_ASSURANCE','AI_ASSURANCE','OTHER_SPECIALIST_DOMAIN']);
export const ASSESSOR_INDEPENDENCE=Object.freeze(['SELF_ASSESSED','INDEPENDENT_INTERNAL','INDEPENDENT_EXTERNAL','ACCREDITED_THIRD_PARTY','REGULATORY','UNKNOWN']);
export function normalizeAssuranceInterface(record={}) {
 const d=text(record.domain).toUpperCase(),i=text(record.assessorIndependence||'UNKNOWN').toUpperCase(),errors=[];
 if(!text(record.id)) errors.push('assurance interface id is required.'); if(!text(record.subjectId)) errors.push('subjectId is required.');
 if(!ASSURANCE_DOMAINS.includes(d)) errors.push('domain is not recognized.'); if(!unique(record.assuranceClaimIds).length) errors.push('at least one assuranceClaimId is required.');
 if(!unique(record.evidenceIds).length) errors.push('evidenceIds are required.'); if(!text(record.scope)) errors.push('scope is required.');
 if(!unique(record.validityConditions).length) errors.push('validityConditions are required.'); if(!unique(record.limitations).length) errors.push('limitations are required.');
 if(!ASSESSOR_INDEPENDENCE.includes(i)) errors.push('assessorIndependence is not recognized.');
 return {id:text(record.id),subjectId:text(record.subjectId),domain:d,contextId:text(record.contextId),externalFrameworkRef:text(record.externalFrameworkRef),
 externalAuthorityRef:text(record.externalAuthorityRef),assuranceClaimIds:unique(record.assuranceClaimIds),assessmentType:text(record.assessmentType),
 assessmentMethodRef:text(record.assessmentMethodRef),assessorId:text(record.assessorId),assessorIndependence:i,evidenceIds:unique(record.evidenceIds),
 controlIds:unique(record.controlIds),constraintIds:unique(record.constraintIds),scope:text(record.scope),configurationRef:text(record.configurationRef),
 validityConditions:unique(record.validityConditions),limitations:unique(record.limitations),assuranceStatus:text(record.assuranceStatus),
 externalAssuranceLevel:text(record.externalAssuranceLevel),certificationRef:text(record.certificationRef),performedAt:text(record.performedAt),
 effectiveFrom:text(record.effectiveFrom),effectiveTo:text(record.effectiveTo),reviewDue:text(record.reviewDue),relianceIds:unique(record.relianceIds),
 decisionIds:unique(record.decisionIds),reassessmentTriggerRefs:unique(record.reassessmentTriggerRefs),errors};
}
export function validateAssuranceInterface(record={}) {
 const a=normalizeAssuranceInterface(record);
 return {assurance:a,valid:!a.errors.length,status:a.errors.length?'INCOMPLETE':'PASS',issues:a.errors,createsInstitutionalAuthority:false,
 createsUniversalSafetyFinding:false,createsRiskAcceptance:false,certificationCreatesUniversalFitness:false};
}
export function evaluateGovernedResumption({technicalRecoveryEstablished=false,assuranceRestored=false,authorityReviewComplete=false,acceptanceRequired=false,acceptanceEstablished=false,resumptionDecision=null}={}) {
 const dp=Boolean(resumptionDecision&&text(resumptionDecision.decisionOwnerId)&&text(resumptionDecision.authorityId)&&text(resumptionDecision.effectiveTime));
 const disposition=text(resumptionDecision?.disposition).toUpperCase(),da=dp&&['REACTIVATE','RESUME','AUTHORIZE_RESUMPTION'].includes(disposition);
 const ready=technicalRecoveryEstablished&&assuranceRestored&&authorityReviewComplete&&(!acceptanceRequired||acceptanceEstablished);
 return {technicalRecoveryEstablished:!!technicalRecoveryEstablished,assuranceRestored:!!assuranceRestored,authorityReviewComplete:!!authorityReviewComplete,
 acceptanceRequired:!!acceptanceRequired,acceptanceEstablished:!!acceptanceEstablished,resumptionDecisionPresent:dp,authorizedResumption:ready&&da,reactivates:ready&&da,
 status:!technicalRecoveryEstablished?'TECHNICAL_RECOVERY_INCOMPLETE':!assuranceRestored?'ASSURANCE_RESTORATION_REQUIRED':!authorityReviewComplete?'AUTHORITY_REVIEW_REQUIRED':acceptanceRequired&&!acceptanceEstablished?'ACCEPTANCE_REQUIRED':!dp?'READY_FOR_RESUMPTION_DECISION':da?'AUTHORIZED_RESUMPTION':'RESUMPTION_NOT_AUTHORIZED'};
}
