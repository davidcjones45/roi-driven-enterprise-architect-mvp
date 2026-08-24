const PROFILE = 'ROI-EA-BPMN-BOUNDED-AI-ASSESSMENT-V0.1';
const IMPORT_PROFILE = 'ROI-EA-BPMN-IMPORT-V0.1';
const PERMITTED_TASKS = new Set(['EVIDENCE_COMPLETENESS', 'ROUTING_SUGGESTION', 'DELAY_REWORK_DETECTION', 'TRACEABILITY_ASSEMBLY']);

const text = (value, limit = 512) => typeof value === 'string' ? value.trim().slice(0, limit) : '';
const immutable = (value) => Object.freeze(value);
const finding = (type, message, sourceElementIds = []) => immutable({ type, message, sourceElementIds: immutable([...new Set(sourceElementIds.filter(Boolean))].sort()), qualification: 'QUALIFIED_ASSESSMENT_ONLY' });
const sourceIsControlled = (model) => model?.profile === IMPORT_PROFILE && model.source?.localOnly === true && /^[a-f0-9]{64}$/u.test(model.source?.sha256 || '');
const id = (kind, sourceHash, candidateId, taskType) => `BPMN-${kind}:${sourceHash}:${candidateId}:${taskType || 'UNSPECIFIED'}`;

/**
 * Compares reviewer-supplied Case 0 non-AI work with a bounded support task.
 * It records no outcome, action, authority, acceptance, completion, cost,
 * savings, or deployment decision. Missing safeguards force abstention.
 */
export function assessBpmnBoundedAiCandidates(model, reviewReferences = {}) {
  if (!sourceIsControlled(model)) return immutable({ profile: PROFILE, gate: 'GATE_D', outcome: 'HOLD', gateLabel: 'GATE_D_HOLD — CONTROLLED SOURCE REQUIRED', source: null, capabilityCases: immutable([]), economicHypotheses: immutable([]), findings: immutable([finding('REVIEW_REQUIRED', 'A controlled staged BPMN source is required before bounded-AI assessment.')]) });
  const capabilityCases = [], economicHypotheses = [], findings = [];
  const candidates = [...(model.mappingCandidates || [])].sort((left, right) => left.candidateId.localeCompare(right.candidateId));
  for (const candidate of candidates) {
    const supplied = reviewReferences[candidate.candidateId] || {};
    const taskType = text(supplied.taskType, 64).toUpperCase();
    if (!taskType) continue;
    const sourceElementIds = [candidate.sourceId];
    const nonAiBaseline = text(supplied.nonAiBaseline);
    const permittedInputSummary = text(supplied.permittedInputSummary);
    const outputSummary = text(supplied.outputSummary);
    const abstentionConditions = text(supplied.abstentionConditions);
    const fallback = text(supplied.fallback);
    const accountableReviewer = text(supplied.accountableReviewer, 256);
    const assumptionSummary = text(supplied.assumptionSummary);
    const incomplete = !nonAiBaseline || !permittedInputSummary || !outputSummary || !abstentionConditions || !fallback || !accountableReviewer || !assumptionSummary;
    const permitted = PERMITTED_TASKS.has(taskType);
    const eligible = permitted && !incomplete;
    const message = !permitted ? `The proposed task type ${taskType || 'UNSPECIFIED'} is outside the permitted bounded-AI scope.` : incomplete ? 'The proposed task lacks a viable non-AI baseline, bounded inputs/output, abstention, fallback, accountable reviewer, or explicit assumptions.' : 'A bounded support candidate is source-linked and requires accountable human disposition.';
    const caseFinding = finding(eligible ? 'AI_SUPPORT_CANDIDATE' : 'AI_NOT_SUITABLE_OR_INSUFFICIENT_EVIDENCE', message, sourceElementIds);
    findings.push(caseFinding);
    capabilityCases.push(immutable({
      id: id('AI', model.source.sha256, candidate.candidateId, taskType),
      sourceCandidateId: candidate.candidateId,
      sourceElementIds: immutable(sourceElementIds),
      taskType,
      case0: immutable({ mode: 'NON_AI_BASELINE', workDescription: nonAiBaseline || 'UNRESOLVED' }),
      candidateSupport: immutable({ permittedInputSummary: permittedInputSummary || 'UNRESOLVED', outputSummary: outputSummary || 'UNRESOLVED', taskState: eligible ? 'BOUNDED_SUPPORT_CANDIDATE' : 'ABSTAIN_AND_ROUTE_TO_HUMAN_REVIEW' }),
      abstentionConditions: abstentionConditions || 'REQUIRED_BUT_UNRESOLVED',
      nonAiFallback: fallback || 'REQUIRED_BUT_UNRESOLVED',
      accountableDisposition: immutable({ reviewer: accountableReviewer || 'REQUIRED_BUT_UNRESOLVED', state: 'HUMAN_DISPOSITION_REQUIRED' }),
      prohibitedActions: immutable(['AUTHORITY_INTERPRETATION', 'LEGAL_APPLICABILITY_CONCLUSION', 'CUSTOMER_DECISION', 'WORK_ACCEPTANCE', 'EXCEPTION_APPROVAL', 'COMPLETION_INFERENCE', 'ESCALATION_DECISION', 'RECOVERY_OR_RESUMPTION_AUTHORIZATION']),
      assumptions: immutable([assumptionSummary || 'REQUIRED_BUT_UNRESOLVED']),
      finding: caseFinding,
    }));
    if (eligible) economicHypotheses.push(immutable({ id: id('HYP', model.source.sha256, candidate.candidateId, taskType), sourceCandidateId: candidate.candidateId, sourceElementIds: immutable(sourceElementIds), type: 'MODELED_EFFICIENCY_HYPOTHESIS', comparator: 'CASE_0_NON_AI_BASELINE', assumptionSummary, state: 'UNQUANTIFIED_REVIEW_REQUIRED' }));
  }
  if (!capabilityCases.length) findings.push(finding('REVIEW_REQUIRED', 'No bounded-AI candidate is proposed; a viable non-AI baseline remains the only represented path.'));
  const outcome = capabilityCases.length && capabilityCases.every((item) => item.finding.type === 'AI_SUPPORT_CANDIDATE') ? 'REVIEW_READY' : 'CONDITIONAL';
  return immutable({ profile: PROFILE, gate: 'GATE_D', outcome, gateLabel: outcome === 'REVIEW_READY' ? 'GATE_D_REVIEW_READY — BOUNDED SUPPORT CANDIDATES REQUIRE HUMAN DISPOSITION' : 'GATE_D_CONDITIONAL — NON-AI BASELINE OR BOUNDED-AI SAFEGUARDS REMAIN UNRESOLVED', source: immutable({ sha256: model.source.sha256, fileName: model.source.fileName, byteLength: model.source.byteLength }), capabilityCases: immutable(capabilityCases), economicHypotheses: immutable(economicHypotheses), findings: immutable(findings) });
}

export { PERMITTED_TASKS };
