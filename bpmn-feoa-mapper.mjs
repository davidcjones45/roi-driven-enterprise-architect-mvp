import { assertNormalizedImportModel } from './bpmn-import-model.mjs';

const BASE_FLAGS = Object.freeze([
  'CANONICAL_COMMIT_NOT_AUTHORIZED',
  'HUMAN_REVIEW_REQUIRED',
  'LABEL_UNTRUSTED_SOURCE_TEXT',
  'SOURCE_MODELED_ONLY',
]);

export const BPMN_MAPPING_RULES = Object.freeze([
  { ruleId: 'BPMN-MAP-001', candidateType: 'VALUE_STREAM', matches: (element) => element.bpmnType === 'bpmn:Process', flags: ['CURRENT_OPERATION_UNVERIFIED', 'SCOPE_UNVERIFIED'] },
  { ruleId: 'BPMN-MAP-002', candidateType: 'PARTICIPANT', matches: (element) => element.bpmnType === 'bpmn:Participant', flags: ['ACCOUNTABILITY_UNRESOLVED', 'FEDERATION_MEMBERSHIP_UNRESOLVED', 'LEGAL_IDENTITY_UNRESOLVED'] },
  { ruleId: 'BPMN-MAP-003', candidateType: 'PERFORMER_ROLE', matches: (element) => element.bpmnType === 'bpmn:Lane', flags: ['AUTHORITY_UNRESOLVED', 'CAPACITY_UNRESOLVED'] },
  { ruleId: 'BPMN-MAP-004', candidateType: 'PROCESS_STEP', matches: (element) => /^(?:bpmn:(?:Task|UserTask|ManualTask|BusinessRuleTask|SendTask|ReceiveTask|ScriptTask|SubProcess|CallActivity))$/u.test(element.bpmnType), flags: ['BASELINE_UNRESOLVED', 'CURRENT_STATE_UNVERIFIED', 'EVIDENCE_UNRESOLVED', 'OWNER_UNRESOLVED'] },
  { ruleId: 'BPMN-MAP-005', candidateType: 'TRANSITION', matches: (element) => element.bpmnType === 'bpmn:SequenceFlow', flags: ['SUCCESS_UNVERIFIED', 'TIMING_UNRESOLVED'] },
  { ruleId: 'BPMN-MAP-006', candidateType: 'HANDOFF', matches: (element) => element.bpmnType === 'bpmn:MessageFlow', flags: ['ACCEPTANCE_UNRESOLVED', 'COMMITMENT_UNRESOLVED', 'DELIVERY_UNVERIFIED', 'PERMITTED_INFORMATION_USE_UNRESOLVED'] },
  { ruleId: 'BPMN-MAP-007', candidateType: 'TECHNICAL_CAPABILITY', matches: (element) => element.bpmnType === 'bpmn:ServiceTask', flags: ['ACTION_AUTHORITY_UNRESOLVED', 'AI_CLASSIFICATION_UNRESOLVED', 'IMPLEMENTATION_UNVERIFIED'] },
  { ruleId: 'BPMN-MAP-008', candidateType: 'DECISION_POINT', matches: (element) => /^(?:bpmn:(?:ExclusiveGateway|InclusiveGateway|EventBasedGateway|ComplexGateway))$/u.test(element.bpmnType), flags: ['DECISION_AUTHORITY_UNRESOLVED', 'RULE_EVIDENCE_UNRESOLVED'] },
  { ruleId: 'BPMN-MAP-009', candidateType: 'CONTROL_POINT', matches: (element) => element.bpmnType === 'bpmn:ParallelGateway', flags: ['CONTROL_EFFECTIVENESS_UNVERIFIED', 'SYNCHRONIZATION_SEMANTICS_UNVERIFIED'] },
  { ruleId: 'BPMN-MAP-010', candidateType: 'EXCEPTION_RECOVERY', matches: (element) => /^(?:bpmn:(?:BoundaryEvent|ErrorEventDefinition|EscalationEventDefinition|CancelEventDefinition|CompensateEventDefinition|TerminateEventDefinition))$/u.test(element.bpmnType), flags: ['RECOVERY_OWNER_UNRESOLVED', 'RESIDUAL_ACCOUNTABILITY_UNRESOLVED'] },
  { ruleId: 'BPMN-MAP-011', candidateType: 'DEPENDENCY', matches: (element) => /^(?:bpmn:(?:DataObject|DataObjectReference|DataInputAssociation|DataOutputAssociation|Association))$/u.test(element.bpmnType), flags: ['CLASSIFICATION_UNRESOLVED', 'PERMISSION_UNRESOLVED', 'PROVENANCE_UNRESOLVED', 'QUALITY_UNRESOLVED'] },
  { ruleId: 'BPMN-MAP-012', candidateType: 'EVIDENCE_GAP', matches: (element) => element.supportState !== 'SUPPORTED', flags: ['EXTENSION_UNTRUSTED', 'SEMANTICS_UNMAPPED'] },
]);

function isDiagramType(type) {
  return /^(?:bpmndi|di|dc):/u.test(type);
}

function elementIndex(model) {
  return new Map(model.elements.map((element) => [element.sourceId, element]));
}

function isWithinDeferredElement(element, elements) {
  let current = element;
  const visited = new Set();
  while (current && !visited.has(current.sourceId)) {
    visited.add(current.sourceId);
    if (current !== element && current.supportState !== 'SUPPORTED') return true;
    current = elements.get(current.containerId);
  }
  return false;
}

function relatedSourceIds(model, sourceId) {
  return [...new Set(model.relationships.filter((relationship) => relationship.sourceId === sourceId).map((relationship) => relationship.targetId))].sort();
}

async function candidateId(sourceHash, sourceId, ruleId) {
  const bytes = new TextEncoder().encode(`${sourceHash}|${sourceId}|${ruleId}`);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  const shortHash = [...new Uint8Array(digest).slice(0, 12)].map((value) => value.toString(16).padStart(2, '0')).join('');
  return `BPMN-CAND-${ruleId.slice(-3)}-${shortHash}`;
}

function labelFor(element, candidateType) {
  const sourceLabel = String(element.name || '').trim() || element.sourceId;
  return `${candidateType}: ${sourceLabel}`.slice(0, 512);
}

export async function mapBpmnToFeoaCandidates(model) {
  assertNormalizedImportModel(model);
  if (model.status === 'REJECTED') return { ...model, mappingCandidates: [] };

  const elements = elementIndex(model);
  const sourceHasErrors = model.diagnostics.some((item) => ['ERROR', 'FATAL'].includes(item.severity));
  const candidates = [];
  for (const element of model.elements) {
    if (isDiagramType(element.bpmnType) || isWithinDeferredElement(element, elements)) continue;
    const rule = BPMN_MAPPING_RULES.find((candidateRule) => candidateRule.matches(element));
    if (!rule) continue;
    const qualificationFlags = [...new Set([
      ...BASE_FLAGS,
      ...rule.flags,
      ...(Object.keys(element.extensionAttributes).length ? ['EXTENSION_PRESENT_UNTRUSTED'] : []),
      ...(sourceHasErrors ? ['SOURCE_HAS_STRUCTURAL_ERRORS'] : []),
    ])].sort();
    candidates.push({
      candidateId: await candidateId(model.source.sha256, element.sourceId, rule.ruleId),
      sourceId: element.sourceId,
      sourceSha256: model.source.sha256,
      sourceBpmnType: element.bpmnType,
      candidateType: rule.candidateType,
      candidateLabel: labelFor(element, rule.candidateType),
      relatedSourceIds: relatedSourceIds(model, element.sourceId),
      ruleId: rule.ruleId,
      qualificationFlags,
      disposition: 'PENDING_REVIEW',
      reviewerNote: null,
      reviewHistory: [],
    });
  }
  candidates.sort((left, right) => left.candidateId.localeCompare(right.candidateId));
  return assertNormalizedImportModel({ ...model, mappingCandidates: candidates, status: 'STAGED' });
}
