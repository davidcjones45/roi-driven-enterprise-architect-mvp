const PROFILE = 'ROI-EA-BPMN-HANDOFF-ASSESSMENT-V0.1';
const IMPORT_PROFILE = 'ROI-EA-BPMN-IMPORT-V0.1';

const text = (value, limit = 512) => typeof value === 'string' ? value.trim().slice(0, limit) : '';
const ids = (value) => [...new Set((Array.isArray(value) ? value : String(value || '').split(',')).map((item) => text(item, 256)).filter(Boolean))].sort();
const immutable = (value) => Object.freeze(value);
const finding = (type, message, sourceElementIds = []) => immutable({ type, message, sourceElementIds: ids(sourceElementIds), qualification: 'QUALIFIED_ASSESSMENT_ONLY' });

function sourceIsControlled(model) {
  return model?.profile === IMPORT_PROFILE && model.source?.localOnly === true && /^[a-f0-9]{64}$/u.test(model.source?.sha256 || '');
}

function sourceElementIndex(model) {
  return new Map((Array.isArray(model?.elements) ? model.elements : []).map((element) => [element.sourceId, element]));
}

function processParticipantIndex(model) {
  const index = new Map();
  for (const relationship of model.relationships || []) {
    if (relationship.sourceProperty !== 'processRef') continue;
    const participant = model.elements.find((element) => element.sourceId === relationship.sourceId && element.bpmnType === 'bpmn:Participant');
    if (participant && !index.has(relationship.targetId)) index.set(relationship.targetId, participant.sourceId);
  }
  return index;
}

function containingProcess(element, sourceElements) {
  let current = element;
  const seen = new Set();
  while (current?.containerId && !seen.has(current.sourceId)) {
    seen.add(current.sourceId);
    current = sourceElements.get(current.containerId);
    if (current?.bpmnType === 'bpmn:Process') return current.sourceId;
  }
  return '';
}

function endpoint(elementId, sourceElements, participantsByProcess) {
  const element = sourceElements.get(elementId);
  const processId = containingProcess(element, sourceElements);
  return immutable({ sourceElementId: elementId || '', processId, participantId: processId ? participantsByProcess.get(processId) || '' : '', label: text(element?.name, 512) });
}

/**
 * Builds source-linked handoff assessments only. Reviewer references are
 * retained as unverified links; this function never evaluates authority or
 * evidence, and never advances receipt, validation, or acceptance.
 */
export function assessBpmnHandoffs(model, reviewReferences = {}) {
  if (!sourceIsControlled(model)) return immutable({ profile: PROFILE, gate: 'GATE_B', outcome: 'HOLD', gateLabel: 'GATE_B_HOLD — CONTROLLED SOURCE REQUIRED', source: null, handoffs: immutable([]), findings: immutable([finding('REVIEW_REQUIRED', 'A controlled staged BPMN source is required before handoff assessment.')]) });
  const sourceElements = sourceElementIndex(model);
  const participantsByProcess = processParticipantIndex(model);
  const messageFlows = (model.elements || []).filter((element) => element.bpmnType === 'bpmn:MessageFlow').sort((a, b) => a.sourceId.localeCompare(b.sourceId));
  const handoffs = [];
  const findings = [];
  for (const messageFlow of messageFlows) {
    const relations = (model.relationships || []).filter((relationship) => relationship.kind === 'MESSAGE_FLOW' && relationship.sourceId === messageFlow.sourceId);
    const sender = endpoint(relations.find((relationship) => relationship.sourceProperty === 'sourceRef')?.targetId || '', sourceElements, participantsByProcess);
    const intendedRecipient = endpoint(relations.find((relationship) => relationship.sourceProperty === 'targetRef')?.targetId || '', sourceElements, participantsByProcess);
    const id = `BPMN-HOF:${model.source.sha256}:${messageFlow.sourceId}`;
    const supplied = reviewReferences[id] || {};
    const authorityEnvelopeId = text(supplied.authorityEnvelopeId, 256);
    const evidenceRequirementIds = ids(supplied.evidenceRequirementIds);
    const handoffFindings = [];
    const sourceElementIds = ids([messageFlow.sourceId, sender.sourceElementId, sender.processId, sender.participantId, intendedRecipient.sourceElementId, intendedRecipient.processId, intendedRecipient.participantId]);
    if (!sender.sourceElementId || !intendedRecipient.sourceElementId) handoffFindings.push(finding('UNRESOLVED_BOUNDARY', 'The message flow lacks a resolved source or target endpoint.', sourceElementIds));
    if (!sender.participantId || !intendedRecipient.participantId) handoffFindings.push(finding('UNRESOLVED_BOUNDARY', 'One or both handoff organizational participants are not represented by the source.', sourceElementIds));
    if (!authorityEnvelopeId) handoffFindings.push(finding('REVIEW_REQUIRED', 'A separately evidenced authority reference is required for accountable acceptance review.', sourceElementIds));
    if (!evidenceRequirementIds.length) handoffFindings.push(finding('MISSING_EVIDENCE', 'Evidence requirement references are required for handoff review.', sourceElementIds));
    findings.push(...handoffFindings);
    handoffs.push(immutable({
      id,
      sourceMessageFlowId: messageFlow.sourceId,
      sourceBpmnElementIds: sourceElementIds,
      modeledLabel: text(messageFlow.name, 512),
      sender,
      intendedRecipient,
      lifecycle: immutable({ transmission: 'MODELED_SOURCE_FLOW', receipt: 'UNRESOLVED', validation: 'UNRESOLVED', accountableAcceptance: 'UNRESOLVED' }),
      authorityEnvelopeId,
      authorityReferenceState: authorityEnvelopeId ? 'REVIEWER_SUPPLIED_UNVERIFIED' : 'UNRESOLVED',
      evidenceRequirementIds: immutable(evidenceRequirementIds),
      evidenceReferenceState: evidenceRequirementIds.length ? 'REVIEWER_SUPPLIED_UNVERIFIED' : 'UNRESOLVED',
      findings: immutable(handoffFindings),
    }));
  }
  if (!handoffs.length) findings.push(finding('UNRESOLVED_BOUNDARY', 'No explicit BPMN message flow is available for cross-boundary handoff assessment.'));
  const unresolved = findings.length > 0;
  const outcome = unresolved ? 'CONDITIONAL' : 'REVIEW_READY';
  return immutable({
    profile: PROFILE,
    gate: 'GATE_B',
    outcome,
    gateLabel: outcome === 'REVIEW_READY' ? 'GATE_B_REVIEW_READY — HANDOFFS SOURCE-LINKED; ACCOUNTABLE REVIEW REQUIRED' : 'GATE_B_CONDITIONAL — HANDOFF ASSESSMENT HAS EXPLICIT UNRESOLVED CONDITIONS',
    source: immutable({ sha256: model.source.sha256, fileName: model.source.fileName, byteLength: model.source.byteLength }),
    handoffs: immutable(handoffs),
    findings: immutable(findings),
  });
}
