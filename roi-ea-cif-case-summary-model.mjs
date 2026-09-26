import { evaluateCIFProfile } from './roi-ea-cif-profile.mjs';
import { assessExternalityMateriality } from './roi-ea-cif-semantics.mjs';
const text=v=>String(v??'').trim();
const list=v=>Array.isArray(v)?v:v==null?[]:[v];
const unique=v=>[...new Set(list(v).map(text).filter(Boolean))];
export function normalizeCIFCaseSummary(record={}) {
 const errors=[]; if(!text(record.id)) errors.push('case id is required.'); if(!text(record.title)) errors.push('title is required.');
 if(!text(record.purpose)) errors.push('purpose is required.'); if(!text(record.systemBoundary)) errors.push('systemBoundary is required.');
 return {...record,id:text(record.id),title:text(record.title),purpose:text(record.purpose),outcomeIds:unique(record.outcomeIds),systemBoundary:text(record.systemBoundary),
 actorIds:unique(record.actorIds),profileSelected:text(record.profileSelected),specializationIds:unique(record.specializationIds),capabilityIds:unique(record.capabilityIds),
 dependencyIds:unique(record.dependencyIds),evidenceSummary:text(record.evidenceSummary),uncertaintyIds:unique(record.uncertaintyIds),
 authoritySummary:text(record.authoritySummary),decisionIds:unique(record.decisionIds),actionIds:unique(record.actionIds),handoffIds:unique(record.handoffIds),
 controlIds:unique(record.controlIds),consequenceIds:unique(record.consequenceIds),tradeoffIds:unique(record.tradeoffIds),externalitySummary:text(record.externalitySummary),
 externalExpertiseRequired:unique(record.externalExpertiseRequired),reassessmentTriggerRefs:unique(record.reassessmentTriggerRefs),
 validationResultId:text(record.validationResultId),limitations:unique(record.limitations),errors};
}
export function validateCIFCaseSummary(record={}) {
 const c=normalizeCIFCaseSummary(record),profile=evaluateCIFProfile(c);
 const externality=c.externalityAssessment?assessExternalityMateriality(c.externalityAssessment):null;
 const semanticIssues=[...(c.profileSelected?profile.findings.map(f=>f.message):[]),...(externality?.findings.map(f=>f.message)||[])];
 const issues=[...c.errors,...semanticIssues];
 const conformance=profile.conformance==='FAIL'||externality?.findings.some(f=>f.status==='FAIL')?'FAIL':externality?.findings.length?'INSUFFICIENT_EVIDENCE':profile.conformance;
 return {caseSummary:c,profile,externality,conformance,valid:!issues.length,status:conformance==='FAIL'?'FAIL':issues.length?'INCOMPLETE':'PASS',issues,
 readOnlyProjection:true,createsAuthority:false,createsDecision:false,createsExternalValidity:false};
}
