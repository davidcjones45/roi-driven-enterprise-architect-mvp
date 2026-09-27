import { normalizeGraphNode, normalizeGraphEdge } from './dependency-graph-model.mjs';

const NODE_TYPE_BY_BPMN = {
  'bpmn:Process':'process','bpmn:SubProcess':'process','bpmn:Task':'activity','bpmn:UserTask':'activity',
  'bpmn:ServiceTask':'activity','bpmn:ManualTask':'activity','bpmn:BusinessRuleTask':'activity',
  'bpmn:ScriptTask':'activity','bpmn:SendTask':'activity','bpmn:ReceiveTask':'activity',
  'bpmn:CallActivity':'activity','bpmn:Participant':'org-unit','bpmn:Lane':'role',
  'bpmn:DataObjectReference':'data','bpmn:DataStoreReference':'data',
};

const EDGE_BY_RELATION = {
  'SEQUENCE_FLOW':['depends-on','process'],
  'MESSAGE_FLOW':['coordinates-with','organizational'],
  'DATA_ASSOCIATION':['uses-data','informational'],
  'LANE_ALLOCATION':['performs','human'],
  'ASSOCIATION':['depends-on','unknown'],
  'REFERENCE':['depends-on','unknown'],
};

export function bpmnImportToDependencyGraph(model={}) {
  if(!Array.isArray(model.elements) || !Array.isArray(model.relationships)) throw new TypeError('Normalized BPMN import model is required.');
  const elementIds=new Set(model.elements.map(e=>e.sourceId));
  const nodes=model.elements
    .filter(e=>NODE_TYPE_BY_BPMN[e.bpmnType])
    .map(e=>normalizeGraphNode({
      id:`BPMN-${e.sourceId}`,
      label:e.name || e.sourceId,
      nodeType:NODE_TYPE_BY_BPMN[e.bpmnType],
      description:e.bpmnType,
      sourceSystem:'BPMN',
      sourceReference:`${model.source?.sha256||'unknown'}#${e.sourceId}`,
      tags:[e.bpmnType],
    }));
  const mappedIds=new Set(nodes.map(n=>n.id));
  const edges=[]; const unresolved=[];
  for(const rel of model.relationships){
    const semantics=EDGE_BY_RELATION[rel.kind];
    if(!semantics) continue;
    const sourceId=`BPMN-${rel.sourceId}`, targetId=`BPMN-${rel.targetId}`;
    if(!elementIds.has(rel.sourceId) || !elementIds.has(rel.targetId) || !mappedIds.has(sourceId) || !mappedIds.has(targetId)){
      unresolved.push({kind:rel.kind,sourceId:rel.sourceId,targetId:rel.targetId,reason:'One or both BPMN elements are outside the dependency adapter mapping profile.'});
      continue;
    }
    edges.push(normalizeGraphEdge({
      id:`BPMN-REL-${rel.kind}-${rel.sourceId}-${rel.targetId}`,
      sourceId,targetId,
      edgeType:semantics[0], dimension:semantics[1],
      resolutionState:'Resolved',
      sourceReference:`${model.source?.sha256||'unknown'}#${rel.sourceId}->${rel.targetId}`,
    }));
  }
  return {
    nodes,edges,unresolved,
    source:{type:'BPMN',sha256:model.source?.sha256||'',status:model.status||''},
    limitations:[
      'BPMN-derived dependencies represent modeled process structure, not verified operating truth.',
      'Import does not establish authority, accountability, implementation state, control effectiveness, or essentiality.',
    ]
  };
}
