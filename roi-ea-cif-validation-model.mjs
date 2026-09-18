const text=v=>String(v??'').trim();
const list=v=>Array.isArray(v)?v:v==null?[]:[v];
const unique=v=>[...new Set(list(v).map(text).filter(Boolean))];
export const REPRESENTABILITY_STATES=Object.freeze(['PASS','PASS_WITH_AMBIGUITY','FAIL_GAP','FAIL_CATEGORY_ERROR']);
export const CONFORMANCE_STATES=Object.freeze(['PASS','CONDITIONAL','FAIL','NOT_APPLICABLE','INSUFFICIENT_EVIDENCE']);
export const EXTERNAL_VALIDITY_STATES=Object.freeze(['ESTABLISHED_FOR_SCOPE','PARTIALLY_ESTABLISHED','NOT_ESTABLISHED','OUTSIDE_CIF_DETERMINATION']);
export function normalizeCIFValidationResult(record={}) {
  const r=text(record.representability).toUpperCase(),c=text(record.conformance).toUpperCase(),v=text(record.externalValidity).toUpperCase(),errors=[];
  if(!text(record.id)) errors.push('validation id is required.');
  if(!text(record.subjectId)) errors.push('subjectId is required.');
  if(!REPRESENTABILITY_STATES.includes(r)) errors.push('representability status is not recognized.');
  if(!CONFORMANCE_STATES.includes(c)) errors.push('conformance status is not recognized.');
  if(!EXTERNAL_VALIDITY_STATES.includes(v)) errors.push('externalValidity status is not recognized.');
  return {id:text(record.id),subjectId:text(record.subjectId),representability:r,conformance:c,externalValidity:v,
    basisRefs:unique(record.basisRefs),evidenceRefs:unique(record.evidenceRefs),limitationRefs:unique(record.limitationRefs),
    reviewerId:text(record.reviewerId),recordedAt:text(record.recordedAt),errors};
}
export function evaluateCIFValidation(record={}) {
  const result=normalizeCIFValidationResult(record);
  return {result,valid:!result.errors.length,status:result.errors.length?'INCOMPLETE':'PASS',issues:result.errors,
    overallCIFPass:null,representabilityDoesNotImplyConformance:true,conformanceDoesNotImplyExternalValidity:true};
}
