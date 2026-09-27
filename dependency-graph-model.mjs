import { stableId } from './authority-model.mjs';

export const GRAPH_NODE_TYPES = [
  'application','process','activity','role','person','org-unit','data','infrastructure',
  'vendor','authority','external-service','resource','continuity-anchor','essential-action','unknown'
];

export const GRAPH_EDGE_TYPES = [
  'depends-on','performs','owns','supplies','authorizes','uses-data','uses-service','reports-to',
  'participates-in','supports','fallback-for','coordinates-with','unknown'
];

export const DEPENDENCY_DIMENSIONS = [
  'technical','informational','human','organizational','financial','physical','institutional',
  'authority','vendor','relational','process','unknown'
];

export const DEPENDENCY_STATES = ['Resolved','Partially resolved','Unresolved'];
export const ESSENTIALITY_LEVELS = ['Unknown','Supporting','Important','Essential'];

const list = value => Array.isArray(value)
  ? value.map(String).map(v=>v.trim()).filter(Boolean)
  : String(value||'').split(/[;,\n]/).map(v=>v.trim()).filter(Boolean);
const unique = values => [...new Set(values)];
const finiteOrNull = value => {
  if(value === '' || value === null || value === undefined) return null;
  const n = Number(value); return Number.isFinite(n) ? n : null;
};

export function normalizeGraphNode(raw={}) {
  const nodeType = GRAPH_NODE_TYPES.includes(raw.nodeType) ? raw.nodeType : 'unknown';
  const label = String(raw.label || raw.name || raw.id || 'Unlabeled node').trim();
  return {
    ...raw,
    id: raw.id || stableId(`${nodeType}-${label}`,'DGN'),
    label,
    nodeType,
    description: raw.description || '',
    owner: raw.owner || '',
    sourceSystem: raw.sourceSystem || '',
    sourceReference: raw.sourceReference || '',
    evidenceRefs: unique(list(raw.evidenceRefs)),
    tags: unique(list(raw.tags)),
    active: raw.active !== false,
  };
}

export function normalizeGraphEdge(raw={}) {
  const edgeType = GRAPH_EDGE_TYPES.includes(raw.edgeType) ? raw.edgeType : 'depends-on';
  const dimension = DEPENDENCY_DIMENSIONS.includes(raw.dimension) ? raw.dimension : 'unknown';
  const sourceId = String(raw.sourceId || '').trim();
  const targetId = String(raw.targetId || '').trim();
  return {
    ...raw,
    id: raw.id || stableId(`${sourceId||'unknown'}-${edgeType}-${targetId||'unknown'}`,'DGE'),
    sourceId,
    targetId,
    edgeType,
    dimension,
    criticality: raw.criticality || 'Unknown',
    confidence: finiteOrNull(raw.confidence),
    resolutionState: DEPENDENCY_STATES.includes(raw.resolutionState)
      ? raw.resolutionState
      : (sourceId && targetId ? 'Resolved' : 'Unresolved'),
    toleranceMinutes: finiteOrNull(raw.toleranceMinutes),
    failureImpact: raw.failureImpact || '',
    sourceReference: raw.sourceReference || '',
    evidenceRefs: unique(list(raw.evidenceRefs)),
    sharedFailureDomain: raw.sharedFailureDomain || '',
    notes: raw.notes || '',
  };
}

export function normalizeContinuityAnchor(raw={}) {
  const label = String(raw.label || raw.name || raw.id || 'Continuity anchor').trim();
  return {
    ...raw,
    id: raw.id || stableId(label,'CA'),
    label,
    description: raw.description || '',
    owner: raw.owner || '',
    outcomeRefs: unique(list(raw.outcomeRefs)),
    evidenceRefs: unique(list(raw.evidenceRefs)),
  };
}

export function normalizeEssentialAction(raw={}) {
  const label = String(raw.label || raw.name || raw.id || 'Essential action').trim();
  const essentiality = ESSENTIALITY_LEVELS.includes(raw.essentiality) ? raw.essentiality : 'Essential';
  return {
    ...raw,
    id: raw.id || stableId(label,'EA'),
    label,
    anchorId: raw.anchorId || '',
    essentiality,
    description: raw.description || '',
    owner: raw.owner || '',
    toleranceMinutes: finiteOrNull(raw.toleranceMinutes),
    dependencyNodeIds: unique(list(raw.dependencyNodeIds)),
    fallbackNodeIds: unique(list(raw.fallbackNodeIds)),
    bufferDescription: raw.bufferDescription || '',
    recoveryDescription: raw.recoveryDescription || '',
    evidenceRefs: unique(list(raw.evidenceRefs)),
  };
}

function modernizationNode(app={}) {
  return normalizeGraphNode({
    id: app.id,
    label: app.name || app.id,
    nodeType: 'application',
    owner: app.businessOwner || app.technicalOwner || '',
    sourceSystem: 'ROI-EA modernization workspace',
    evidenceRefs: app.evidenceRefs || [],
  });
}

function modernizationEdge(dep={}) {
  const dimensionMap = {
    runtime:'technical', data:'informational', identity:'authority', network:'technical',
    integration:'technical', batch:'process', file:'informational', messaging:'technical',
    deployment:'technical', operational:'organizational', licensing:'vendor', vendor:'vendor',
    temporal:'process', 'business-process':'process', regulatory:'institutional',
    'shared-infrastructure':'technical', unknown:'unknown'
  };
  return normalizeGraphEdge({
    id: dep.id,
    sourceId: dep.sourceId,
    targetId: dep.targetId,
    edgeType: 'depends-on',
    dimension: dimensionMap[dep.dependencyType] || 'unknown',
    criticality: dep.criticality || 'Unknown',
    confidence: dep.confidence,
    resolutionState: dep.resolutionState,
    failureImpact: dep.failureImpact || '',
    sourceReference: dep.sourceReference || '',
    evidenceRefs: dep.evidenceRefs || [],
  });
}

export function buildDependencyGraph(workspace={}) {
  const nodes = new Map();
  const edges = new Map();
  (workspace.applications || []).forEach(app => {
    const node = modernizationNode(app); nodes.set(node.id,node);
  });
  (workspace.graphNodes || []).forEach(raw => {
    const node = normalizeGraphNode(raw); nodes.set(node.id,node);
  });
  (workspace.dependencies || []).forEach(dep => {
    const edge = modernizationEdge(dep); edges.set(edge.id,edge);
  });
  (workspace.graphEdges || []).forEach(raw => {
    const edge = normalizeGraphEdge(raw); edges.set(edge.id,edge);
  });
  return {
    nodes:[...nodes.values()],
    edges:[...edges.values()],
    continuityAnchors:(workspace.continuityAnchors || []).map(normalizeContinuityAnchor),
    essentialActions:(workspace.essentialActions || []).map(normalizeEssentialAction),
  };
}

export function graphIssues(graph={}) {
  const nodeIds = new Set((graph.nodes || []).map(n=>n.id));
  const issues=[];
  for(const raw of graph.edges || []){
    const edge=normalizeGraphEdge(raw);
    if(!edge.sourceId || !nodeIds.has(edge.sourceId)) issues.push({edgeId:edge.id,type:'UNRESOLVED_SOURCE',message:`Edge ${edge.id} source is unresolved.`});
    if(!edge.targetId || !nodeIds.has(edge.targetId)) issues.push({edgeId:edge.id,type:'UNRESOLVED_TARGET',message:`Edge ${edge.id} target is unresolved.`});
    if(edge.resolutionState!=='Resolved') issues.push({edgeId:edge.id,type:'UNRESOLVED_EDGE',message:`Edge ${edge.id} is ${edge.resolutionState}.`});
  }
  return issues;
}

export function dependencyDegree(graph={}) {
  const stats = new Map((graph.nodes || []).map(n=>[n.id,{nodeId:n.id,inbound:0,outbound:0,total:0,dimensions:new Set(),sharedFailureDomains:new Set()}]));
  for(const raw of graph.edges || []){
    const edge=normalizeGraphEdge(raw);
    if(stats.has(edge.sourceId)){
      const s=stats.get(edge.sourceId); s.outbound+=1; s.total+=1; s.dimensions.add(edge.dimension); if(edge.sharedFailureDomain)s.sharedFailureDomains.add(edge.sharedFailureDomain);
    }
    if(stats.has(edge.targetId)){
      const t=stats.get(edge.targetId); t.inbound+=1; t.total+=1; t.dimensions.add(edge.dimension); if(edge.sharedFailureDomain)t.sharedFailureDomains.add(edge.sharedFailureDomain);
    }
  }
  return [...stats.values()].map(x=>({...x,dimensions:[...x.dimensions],sharedFailureDomains:[...x.sharedFailureDomains]}));
}

export function concentrationCandidates(graph={}, options={}) {
  const minimumInbound = options.minimumInbound ?? 3;
  const degrees=dependencyDegree(graph);
  const nodes=new Map((graph.nodes||[]).map(n=>[n.id,n]));
  return degrees.filter(x=>x.inbound>=minimumInbound)
    .sort((a,b)=>b.inbound-a.inbound || a.nodeId.localeCompare(b.nodeId))
    .map(x=>({...x,node:nodes.get(x.nodeId)}));
}

export function essentialActionExposure(actionRaw, graph={}) {
  const action=normalizeEssentialAction(actionRaw);
  const nodes=new Map((graph.nodes||[]).map(n=>[n.id,n]));
  const fallbackSet=new Set(action.fallbackNodeIds);
  const missing=[]; const resolved=[];
  for(const id of action.dependencyNodeIds){
    const node=nodes.get(id);
    if(!node){ missing.push({nodeId:id,reason:'DEPENDENCY_NODE_MISSING'}); continue; }
    const hasFallback=fallbackSet.size>0;
    resolved.push({nodeId:id,node,hasFallback});
  }
  const exposed=resolved.filter(x=>!x.hasFallback);
  const status = missing.length ? 'REVIEW_REQUIRED'
    : exposed.length && !action.bufferDescription && !action.recoveryDescription ? 'EXPOSED'
    : exposed.length ? 'MITIGATED_OR_BUFFERED'
    : 'FALLBACK_RECORDED';
  return {action,status,dependencies:resolved,missing,exposedCount:exposed.length};
}

export function fragmentationCandidates(graph={}, options={}) {
  const minimumDependencies = options.minimumDependencies ?? 4;
  return (graph.essentialActions||[])
    .map(a=>essentialActionExposure(a,graph))
    .filter(x=>x.action.dependencyNodeIds.length>=minimumDependencies)
    .sort((a,b)=>b.action.dependencyNodeIds.length-a.action.dependencyNodeIds.length);
}

export function constrainingDependencyCandidates(graph={}) {
  const actions=(graph.essentialActions||[]).map(normalizeEssentialAction);
  const actionByDependency=new Map();
  for(const action of actions){
    for(const nodeId of action.dependencyNodeIds){
      if(!actionByDependency.has(nodeId)) actionByDependency.set(nodeId,[]);
      actionByDependency.get(nodeId).push(action);
    }
  }
  const results=[];
  for(const [nodeId,linkedActions] of actionByDependency){
    const essential=linkedActions.filter(a=>a.essentiality==='Essential');
    if(!essential.length) continue;
    const unmitigated=essential.filter(a=>!a.fallbackNodeIds.length && !a.bufferDescription && !a.recoveryDescription);
    if(!unmitigated.length) continue;
    results.push({
      nodeId,
      essentialActionIds:essential.map(a=>a.id),
      unmitigatedActionIds:unmitigated.map(a=>a.id),
      minimumToleranceMinutes:Math.min(...unmitigated.map(a=>a.toleranceMinutes??Number.POSITIVE_INFINITY)),
      reason:'Dependency supports at least one essential action without recorded fallback, buffer, or recovery path.',
      status:'Candidate only — human validation required',
    });
  }
  return results.sort((a,b)=>b.unmitigatedActionIds.length-a.unmitigatedActionIds.length || a.nodeId.localeCompare(b.nodeId));
}

export function dependencyAccumulationDelta(priorGraph={}, currentGraph={}) {
  const priorNodes=new Set((priorGraph.nodes||[]).map(n=>n.id));
  const currentNodes=new Set((currentGraph.nodes||[]).map(n=>n.id));
  const priorEdges=new Set((priorGraph.edges||[]).map(e=>e.id));
  const currentEdges=new Set((currentGraph.edges||[]).map(e=>e.id));
  return {
    addedNodeIds:[...currentNodes].filter(id=>!priorNodes.has(id)).sort(),
    removedNodeIds:[...priorNodes].filter(id=>!currentNodes.has(id)).sort(),
    addedEdgeIds:[...currentEdges].filter(id=>!priorEdges.has(id)).sort(),
    removedEdgeIds:[...priorEdges].filter(id=>!currentEdges.has(id)).sort(),
    nodeDelta:currentNodes.size-priorNodes.size,
    edgeDelta:currentEdges.size-priorEdges.size,
    interpretation:'Change in dependency count is descriptive only; increased dependency is not inherently adverse.',
  };
}

export function analyzeDependencyGraph(workspace={}, options={}) {
  const graph=buildDependencyGraph(workspace);
  return {
    graph,
    issues:graphIssues(graph),
    degrees:dependencyDegree(graph),
    concentrationCandidates:concentrationCandidates(graph,options),
    fragmentationCandidates:fragmentationCandidates(graph,options),
    constrainingDependencyCandidates:constrainingDependencyCandidates(graph),
    authorityState:'Advisory dependency analysis only — human validation required',
  };
}

function canonicalSnapshotGraph(workspace={}) {
  const graph=buildDependencyGraph(workspace);
  const sortById=items=>[...items].map(x=>JSON.parse(JSON.stringify(x))).sort((a,b)=>String(a.id).localeCompare(String(b.id)));
  return {
    nodes:sortById(graph.nodes),
    edges:sortById(graph.edges),
    continuityAnchors:sortById(graph.continuityAnchors),
    essentialActions:sortById(graph.essentialActions),
  };
}

function snapshotAnalysis(graph, options={}) {
  return {
    issues:graphIssues(graph),
    degrees:dependencyDegree(graph),
    concentrationCandidates:concentrationCandidates(graph,options),
    fragmentationCandidates:fragmentationCandidates(graph,options),
    constrainingDependencyCandidates:constrainingDependencyCandidates(graph),
  };
}

export function createDependencyGraphSnapshot(workspace={}, metadata={}, options={}) {
  const graph=canonicalSnapshotGraph(workspace);
  const capturedAt=metadata.capturedAt || new Date().toISOString();
  const label=String(metadata.label || `Dependency graph ${capturedAt}`).trim();
  const analysis=snapshotAnalysis(graph,options);
  return {
    profile:'AIHS-DEPENDENCY-GRAPH-SNAPSHOT-V0.1',
    id:metadata.id || stableId(`${capturedAt}-${label}`,'DGS'),
    label,
    capturedAt,
    capturedBy:String(metadata.capturedBy || '').trim(),
    note:String(metadata.note || '').trim(),
    graph,
    analysis,
    limitations:[
      'Snapshot preserves recorded dependency evidence at a point in time; it does not establish operating truth or authority.',
      'Candidate concentration, fragmentation, and constraining-dependency findings require human validation.',
    ],
  };
}

function changedRecords(prior=[], current=[]) {
  const before=new Map((prior||[]).map(x=>[x.id,x]));
  const after=new Map((current||[]).map(x=>[x.id,x]));
  const added=[...after.keys()].filter(id=>!before.has(id)).sort();
  const removed=[...before.keys()].filter(id=>!after.has(id)).sort();
  const changed=[];
  for(const id of [...after.keys()].filter(id=>before.has(id)).sort()){
    if(JSON.stringify(before.get(id))!==JSON.stringify(after.get(id))) changed.push(id);
  }
  return {added,removed,changed};
}

function ids(items=[]){ return new Set(items.map(x=>x.nodeId || x.id)); }
function setDiff(a,b){ return [...a].filter(x=>!b.has(x)).sort(); }

export function compareDependencyGraphSnapshots(priorSnapshot={}, currentSnapshot={}) {
  if(priorSnapshot.profile!=='AIHS-DEPENDENCY-GRAPH-SNAPSHOT-V0.1' || currentSnapshot.profile!=='AIHS-DEPENDENCY-GRAPH-SNAPSHOT-V0.1') {
    throw new TypeError('Two dependency graph snapshots are required.');
  }
  const prior=priorSnapshot.graph||{}; const current=currentSnapshot.graph||{};
  const recordChanges={
    nodes:changedRecords(prior.nodes,current.nodes),
    edges:changedRecords(prior.edges,current.edges),
    continuityAnchors:changedRecords(prior.continuityAnchors,current.continuityAnchors),
    essentialActions:changedRecords(prior.essentialActions,current.essentialActions),
  };
  const priorConcentration=ids(priorSnapshot.analysis?.concentrationCandidates||[]);
  const currentConcentration=ids(currentSnapshot.analysis?.concentrationCandidates||[]);
  const priorConstraining=ids(priorSnapshot.analysis?.constrainingDependencyCandidates||[]);
  const currentConstraining=ids(currentSnapshot.analysis?.constrainingDependencyCandidates||[]);
  const priorFragmentation=new Set((priorSnapshot.analysis?.fragmentationCandidates||[]).map(x=>x.action?.id).filter(Boolean));
  const currentFragmentation=new Set((currentSnapshot.analysis?.fragmentationCandidates||[]).map(x=>x.action?.id).filter(Boolean));
  const accumulation=dependencyAccumulationDelta(prior,current);
  return {
    profile:'AIHS-DEPENDENCY-GRAPH-COMPARISON-V0.1',
    priorSnapshotId:priorSnapshot.id,
    currentSnapshotId:currentSnapshot.id,
    priorCapturedAt:priorSnapshot.capturedAt,
    currentCapturedAt:currentSnapshot.capturedAt,
    recordChanges,
    accumulation,
    newlyConcentratedNodeIds:setDiff(currentConcentration,priorConcentration),
    concentrationRelievedNodeIds:setDiff(priorConcentration,currentConcentration),
    newlyConstrainingNodeIds:setDiff(currentConstraining,priorConstraining),
    constrainingRelievedNodeIds:setDiff(priorConstraining,currentConstraining),
    newlyFragmentedActionIds:setDiff(currentFragmentation,priorFragmentation),
    fragmentationRelievedActionIds:setDiff(priorFragmentation,currentFragmentation),
    interpretation:[
      'Graph change is descriptive and does not by itself establish increased or reduced risk.',
      'New or relieved concentration, fragmentation, and constraining-dependency candidates are reassessment signals requiring human validation.',
    ],
  };
}
