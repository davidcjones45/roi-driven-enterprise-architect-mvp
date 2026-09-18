const text=v=>String(v??'').trim();
const list=v=>Array.isArray(v)?v:v==null?[]:[v];
const unique=v=>[...new Set(list(v).map(text).filter(Boolean))];
export function normalizeCIFCaseSummary(record={}) {
 const errors=[]; if(!text(record.id)) errors.push('case id is required.'); if(!text(record.title)) errors.push('title is required.');
 if(!text(record.purpose)) errors.push('purpose is required.'); if(!text(record.systemBoundary)) errors.push('systemBoundary is required.');
 return {id:text(record.id),title:text(record.title),purpose:text(record.purpose),outcomeIds:unique(record.outcomeIds),systemBoundary:text(record.systemBoundary),
 actorIds:unique(record.actorIds),profileSelected:text(record.profileSelected),specializationIds:unique(record.specializationIds),capabilityIds:unique(record.capabilityIds),
 dependencyIds:unique(record.dependencyIds),evidenceSummary:text(record.evidenceSummary),uncertaintyIds:unique(record.uncertaintyIds),
 authoritySummary:text(record.authoritySummary),decisionIds:unique(record.decisionIds),actionIds:unique(record.actionIds),handoffIds:unique(record.handoffIds),
 controlIds:unique(record.controlIds),consequenceIds:unique(record.consequenceIds),tradeoffIds:unique(record.tradeoffIds),externalitySummary:text(record.externalitySummary),
 externalExpertiseRequired:unique(record.externalExpertiseRequired),reassessmentTriggerRefs:unique(record.reassessmentTriggerRefs),
 validationResultId:text(record.validationResultId),limitations:unique(record.limitations),errors};
}
export function validateCIFCaseSummary(record={}) {
 const c=normalizeCIFCaseSummary(record); return {caseSummary:c,valid:!c.errors.length,status:c.errors.length?'INCOMPLETE':'PASS',issues:c.errors,
 readOnlyProjection:true,createsAuthority:false,createsDecision:false,createsExternalValidity:false};
}
