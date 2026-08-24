import { assertNormalizedImportModel } from './bpmn-import-model.mjs';

export const BPMN_DIAGRAM_VIEW_PROFILE = 'ROI-EA-BPMN-DIAGRAM-V0.1';

const FLOW_NODE_TYPES = new Set([
  'bpmn:StartEvent', 'bpmn:EndEvent', 'bpmn:IntermediateCatchEvent', 'bpmn:IntermediateThrowEvent',
  'bpmn:UserTask', 'bpmn:ManualTask', 'bpmn:ServiceTask', 'bpmn:BusinessRuleTask', 'bpmn:Task',
  'bpmn:ExclusiveGateway', 'bpmn:ParallelGateway', 'bpmn:InclusiveGateway', 'bpmn:EventBasedGateway',
  'bpmn:SubProcess', 'bpmn:CallActivity',
]);

function byId(model) { return new Map(model.elements.map((element) => [element.sourceId, element])); }

function sequenceEdges(model) {
  const outgoing = new Map();
  for (const relationship of model.relationships) {
    if (relationship.kind !== 'SEQUENCE_FLOW') continue;
    const flow = outgoing.get(relationship.sourceId) || {};
    if (relationship.sourceProperty === 'sourceRef') flow.sourceId = relationship.targetId;
    if (relationship.sourceProperty === 'targetRef') flow.targetId = relationship.targetId;
    outgoing.set(relationship.sourceId, flow);
  }
  return [...outgoing.entries()]
    .filter(([, flow]) => flow.sourceId && flow.targetId)
    .map(([id, flow]) => ({ id, ...flow }))
    .sort((left, right) => left.id.localeCompare(right.id));
}

function sourceBounds(model) {
  const elements = byId(model);
  const bounds = new Map();
  const boundsByShape = new Map();
  for (const relationship of model.relationships) {
    if (relationship.kind !== 'CONTAINMENT') continue;
    const value = elements.get(relationship.targetId);
    if (value?.bpmnType !== 'dc:Bounds') continue;
    const { x, y, width, height } = value.attributes || {};
    const normalized = [x, y, width, height].map(Number);
    if (normalized.every(Number.isFinite) && normalized[2] > 0 && normalized[3] > 0) boundsByShape.set(relationship.sourceId, { x: normalized[0], y: normalized[1], width: normalized[2], height: normalized[3] });
  }
  for (const relationship of model.relationships) {
    if (relationship.kind !== 'DI_LINK') continue;
    const shape = elements.get(relationship.sourceId);
    if (shape?.bpmnType !== 'bpmndi:BPMNShape') continue;
    const value = boundsByShape.get(shape.sourceId);
    if (value) bounds.set(relationship.targetId, value);
  }
  return bounds;
}

function layout(nodes, edges, inputBounds) {
  if (nodes.length && nodes.every((node) => inputBounds.has(node.id))) return { layout: 'SOURCE_DI', nodes: nodes.map((node) => ({ ...node, ...inputBounds.get(node.id) })) };
  const outgoing = new Map(nodes.map((node) => [node.id, []]));
  const indegree = new Map(nodes.map((node) => [node.id, 0]));
  for (const edge of edges) if (outgoing.has(edge.sourceId) && indegree.has(edge.targetId)) { outgoing.get(edge.sourceId).push(edge.targetId); indegree.set(edge.targetId, indegree.get(edge.targetId) + 1); }
  const depth = new Map(nodes.map((node) => [node.id, 0]));
  const queue = nodes.filter((node) => indegree.get(node.id) === 0).map((node) => node.id).sort();
  const ordered = new Set();
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const id = queue[cursor]; ordered.add(id);
    for (const targetId of outgoing.get(id).sort()) {
      depth.set(targetId, Math.max(depth.get(targetId), depth.get(id) + 1));
      indegree.set(targetId, indegree.get(targetId) - 1);
      if (indegree.get(targetId) === 0) queue.push(targetId);
    }
  }
  const cyclicIds = nodes.map((node) => node.id).filter((id) => !ordered.has(id)).sort();
  const finalDepth = Math.max(0, ...depth.values()) + 1;
  cyclicIds.forEach((id, index) => depth.set(id, finalDepth + index));
  const rows = new Map();
  for (const node of nodes) { const row = rows.get(depth.get(node.id)) || []; row.push(node); rows.set(depth.get(node.id), row); }
  return {
    layout: 'DETERMINISTIC_AUTO_LAYOUT',
    nodes: [...rows.entries()].flatMap(([column, row]) => row.sort((left, right) => left.id.localeCompare(right.id)).map((node, index) => ({ ...node, x: 36 + Number(column) * 210, y: 36 + index * 118, width: 160, height: 64 }))),
  };
}

export function buildBpmnDiagramView(model) {
  assertNormalizedImportModel(model);
  const nodeElements = model.elements.filter((element) => FLOW_NODE_TYPES.has(element.bpmnType)).sort((left, right) => left.sourceId.localeCompare(right.sourceId));
  const candidateBySource = new Map();
  for (const candidate of model.mappingCandidates) {
    const candidates = candidateBySource.get(candidate.sourceId) || [];
    candidates.push(candidate.candidateId);
    candidateBySource.set(candidate.sourceId, candidates);
  }
  const nodes = nodeElements.map((element) => ({ id: element.sourceId, type: element.bpmnType, label: element.name || element.sourceId, candidateIds: candidateBySource.get(element.sourceId) || [] }));
  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = sequenceEdges(model).filter((edge) => nodeIds.has(edge.sourceId) && nodeIds.has(edge.targetId));
  const positioned = layout(nodes, edges, sourceBounds(model));
  const width = Math.max(420, ...positioned.nodes.map((node) => node.x + node.width + 36));
  const height = Math.max(180, ...positioned.nodes.map((node) => node.y + node.height + 36));
  return Object.freeze({
    profile: BPMN_DIAGRAM_VIEW_PROFILE,
    sourceSha256: model.source.sha256,
    status: model.status,
    layout: positioned.layout,
    nodes: positioned.nodes,
    edges,
    width,
    height,
  });
}
