import { effectiveAuthorityState } from './authority-model.mjs';

export function authorityDossierSnapshot(authority={}, asOf='') {
  const evaluationDate=String(asOf||'').slice(0,10);
  const calculated=effectiveAuthorityState(authority,evaluationDate);
  const evidence=(authority.evidenceRequirements||[])[0]||{};
  const effective=calculated.state==='Effective — controlled authority';
  return {
    storedLifecycleLabel:authority.status||'Not stated',
    decision:authority.decision||'Not recorded',
    decisionDate:authority.decisionDate||authority.effectiveDate||'Not stated',
    evaluationDate:evaluationDate||'Date required',
    effectiveState:calculated.state,
    evidenceAssessmentState:evidence.assessmentState||authority.evidenceAssessmentState||'not assessed',
    permittedOperation:effective
      ? (authority.permittedActions||'Only the explicitly recorded permitted actions.')
      : 'No current operating authority under this envelope.',
    reason:(calculated.reasons||[]).join(' ')||'No calculated reason recorded.'
  };
}

export function erirRetrievalStatus({configured=false, attempted=false, requestedIds=[], returnedIds=[], missingIds=[], retrievedAt='', error='', sourceKind='read-only retrieval'}={}) {
  const requested=[...new Set(requestedIds.filter(Boolean))];
  const returned=[...new Set(returnedIds.filter(Boolean))];
  const missing=[...new Set(missingIds.filter(Boolean))];
  let state='NOT CONFIGURED';
  if(configured && !attempted) state='CONFIGURED / NOT ATTEMPTED';
  if(configured && attempted && error) state='UNAVAILABLE';
  if(configured && attempted && !error && !returned.length) state='ZERO RECORDS RETURNED';
  if(configured && attempted && !error && returned.length && (missing.length || returned.length<requested.length)) state='PARTIAL RETURN';
  if(configured && attempted && !error && returned.length && !missing.length && returned.length===requested.length) state='COMPLETE RETURN';
  return {
    state, configured, attempted, sourceKind, retrievedAt:retrievedAt||'Not attempted', requestedIds:requested,
    returnedIds:returned, missingIds:missing,
    applicabilityReview:'UNRESOLVED — qualified applicability review required',
    qualification:'Retrieval verifies only that a read-only record was returned. It does not establish applicability, obligation, legal sufficiency, compliance, control effectiveness, or organizational authorization.',
    error:error||''
  };
}
