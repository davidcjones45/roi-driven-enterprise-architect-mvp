const text=v=>String(v??'').trim();
const list=v=>Array.isArray(v)?v:v==null?[]:[v];
const unique=v=>[...new Set(list(v).map(text).filter(Boolean))];
const validDate=v=>typeof v==='string'&&v.trim()&&Number.isFinite(Date.parse(v));
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
  const findings=list(record.findings),conditions=list(record.conditions);
  const violation=findings.some(f=>f.status==='FAIL')||list(record.materialViolations).length>0;
  let conformance=violation?'FAIL':c;
  if(c==='CONDITIONAL'&&!violation) {
    const validConditions=conditions.length>0&&conditions.every(x=>text(x.id)&&text(x.requirement)&&text(x.enforcementRef)&&text(x.monitorRef)&&
      validDate(x.effectiveFrom)&&validDate(x.effectiveTo)&&Date.parse(x.effectiveFrom)<Date.parse(x.effectiveTo)&&
      validDate(record.asOf)&&Date.parse(x.effectiveFrom)<=Date.parse(record.asOf)&&Date.parse(record.asOf)<Date.parse(x.effectiveTo));
    if(!validConditions) {conformance='INSUFFICIENT_EVIDENCE';errors.push('CONDITIONAL requires explicit enforceable monitored conditions valid for a bounded period at asOf.');}
  }
  if(!violation&&['PASS','CONDITIONAL'].includes(conformance)&&
    (findings.some(f=>f.status==='INSUFFICIENT_EVIDENCE')||!unique(record.evidenceRefs).length||!text(record.scope)||!unique(record.basisRefs).length)) {
    conformance='INSUFFICIENT_EVIDENCE'; errors.push('Conformance requires adequate scope, basis and evidence without unresolved material gaps.');
  }
  if(!violation&&c==='NOT_APPLICABLE'&&(!text(record.scope)||!text(record.notApplicableBasis))) {
    conformance='INSUFFICIENT_EVIDENCE';errors.push('NOT_APPLICABLE requires scope and a non-applicability basis.');
  }
  if(['ESTABLISHED_FOR_SCOPE','PARTIALLY_ESTABLISHED'].includes(v)&&
    (!text(record.scope)||!text(record.externalAuthorityRef)||!unique(record.externalEvidenceRefs).length||!validDate(record.externalEffectiveFrom)||!validDate(record.externalEffectiveTo))) {
    errors.push('External validity requires external authority/evidence, scope and effective period.');
  }
  return {...record,id:text(record.id),subjectId:text(record.subjectId),representability:r,conformance,externalValidity:v,
    basisRefs:unique(record.basisRefs),evidenceRefs:unique(record.evidenceRefs),limitationRefs:unique(record.limitationRefs),
    reviewerId:text(record.reviewerId),recordedAt:text(record.recordedAt),errors};
}
export function evaluateCIFValidation(record={}) {
  const result=normalizeCIFValidationResult(record);
  return {result,valid:!result.errors.length&&result.conformance!=='FAIL',status:result.conformance==='FAIL'?'FAIL':result.errors.length?'INCOMPLETE':'PASS',issues:result.errors,
    overallCIFPass:null,representabilityDoesNotImplyConformance:true,conformanceDoesNotImplyExternalValidity:true};
}
