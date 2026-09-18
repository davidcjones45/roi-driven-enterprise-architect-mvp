const text=v=>String(v??'').trim();
const list=v=>Array.isArray(v)?v:v==null?[]:[v];
const unique=v=>[...new Set(list(v).map(text).filter(Boolean))];
export const UNCERTAINTY_SOURCES=Object.freeze(['EVIDENCE_INSUFFICIENCY','EVIDENCE_CONFLICT','MEASUREMENT_UNCERTAINTY','ALEATORIC_VARIABILITY','EPISTEMIC_UNCERTAINTY','MODEL_STRUCTURAL_UNCERTAINTY','SEMANTIC_UNCERTAINTY','FUTURE_SCENARIO_UNCERTAINTY']);
export const FORECAST_TYPES=Object.freeze(['POINT_FORECAST','INTERVAL_FORECAST','PROBABILISTIC_FORECAST','CONDITIONAL_FORECAST','SCENARIO_FORECAST','RANGE_OR_BOUNDS','DIRECTIONAL_FORECAST','QUALITATIVE_ASSESSMENT']);
export const UNCERTAINTY_STATUSES=Object.freeze(['QUANTIFIED','PARTIALLY_QUANTIFIED','QUALITATIVELY_CHARACTERIZED','KNOWN_BUT_UNQUANTIFIED','UNKNOWN_EXTENT','NOT_ASSESSED']);
export function normalizeUncertaintyProfile(record={}) {
 const sources=unique(record.uncertaintySources).map(x=>x.toUpperCase()),status=text(record.uncertaintyStatus||'NOT_ASSESSED').toUpperCase(),errors=[];
 if(!text(record.id)) errors.push('uncertainty profile id is required.'); if(!text(record.subjectClaimId)) errors.push('subjectClaimId is required.');
 if(sources.some(x=>!UNCERTAINTY_SOURCES.includes(x))) errors.push('one or more uncertaintySources are not recognized.');
 if(!UNCERTAINTY_STATUSES.includes(status)) errors.push('uncertaintyStatus is not recognized.');
 return {id:text(record.id),subjectClaimId:text(record.subjectClaimId),contextId:text(record.contextId),uncertaintySources:sources,uncertaintyStatus:status,
 evidenceIds:unique(record.evidenceIds),contradictionEvidenceIds:unique(record.contradictionEvidenceIds),representationMethod:text(record.representationMethod),
 confidence:record.confidence??null,confidenceMethod:text(record.confidenceMethod),probabilityRepresentation:record.probabilityRepresentation??null,
 assumptionIds:unique(record.assumptionIds),conditionIds:unique(record.conditionIds),limitationIds:unique(record.limitationIds),
 decisionIds:unique(record.decisionIds),decisionSensitivity:text(record.decisionSensitivity||'UNKNOWN').toUpperCase(),
 reductionOptions:unique(record.reductionOptions),reassessmentTriggerRefs:unique(record.reassessmentTriggerRefs),errors};
}
export function normalizeForecastProfile(record={}) {
 const t=text(record.forecastType).toUpperCase(),errors=[];
 if(!text(record.id)) errors.push('forecast id is required.'); if(!text(record.claimId)) errors.push('claimId is required.');
 if(!text(record.forecasterId)) errors.push('forecasterId is required.'); if(!FORECAST_TYPES.includes(t)) errors.push('forecastType is not recognized.');
 if(!text(record.forecastHorizon)) errors.push('forecastHorizon is required.'); if(!text(record.methodRef)) errors.push('methodRef is required.');
 if(!text(record.uncertaintyProfileId)) errors.push('uncertaintyProfileId is required.');
 return {id:text(record.id),claimId:text(record.claimId),forecasterId:text(record.forecasterId),contextId:text(record.contextId),forecastType:t,
 generatedAt:text(record.generatedAt),dataCutoff:text(record.dataCutoff),forecastHorizon:text(record.forecastHorizon),methodRef:text(record.methodRef),
 evidenceIds:unique(record.evidenceIds),assumptionIds:unique(record.assumptionIds),conditionIds:unique(record.conditionIds),pointEstimate:record.pointEstimate??null,
 interval:record.interval??null,probabilityDistribution:record.probabilityDistribution??null,scenarioIds:unique(record.scenarioIds),confidence:record.confidence??null,
 uncertaintyProfileId:text(record.uncertaintyProfileId),calibrationEvidenceIds:unique(record.calibrationEvidenceIds),limitationIds:unique(record.limitationIds),
 decisionRelevanceIds:unique(record.decisionRelevanceIds),reassessmentTriggerRefs:unique(record.reassessmentTriggerRefs),errors};
}
export function validateForecastWithUncertainty({forecast={},uncertainty={}}={}) {
 const f=normalizeForecastProfile(forecast),u=normalizeUncertaintyProfile(uncertainty),issues=[...f.errors,...u.errors];
 if(f.uncertaintyProfileId&&f.uncertaintyProfileId!==u.id) issues.push('forecast uncertaintyProfileId does not match supplied uncertainty profile.');
 if(u.subjectClaimId&&f.claimId&&u.subjectClaimId!==f.claimId) issues.push('uncertainty profile and forecast must concern the same claim.');
 return {forecast:f,uncertainty:u,valid:!issues.length,status:issues.length?'INCOMPLETE':'PASS',issues,
 forecastIsFact:false,confidenceIsProbability:false,probabilityIsEvidenceQuality:false,forecastCreatesDecision:false};
}
