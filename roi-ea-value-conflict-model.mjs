const text=v=>String(v??'').trim();
const list=v=>Array.isArray(v)?v:v==null?[]:[v];
const unique=v=>[...new Set(list(v).map(text).filter(Boolean))];
export const TRADEOFF_METHODS=Object.freeze(['NO_FORMAL_AGGREGATION','THRESHOLD_OR_CONSTRAINT','ORDINAL_COMPARISON','WEIGHTED_MULTI_CRITERIA','UTILITY_BASED','COST_BENEFIT','COST_EFFECTIVENESS','PARETO_OR_DOMINANCE','DELIBERATIVE_JUDGMENT','NEGOTIATED_AGREEMENT','AUTHORITY_BASED_RESOLUTION','HYBRID']);
export const COMPARISON_STATUSES=Object.freeze(['COMPARABLE','INCOMMENSURATE','NOT_REDUCIBLE_TO_SINGLE_SCALE','UNRESOLVED']);
export function normalizeValueConflictProfile(record={}) {
 const method=text(record.decisionMethod).toUpperCase(),cs=text(record.comparisonStatus||'UNRESOLVED').toUpperCase(),errors=[];
 if(!text(record.id)) errors.push('tradeoff profile id is required.'); if(!text(record.decisionId)) errors.push('decisionId is required.');
 if(!unique(record.conflictTypes).length) errors.push('at least one conflictType is required.'); if(!unique(record.alternativeIds).length) errors.push('at least one alternativeId is required.');
 if(!text(record.decisionAuthorityId)) errors.push('decisionAuthorityId is required.'); if(!TRADEOFF_METHODS.includes(method)) errors.push('decisionMethod is not recognized.');
 if(!COMPARISON_STATUSES.includes(cs)) errors.push('comparisonStatus is not recognized.');
 return {id:text(record.id),decisionId:text(record.decisionId),contextId:text(record.contextId),conflictTypes:unique(record.conflictTypes),
 valueIds:unique(record.valueIds),objectiveIds:unique(record.objectiveIds),preferenceIds:unique(record.preferenceIds),constraintIds:unique(record.constraintIds),
 rightsIds:unique(record.rightsIds),obligationIds:unique(record.obligationIds),alternativeIds:unique(record.alternativeIds),
 expectedConsequenceIds:unique(record.expectedConsequenceIds),affectedActorIds:unique(record.affectedActorIds),decisionMethod:method,
 criteria:list(record.criteria),weights:list(record.weights),comparisonStatus:cs,uncertaintyIds:unique(record.uncertaintyIds),
 assumptionIds:unique(record.assumptionIds),evidenceIds:unique(record.evidenceIds),distributionalEffects:list(record.distributionalEffects),
 timeHorizonEffects:list(record.timeHorizonEffects),reversibilityEffects:list(record.reversibilityEffects),decisionAuthorityId:text(record.decisionAuthorityId),
 recommendationId:text(record.recommendationId),selectedAlternativeId:text(record.selectedAlternativeId),decisionBasisId:text(record.decisionBasisId),
 dissentIds:unique(record.dissentIds),reassessmentTriggerRefs:unique(record.reassessmentTriggerRefs),errors};
}
export function validateValueConflictProfile(record={}) {
 const p=normalizeValueConflictProfile(record),issues=[...p.errors];
 if(p.selectedAlternativeId&&!p.alternativeIds.includes(p.selectedAlternativeId)) issues.push('selectedAlternativeId must be one of alternativeIds.');
 if(p.decisionMethod==='WEIGHTED_MULTI_CRITERIA'&&!p.weights.length) issues.push('weighted multi-criteria method requires explicit weights and provenance in the calling record.');
 return {profile:p,valid:!issues.length,status:issues.length?'INCOMPLETE':'PASS',issues,rankingCreatesDecision:false,
 benefitOverridesConstraint:false,consensusCreatesAuthority:false,incommensurabilityIsFailure:false};
}
