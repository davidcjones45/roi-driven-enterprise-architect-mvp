import { BPMN_IMPORT_LIMITS, assertNormalizedImportModel } from './bpmn-import-model.mjs';

export function validateBpmnStructure(model) {
  const diagnostics = [...model.diagnostics];
  const ids = new Set(model.elements.map((element) => element.sourceId));
  const emitted = new Set(diagnostics.map((item) => `${item.code}|${item.sourceId}|${item.message}`));

  for (const relationship of model.relationships) {
    if (!ids.has(relationship.targetId)) {
      const message = `Unresolved ${relationship.sourceProperty} reference: ${relationship.targetId}`;
      const key = `BPMN-VAL-002|${relationship.sourceId}|${message}`;
      if (!emitted.has(key)) {
        diagnostics.push({ code: 'BPMN-VAL-002', severity: 'ERROR', message, sourceId: relationship.sourceId });
        emitted.add(key);
      }
    }
  }

  const outgoing = new Map();
  const incoming = new Map();
  const sequenceRefs = new Map();
  for (const relationship of model.relationships.filter((item) => item.kind === 'SEQUENCE_FLOW')) {
    const refs = sequenceRefs.get(relationship.sourceId) || {};
    refs[relationship.sourceProperty] = relationship.targetId;
    sequenceRefs.set(relationship.sourceId, refs);
  }
  for (const refs of sequenceRefs.values()) {
    if (refs.sourceRef) outgoing.set(refs.sourceRef, (outgoing.get(refs.sourceRef) || 0) + 1);
    if (refs.targetRef) incoming.set(refs.targetRef, (incoming.get(refs.targetRef) || 0) + 1);
  }
  const flowNodes = model.elements.filter((item) => /(?:Event|Task|Gateway|Activity|SubProcess|CallActivity)$/u.test(item.bpmnType));
  for (const node of flowNodes) {
    if (node.bpmnType === 'bpmn:StartEvent' || node.bpmnType === 'bpmn:BoundaryEvent') continue;
    if (!incoming.has(node.sourceId) && !outgoing.has(node.sourceId)) {
      diagnostics.push({ code: 'BPMN-VAL-003', severity: 'WARNING', message: 'Flow node is isolated in the modeled process', sourceId: node.sourceId });
    }
  }

  diagnostics.sort((a, b) => `${a.code}|${a.sourceId || ''}|${a.message}`.localeCompare(`${b.code}|${b.sourceId || ''}|${b.message}`));
  if (diagnostics.length > BPMN_IMPORT_LIMITS.maxDiagnostics) {
    diagnostics.length = BPMN_IMPORT_LIMITS.maxDiagnostics - 1;
    diagnostics.push({ code: 'BPMN-VAL-005', severity: 'WARNING', message: 'Additional diagnostics were omitted after the configured limit', sourceId: null });
  }
  return assertNormalizedImportModel({ ...model, diagnostics, status: model.status === 'REJECTED' ? 'REJECTED' : 'STAGED' });
}
