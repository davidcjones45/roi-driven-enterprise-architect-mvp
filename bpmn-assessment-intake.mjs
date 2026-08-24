const PROFILE = 'ROI-EA-BPMN-ASSESSMENT-INTAKE-V0.1';
const FLOW_NODE = /(?:Event|Task|Gateway|Activity|SubProcess|CallActivity)$/u;

function text(value, limit = 512) {
  return typeof value === 'string' ? value.trim().slice(0, limit) : '';
}

function criterion(id, state, message, sourceElementIds = []) {
  return Object.freeze({ id, state, message, sourceElementIds: [...new Set(sourceElementIds)].sort() });
}

function finding(type, message, sourceElementIds = []) {
  return Object.freeze({ type, message, sourceElementIds: [...new Set(sourceElementIds)].sort(), qualification: 'QUALIFIED_ASSESSMENT_ONLY' });
}

/**
 * Gate A evaluates only whether a controlled BPMN source is suitable for a
 * qualified assessment. It neither maps nor creates authority, evidence,
 * obligations, controls, commitments, AI candidates, or compliance results.
 */
export function evaluateBpmnAssessmentIntake(model, context = {}) {
  const assessmentPurpose = text(context.assessmentPurpose);
  const customerEndUserScope = text(context.customerEndUserScope);
  const criteria = [];
  const findings = [];
  const source = model?.source;
  const sourceValid = model?.profile === 'ROI-EA-BPMN-IMPORT-V0.1' && source?.localOnly === true && /^[a-f0-9]{64}$/u.test(source?.sha256 || '');
  criteria.push(criterion('SOURCE_PROVENANCE', sourceValid ? 'SATISFIED' : 'BLOCKED', sourceValid ? 'Controlled source provenance is retained.' : 'Controlled source provenance is missing or invalid.'));
  if (!sourceValid) findings.push(finding('REVIEW_REQUIRED', 'Controlled source provenance is required before assessment.'));

  const elements = Array.isArray(model?.elements) ? model.elements : [];
  const relationships = Array.isArray(model?.relationships) ? model.relationships : [];
  const diagnostics = Array.isArray(model?.diagnostics) ? model.diagnostics : [];
  const processIds = elements.filter((item) => item.bpmnType === 'bpmn:Process').map((item) => item.sourceId);
  const flowNodes = elements.filter((item) => FLOW_NODE.test(item.bpmnType));
  const sequenceFlows = elements.filter((item) => item.bpmnType === 'bpmn:SequenceFlow');
  const messageFlows = elements.filter((item) => item.bpmnType === 'bpmn:MessageFlow');
  const assessableFlow = processIds.length > 0 && flowNodes.length >= 2 && (sequenceFlows.length >= 1 || messageFlows.length >= 1);
  criteria.push(criterion('ASSESSABLE_FLOW', assessableFlow ? 'SATISFIED' : 'BLOCKED', assessableFlow ? 'A process and minimum reconstructable sequence or message flow are present.' : 'A process with at least two flow nodes and one sequence or message flow is required.', [...processIds, ...flowNodes.map((item) => item.sourceId), ...sequenceFlows.map((item) => item.sourceId), ...messageFlows.map((item) => item.sourceId)]));
  if (!assessableFlow) findings.push(finding('REVIEW_REQUIRED', 'The source does not represent enough process flow for a qualified assessment.', processIds));

  const participantIds = elements.filter((item) => item.bpmnType === 'bpmn:Participant' || item.bpmnType === 'bpmn:Lane').map((item) => item.sourceId);
  const participantState = participantIds.length ? 'SATISFIED' : 'UNRESOLVED';
  criteria.push(criterion('PARTICIPANT_SCOPE', participantState, participantIds.length ? 'Participant or lane notation is available for qualified boundary review.' : 'No participant or lane notation is available; organizational boundaries remain unresolved.', participantIds));
  if (!participantIds.length) findings.push(finding('UNRESOLVED_BOUNDARY', 'No participant or lane notation identifies the organizational boundary represented by the source.'));

  criteria.push(criterion('ASSESSMENT_PURPOSE', assessmentPurpose ? 'SATISFIED' : 'BLOCKED', assessmentPurpose ? 'Assessment purpose is explicitly supplied by the reviewer.' : 'An explicit assessment purpose is required; it is not inferred from BPMN labels.'));
  if (!assessmentPurpose) findings.push(finding('REVIEW_REQUIRED', 'Assessment purpose is required before qualified assessment.'));
  criteria.push(criterion('CUSTOMER_END_USER_SCOPE', customerEndUserScope ? 'SATISFIED' : 'BLOCKED', customerEndUserScope ? 'Customer/end-user scope is explicitly supplied by the reviewer.' : 'Customer/end-user scope is required; it is not inferred from BPMN labels.'));
  if (!customerEndUserScope) findings.push(finding('REVIEW_REQUIRED', 'Customer/end-user scope is required before qualified assessment.'));

  const blockingDiagnostics = diagnostics.filter((item) => ['ERROR', 'FATAL'].includes(item.severity));
  const warningDiagnostics = diagnostics.filter((item) => item.severity === 'WARNING');
  const rejected = model?.status === 'REJECTED';
  const structuralState = rejected || blockingDiagnostics.length ? 'BLOCKED' : warningDiagnostics.length ? 'UNRESOLVED' : 'SATISFIED';
  criteria.push(criterion('STRUCTURAL_RELIABILITY', structuralState, structuralState === 'SATISFIED' ? 'No blocking structural diagnostics are present.' : rejected || blockingDiagnostics.length ? 'The source is rejected or contains blocking structural diagnostics.' : 'Warnings require qualification during assessment.', blockingDiagnostics.map((item) => item.sourceId).filter(Boolean)));
  if (rejected || blockingDiagnostics.length) findings.push(finding('REVIEW_REQUIRED', 'The source is rejected or contains blocking structural diagnostics.', blockingDiagnostics.map((item) => item.sourceId).filter(Boolean)));
  if (warningDiagnostics.length) findings.push(finding('MISSING_EVIDENCE', 'Source warnings remain visible as assessment qualifications.', warningDiagnostics.map((item) => item.sourceId).filter(Boolean)));

  const blocked = criteria.some((item) => item.state === 'BLOCKED');
  const unresolved = criteria.some((item) => item.state === 'UNRESOLVED');
  const outcome = blocked ? 'HOLD' : unresolved ? 'CONDITIONAL' : 'PASS';
  const gate = outcome === 'PASS' ? 'GATE_A_PASS — SOURCE SUITABLE FOR QUALIFIED ASSESSMENT' : outcome === 'CONDITIONAL' ? 'GATE_A_CONDITIONAL — ASSESSMENT MAY PROCEED WITH EXPLICIT LIMITATIONS' : 'GATE_A_HOLD — SOURCE INTAKE INSUFFICIENT OR UNRELIABLE';
  return Object.freeze({
    profile: PROFILE,
    gate: 'GATE_A',
    outcome,
    gateLabel: gate,
    source: sourceValid ? Object.freeze({ sha256: source.sha256, fileName: source.fileName, byteLength: source.byteLength }) : null,
    context: Object.freeze({ assessmentPurpose, customerEndUserScope }),
    criteria: Object.freeze(criteria),
    findings: Object.freeze(findings),
    sourceSummary: Object.freeze({ processCount: processIds.length, flowNodeCount: flowNodes.length, sequenceFlowCount: sequenceFlows.length, messageFlowCount: messageFlows.length, participantOrLaneCount: participantIds.length, relationshipCount: relationships.length, diagnosticCount: diagnostics.length }),
  });
}
