export const BPMN_IMPORT_PROFILE = 'ROI-EA-BPMN-IMPORT-V0.1';
export const BPMN_IMPORT_LIMITS = Object.freeze({
  maxBytes: 250_000,
  maxDepth: 64,
  maxElements: 10_000,
  maxAttributes: 50_000,
  maxValueLength: 32_768,
  maxDiagnostics: 500,
});

const DIAGNOSTIC_PATTERN = /^BPMN-[A-Z]+-[0-9]{3}$/;
const CANDIDATE_TYPES = new Set(['PARTICIPANT', 'EXTERNAL_PARTY', 'PERFORMER_ROLE', 'VALUE_STREAM', 'PROCESS_STEP', 'TRANSITION', 'HANDOFF', 'ACTION', 'DEPENDENCY', 'EVIDENCE_GAP', 'DECISION_POINT', 'CONTROL_POINT', 'EXCEPTION_RECOVERY', 'TECHNICAL_CAPABILITY']);

export function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function deterministicImportProjection(model) {
  return {
    profile: model.profile,
    source: { sha256: model.source.sha256, byteLength: model.source.byteLength, mediaType: model.source.mediaType, localOnly: model.source.localOnly },
    parser: model.parser,
    definitions: model.definitions,
    elements: model.elements,
    relationships: model.relationships,
    diagnostics: model.diagnostics,
    mappingCandidates: model.mappingCandidates,
    status: model.status,
  };
}

export function assertNormalizedImportModel(model) {
  if (!model || model.profile !== BPMN_IMPORT_PROFILE) throw new TypeError('Invalid BPMN import profile');
  if (!model.source?.localOnly || !/^[a-f0-9]{64}$/.test(model.source.sha256 || '')) throw new TypeError('Invalid source provenance');
  if (!model.source.importedAt || Number.isNaN(Date.parse(model.source.importedAt))) throw new TypeError('Invalid import timestamp');
  if (model.source.byteLength < 1 || model.source.byteLength > BPMN_IMPORT_LIMITS.maxBytes) throw new TypeError('Invalid source byte length');
  if (model.parser?.library !== 'bpmn-moddle' || model.parser.libraryVersion !== '10.1.0') throw new TypeError('Unexpected parser identity');
  if (!Array.isArray(model.elements) || model.elements.length > BPMN_IMPORT_LIMITS.maxElements) throw new TypeError('Invalid element inventory');
  if (!Array.isArray(model.relationships) || model.relationships.length > 20_000) throw new TypeError('Invalid relationship inventory');
  if (!Array.isArray(model.diagnostics) || model.diagnostics.length > BPMN_IMPORT_LIMITS.maxDiagnostics) throw new TypeError('Invalid diagnostics');
  if (!Array.isArray(model.mappingCandidates) || model.mappingCandidates.length > BPMN_IMPORT_LIMITS.maxElements) throw new TypeError('Invalid mapping candidate inventory');
  if (!['REJECTED', 'STAGED', 'REVIEWED_PARTIAL', 'REVIEWED_COMPLETE'].includes(model.status)) throw new TypeError('Invalid import status');

  const ids = new Set();
  const elementsById = new Map();
  for (const element of model.elements) {
    if (!element.sourceId || ids.has(element.sourceId)) throw new TypeError(`Duplicate normalized source ID: ${element.sourceId}`);
    ids.add(element.sourceId);
    elementsById.set(element.sourceId, element);
    if (!String(element.bpmnType).startsWith('bpmn:') && !String(element.bpmnType).startsWith('bpmndi:') && !String(element.bpmnType).startsWith('di:') && !String(element.bpmnType).startsWith('dc:')) {
      if (element.supportState !== 'PRESERVED_UNMAPPED') throw new TypeError(`Unqualified element type: ${element.bpmnType}`);
    }
  }
  for (const diagnostic of model.diagnostics) {
    if (!DIAGNOSTIC_PATTERN.test(diagnostic.code)) throw new TypeError(`Invalid diagnostic code: ${diagnostic.code}`);
  }
  const candidateIds = new Set();
  for (const candidate of model.mappingCandidates) {
    if (!candidate.candidateId || candidateIds.has(candidate.candidateId)) throw new TypeError(`Duplicate mapping candidate ID: ${candidate.candidateId}`);
    candidateIds.add(candidate.candidateId);
    if (candidate.sourceSha256 !== model.source.sha256) throw new TypeError(`Mapping candidate source hash mismatch: ${candidate.candidateId}`);
    const sourceElement = elementsById.get(candidate.sourceId);
    if (!sourceElement) throw new TypeError(`Mapping candidate source element is missing: ${candidate.sourceId}`);
    if (candidate.sourceBpmnType !== sourceElement.bpmnType) throw new TypeError(`Mapping candidate source type mismatch: ${candidate.candidateId}`);
    if (!CANDIDATE_TYPES.has(candidate.candidateType)) throw new TypeError(`Invalid mapping candidate type: ${candidate.candidateId}`);
    if (!/^BPMN-MAP-[0-9]{3}$/u.test(candidate.ruleId || '')) throw new TypeError(`Invalid mapping rule: ${candidate.candidateId}`);
    if (!candidate.candidateLabel || candidate.candidateLabel.length > 512) throw new TypeError(`Invalid mapping candidate label: ${candidate.candidateId}`);
    if (!Array.isArray(candidate.relatedSourceIds) || !Array.isArray(candidate.qualificationFlags) || new Set(candidate.qualificationFlags).size !== candidate.qualificationFlags.length) throw new TypeError(`Invalid mapping candidate qualifications: ${candidate.candidateId}`);
    if (!['PENDING_REVIEW', 'ACCEPTED', 'REJECTED', 'REVISED'].includes(candidate.disposition)) throw new TypeError(`Invalid mapping disposition: ${candidate.candidateId}`);
    if (!Array.isArray(candidate.reviewHistory)) throw new TypeError(`Invalid mapping review history: ${candidate.candidateId}`);
    let priorSequence = 0;
    for (const entry of candidate.reviewHistory) {
      if (!Number.isInteger(entry.sequence) || entry.sequence !== priorSequence + 1) throw new TypeError(`Invalid mapping review sequence: ${candidate.candidateId}`);
      priorSequence = entry.sequence;
      if (!['ACCEPT', 'REJECT', 'REVISE'].includes(entry.action) || !entry.reviewer || !entry.note || Number.isNaN(Date.parse(entry.reviewedAt))) throw new TypeError(`Invalid mapping review entry: ${candidate.candidateId}`);
    }
    if (model.status === 'STAGED' && candidate.disposition !== 'PENDING_REVIEW') throw new TypeError(`Staged mapping candidate is not review-pending: ${candidate.candidateId}`);
  }
  return model;
}
