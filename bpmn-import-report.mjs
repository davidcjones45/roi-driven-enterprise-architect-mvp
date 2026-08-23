import { assertNormalizedImportModel, stableJson } from './bpmn-import-model.mjs';

export function buildBpmnImportReport(model, commitRecord = null) {
  assertNormalizedImportModel(model);
  const counts = (items, key) => Object.fromEntries([...new Set(items.map((item) => item[key]))].sort().map((value) => [value, items.filter((item) => item[key] === value).length]));
  return {
    reportProfile: 'ROI-EA-BPMN-IMPORT-REPORT-V0.1',
    source: { fileName: model.source.fileName, sha256: model.source.sha256, byteLength: model.source.byteLength, importedAt: model.source.importedAt, localOnly: true },
    parser: { ...model.parser },
    importStatus: model.status,
    inventory: { elementCount: model.elements.length, relationshipCount: model.relationships.length, byBpmnType: counts(model.elements, 'bpmnType') },
    diagnostics: { count: model.diagnostics.length, bySeverity: counts(model.diagnostics, 'severity'), items: model.diagnostics },
    mapping: {
      candidateCount: model.mappingCandidates.length,
      byCandidateType: counts(model.mappingCandidates, 'candidateType'),
      byDisposition: counts(model.mappingCandidates, 'disposition'),
      candidateDispositions: model.mappingCandidates.map((item) => ({ candidateId: item.candidateId, sourceId: item.sourceId, candidateType: item.candidateType, disposition: item.disposition, reviewHistory: item.reviewHistory })),
    },
    unresolved: model.mappingCandidates.filter((item) => item.disposition === 'PENDING_REVIEW' || item.disposition === 'REVISED').map((item) => ({ candidateId: item.candidateId, sourceId: item.sourceId, disposition: item.disposition, qualificationFlags: item.qualificationFlags })),
    commit: commitRecord,
    limitations: ['This report does not establish BPMN conformance, operating truth, process effectiveness, authority, accountability, acceptance, compliance, federation membership, AI classification, or implementation.'],
  };
}

export function exportBpmnImportReport(model, commitRecord = null) {
  return `${stableJson(buildBpmnImportReport(model, commitRecord))}\n`;
}
