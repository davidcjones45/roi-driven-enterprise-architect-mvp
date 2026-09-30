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
export const REVIEW_STATES = ['Unreviewed','Reviewed','Rejected'];
export const ESSENTIALITY_LEVELS = ['Unknown','Supporting','Important','Essential'];

const list = value => Array.isArray(value)
  ? value.map(String).map(v=>v.trim()).filter(Boolean)
  : String(value||'').split(/[;,\n]/).map(v=>v.trim()).filter(Boolean);
const unique = values => [...new Set(values)];
const finiteOrNull = value => {
  if(value === '' || value === null || value === undefined) return null;
  const n = Number(value); return Number.isFinite(n) ? n : null;
};

const clamp01 = value => {
  if(value === '' || value === null || value === undefined) return null;
  const n = Number(value);
  if(!Number.isFinite(n)) return null;
  return Math.max(0,Math.min(1,n>1?n/100:n));
};

const provenanceKey = p => `${p.sourceType||''}|${p.sourceId||''}|${p.sourceReference||''}|${p.observedAt||''}`;
function normalizeProvenance(raw={}, fallback={}) {
  const entries=Array.isArray(raw.provenance)?raw.provenance:[];
  const derived={
    sourceType: raw.sourceSystem || fallback.sourceType || 'Manual',
    sourceId: raw.sourceId || fallback.sourceId || '',
    sourceReference: raw.sourceReference || fallback.sourceReference || '',
    observedAt: raw.observedAt || fallback.observedAt || '',
  };
  const seed = entries.length && String(derived.sourceType).trim()==='Mixed' ? entries : [...entries,derived];
  const normalized=seed
    .map(x=>({sourceType:String(x?.sourceType||'Unknown').trim()||'Unknown',sourceId:String(x?.sourceId||'').trim(),sourceReference:String(x?.sourceReference||'').trim(),observedAt:String(x?.observedAt||'').trim()}));
  const map=new Map(); normalized.forEach(x=>map.set(provenanceKey(x),x));
  return [...map.values()];
}
function mergeProvenance(a=[],b=[]){ const map=new Map(); [...a,...b].forEach(x=>map.set(provenanceKey(x),x)); return [...map.values()]; }

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
    sourceSystem: raw.sourceSystem || 'Manual',
    sourceReference: raw.sourceReference || '',
    provenance: normalizeProvenance(raw,{sourceType:raw.sourceSystem||'Manual',sourceReference:raw.sourceReference||''}),
    evidenceRefs: unique(list(raw.evidenceRefs)),
    tags: unique(list(raw.tags)),
    active: raw.active !== false,
  };
}

export function normalizeGraphEdge(raw={}) {
  const edgeType = GRAPH_EDGE_TYPES.includes(raw.edgeType) ? raw.edgeType : 'unknown';
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
    sourceSystem: raw.sourceSystem || 'Manual',
    sourceReference: raw.sourceReference || '',
    provenance: normalizeProvenance(raw,{sourceType:raw.sourceSystem||'Manual',sourceReference:raw.sourceReference||''}),
    evidenceRefs: unique(list(raw.evidenceRefs)),
    sharedFailureDomain: raw.sharedFailureDomain || '',
    reviewState: REVIEW_STATES.includes(raw.reviewState) ? raw.reviewState : 'Unreviewed',
    reviewer: raw.reviewer || '',
    reviewedAt: raw.reviewedAt || '',
    reviewNote: raw.reviewNote || '',
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
    mitigationAppliesToAllDependencies: raw.mitigationAppliesToAllDependencies === true,
    dependencyMitigations: (Array.isArray(raw.dependencyMitigations)?raw.dependencyMitigations:[]).map(item=>({
      dependencyNodeId:String(item?.dependencyNodeId||'').trim(),
      type:String(item?.type||'').trim(),
      replacementNodeId:String(item?.replacementNodeId||'').trim(),
      description:String(item?.description||'').trim(),
      status:String(item?.status||'').trim(),
      validatedBy:String(item?.validatedBy||'').trim(),
      validatedAt:String(item?.validatedAt||'').trim(),
      evidenceRefs:unique(list(item?.evidenceRefs)),
    })).filter(item=>item.dependencyNodeId),
    evidenceRefs: unique(list(raw.evidenceRefs)),
  };
}

function modernizationNode(app={}) {
  return normalizeGraphNode({
    id: app.id,
    label: app.name || app.id,
    nodeType: 'application',
    owner: app.businessOwner || app.technicalOwner || '',
    sourceSystem: 'Modernization',
    provenance:[{sourceType:'Modernization',sourceId:app.id||'',sourceReference:'ROI-EA modernization workspace'}],
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
    sourceSystem:'Modernization',
    sourceReference: dep.sourceReference || '',
    provenance:[{sourceType:'Modernization',sourceId:dep.id||'',sourceReference:dep.sourceReference||'ROI-EA modernization workspace'}],
    evidenceRefs: dep.evidenceRefs || [],
  });
}

export function mergeGraphNodeRecords(existingRaw, incomingRaw) {
  const existing=normalizeGraphNode(existingRaw||{}), incoming=normalizeGraphNode(incomingRaw||{});
  if(!existingRaw) return incoming;
  return normalizeGraphNode({
    ...existing,
    ...incoming,
    id:existing.id||incoming.id,
    label:incoming.label||existing.label,
    nodeType:existing.nodeType!=='unknown'?existing.nodeType:incoming.nodeType,
    description:existing.description||incoming.description,
    owner:existing.owner||incoming.owner,
    sourceSystem:existing.sourceSystem===incoming.sourceSystem?existing.sourceSystem:'Mixed',
    sourceReference:existing.sourceReference||incoming.sourceReference,
    provenance:mergeProvenance(existing.provenance,incoming.provenance),
    evidenceRefs:unique([...existing.evidenceRefs,...incoming.evidenceRefs]),
    tags:unique([...existing.tags,...incoming.tags]),
  });
}

export function mergeGraphEdgeRecords(existingRaw, incomingRaw) {
  const existing=normalizeGraphEdge(existingRaw||{}), incoming=normalizeGraphEdge(incomingRaw||{});
  if(!existingRaw) return incoming;
  return normalizeGraphEdge({
    ...existing,
    ...incoming,
    id:existing.id||incoming.id,
    sourceId:existing.sourceId||incoming.sourceId,
    targetId:existing.targetId||incoming.targetId,
    edgeType:existing.edgeType||incoming.edgeType,
    dimension:existing.dimension!=='unknown'?existing.dimension:incoming.dimension,
    sourceSystem:existing.sourceSystem===incoming.sourceSystem?existing.sourceSystem:'Mixed',
    sourceReference:existing.sourceReference||incoming.sourceReference,
    provenance:mergeProvenance(existing.provenance,incoming.provenance),
    evidenceRefs:unique([...existing.evidenceRefs,...incoming.evidenceRefs]),
    sharedFailureDomain:existing.sharedFailureDomain||incoming.sharedFailureDomain,
  });
}

export function buildDependencyGraph(workspace={}) {
  const nodes = new Map();
  const edges = new Map();
  const addNode=raw=>{ const node=normalizeGraphNode(raw); nodes.set(node.id,nodes.has(node.id)?mergeGraphNodeRecords(nodes.get(node.id),node):node); };
  const addEdge=raw=>{ const edge=normalizeGraphEdge(raw); edges.set(edge.id,edges.has(edge.id)?mergeGraphEdgeRecords(edges.get(edge.id),edge):edge); };
  (workspace.applications || []).forEach(app => addNode(modernizationNode(app)));
  (workspace.graphNodes || []).forEach(addNode);
  (workspace.dependencies || []).forEach(dep => addEdge(modernizationEdge(dep)));
  (workspace.graphEdges || []).forEach(addEdge);
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

function dependencyMitigationState(action,nodeId){
  const records=(action.dependencyMitigations||[]).filter(item=>item.dependencyNodeId===nodeId&&['Validated','Implemented'].includes(item.status));
  const global=action.mitigationAppliesToAllDependencies===true;
  return {
    records,
    hasFallback:records.some(item=>['Fallback','Redundancy','Substitution'].includes(item.type)&&item.replacementNodeId) || (global&&action.fallbackNodeIds.length>0),
    hasBuffer:records.some(item=>item.type==='Buffer') || (global&&Boolean(action.bufferDescription)),
    hasRecovery:records.some(item=>item.type==='Recovery') || (global&&Boolean(action.recoveryDescription)),
    hasCoordination:records.some(item=>item.type==='Coordination'),
  };
}

export function essentialActionExposure(actionRaw, graph={}) {
  const action=normalizeEssentialAction(actionRaw);
  const nodes=new Map((graph.nodes||[]).map(n=>[n.id,n]));
  const missing=[]; const resolved=[];
  for(const id of action.dependencyNodeIds){
    const node=nodes.get(id);
    if(!node){ missing.push({nodeId:id,reason:'DEPENDENCY_NODE_MISSING'}); continue; }
    const mitigation=dependencyMitigationState(action,id);
    resolved.push({nodeId:id,node,...mitigation,mitigated:mitigation.hasFallback||mitigation.hasBuffer||mitigation.hasRecovery});
  }
  const exposed=resolved.filter(x=>!x.mitigated);
  const status = missing.length ? 'REVIEW_REQUIRED' : exposed.length ? 'EXPOSED' : 'MITIGATED_OR_FALLBACK_RECORDED';
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
    const unmitigated=essential.filter(a=>{
      const mitigation=dependencyMitigationState(a,nodeId);
      return !(mitigation.hasFallback||mitigation.hasBuffer||mitigation.hasRecovery);
    });
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

export function graphSourceSummary(graph={}) {
  const counts=new Map();
  const add=(source,kind)=>{
    const key=String(source||'Unknown').trim()||'Unknown';
    if(!counts.has(key))counts.set(key,{sourceType:key,nodes:0,edges:0});
    counts.get(key)[kind]+=1;
  };
  (graph.nodes||[]).forEach(n=>{
    const sources=unique((n.provenance||[]).map(p=>p.sourceType).filter(Boolean));
    (sources.length?sources:[n.sourceSystem||'Unknown']).forEach(x=>add(x,'nodes'));
  });
  (graph.edges||[]).forEach(e=>{
    const sources=unique((e.provenance||[]).map(p=>p.sourceType).filter(Boolean));
    (sources.length?sources:[e.sourceSystem||'Unknown']).forEach(x=>add(x,'edges'));
  });
  return [...counts.values()].sort((a,b)=>a.sourceType.localeCompare(b.sourceType));
}

export function crossSourceConnections(graph={}) {
  const nodes=new Map((graph.nodes||[]).map(n=>[n.id,n]));
  const primary=n=>unique((n?.provenance||[]).map(p=>p.sourceType).filter(Boolean));
  const results=[];
  for(const edge of graph.edges||[]){
    const sourceSources=primary(nodes.get(edge.sourceId));
    const targetSources=primary(nodes.get(edge.targetId));
    const sourceSet=new Set(sourceSources); const overlap=targetSources.some(x=>sourceSet.has(x));
    if(sourceSources.length && targetSources.length && !overlap){
      results.push({edgeId:edge.id,sourceId:edge.sourceId,targetId:edge.targetId,sourceSources,targetSources,dimension:edge.dimension,edgeType:edge.edgeType});
    }
  }
  return results;
}


export function reviewedCrossSourceConnections(graph={}) {
  const cross=new Map(crossSourceConnections(graph).map(x=>[x.edgeId,x]));
  return (graph.edges||[]).map(normalizeGraphEdge)
    .filter(edge=>cross.has(edge.id) && edge.reviewState==='Reviewed')
    .map(edge=>({
      ...cross.get(edge.id),
      reviewState:edge.reviewState,
      reviewer:edge.reviewer,
      reviewedAt:edge.reviewedAt,
      reviewNote:edge.reviewNote,
      evidenceRefs:edge.evidenceRefs,
      sharedFailureDomain:edge.sharedFailureDomain,
      status:'Explicitly reviewed cross-source relationship',
    }))
    .sort((a,b)=>a.edgeId.localeCompare(b.edgeId));
}

export function essentialDependencyCoverage(graph={}) {
  const nodes=new Map((graph.nodes||[]).map(n=>[n.id,n]));
  const anchors=new Map((graph.continuityAnchors||[]).map(a=>[a.id,a]));
  const rows=[];
  for(const actionRaw of graph.essentialActions||[]){
    const action=normalizeEssentialAction(actionRaw);
    const anchor=anchors.get(action.anchorId)||null;
    for(const nodeId of action.dependencyNodeIds){
      rows.push({
        nodeId,
        node:nodes.get(nodeId)||null,
        actionId:action.id,
        actionLabel:action.label,
        anchorId:action.anchorId,
        anchorLabel:anchor?.label||action.anchorId||'Unlinked',
        toleranceMinutes:action.toleranceMinutes,
        mitigated:(()=>{const m=dependencyMitigationState(action,nodeId);return m.hasFallback||m.hasBuffer||m.hasRecovery;})(),
        fallbackNodeIds:dependencyMitigationState(action,nodeId).records.filter(item=>['Fallback','Redundancy','Substitution'].includes(item.type)).map(item=>item.replacementNodeId).filter(Boolean),
      });
    }
  }
  return rows.sort((a,b)=>a.anchorLabel.localeCompare(b.anchorLabel)||a.actionLabel.localeCompare(b.actionLabel)||a.nodeId.localeCompare(b.nodeId));
}

export function sharedFailureDomainCandidates(graph={}) {
  const groups=new Map();
  for(const raw of graph.edges||[]){
    const edge=normalizeGraphEdge(raw); const domain=String(edge.sharedFailureDomain||'').trim();
    if(!domain)continue;
    if(!groups.has(domain))groups.set(domain,{domain,edgeIds:[],nodeIds:new Set(),dimensions:new Set()});
    const g=groups.get(domain); g.edgeIds.push(edge.id); g.nodeIds.add(edge.sourceId); g.nodeIds.add(edge.targetId); g.dimensions.add(edge.dimension);
  }
  const actionByNode=new Map();
  for(const action of graph.essentialActions||[]){
    for(const nodeId of action.dependencyNodeIds||[]){ if(!actionByNode.has(nodeId))actionByNode.set(nodeId,[]); actionByNode.get(nodeId).push(action.id); }
  }
  return [...groups.values()].map(g=>{
    const essentialActionIds=unique([...g.nodeIds].flatMap(id=>actionByNode.get(id)||[]));
    return {domain:g.domain,edgeIds:g.edgeIds.sort(),nodeIds:[...g.nodeIds].filter(Boolean).sort(),dimensions:[...g.dimensions].sort(),essentialActionIds,status:'Candidate shared failure domain — human validation required'};
  }).filter(g=>g.edgeIds.length>=2 || g.essentialActionIds.length>=2)
    .sort((a,b)=>b.essentialActionIds.length-a.essentialActionIds.length || b.edgeIds.length-a.edgeIds.length || a.domain.localeCompare(b.domain));
}

export function multiSourceNodes(graph={}) {
  return (graph.nodes||[]).map(n=>({node:n,sources:unique((n.provenance||[]).map(p=>p.sourceType).filter(Boolean))}))
    .filter(x=>x.sources.length>1).sort((a,b)=>b.sources.length-a.sources.length || a.node.id.localeCompare(b.node.id));
}




export const DEPENDENCY_MITIGATION_TYPES = ['Buffer','Redundancy','Substitution','Fallback','Coordination','Recovery'];
export const DEPENDENCY_MITIGATION_STATUSES = ['Candidate','Validated','Implemented','Rejected','Deferred'];

export function normalizeDependencyMitigation(raw={}) {
  const type=DEPENDENCY_MITIGATION_TYPES.includes(raw.type) ? raw.type : 'Fallback';
  const status=DEPENDENCY_MITIGATION_STATUSES.includes(raw.status) ? raw.status : 'Candidate';
  const targetType=['Essential Action','Dependency Node'].includes(raw.targetType) ? raw.targetType : 'Essential Action';
  const label=String(raw.label||raw.description||`${type} mitigation`).trim();
  return {
    ...raw,
    id:raw.id||stableId(`${targetType}-${raw.targetId||'unknown'}-${type}-${label}`,'DGM'),
    label,
    targetType,
    targetId:String(raw.targetId||'').trim(),
    type,
    status,
    owner:String(raw.owner||'').trim(),
    description:String(raw.description||'').trim(),
    expectedEffect:String(raw.expectedEffect||'').trim(),
    replacementNodeId:String(raw.replacementNodeId||'').trim(),
    evidenceRefs:unique(list(raw.evidenceRefs)),
    sourceReference:String(raw.sourceReference||'').trim(),
    confidence:clamp01(raw.confidence),
    estimatedCost:finiteOrNull(raw.estimatedCost),
    estimatedEffort:String(raw.estimatedEffort||'').trim(),
    linkedFindingCandidateId:String(raw.linkedFindingCandidateId||'').trim(),
    validatedBy:String(raw.validatedBy||'').trim(),
    validatedAt:String(raw.validatedAt||'').trim(),
    notes:String(raw.notes||'').trim(),
  };
}

export function mitigationIssues(raw={}, graph={}) {
  const m=normalizeDependencyMitigation(raw);
  const issues=[];
  if(!m.targetId)issues.push('Mitigation target is required.');
  if(!m.description)issues.push('Mitigation description is required.');
  if(!m.owner)issues.push('Mitigation owner is required.');
  if(!m.evidenceRefs.length && !m.sourceReference)issues.push('Mitigation has no evidence or source reference.');
  if(['Fallback','Redundancy','Substitution'].includes(m.type) && !m.replacementNodeId){
    issues.push(`${m.type} mitigation requires a replacement/fallback node.`);
  }
  if(m.targetType==='Essential Action' && !(graph.essentialActions||[]).some(a=>a.id===m.targetId)){
    issues.push(`Essential Action ${m.targetId||'(missing)'} is not in the graph.`);
  }
  if(m.targetType==='Dependency Node' && !(graph.nodes||[]).some(n=>n.id===m.targetId)){
    issues.push(`Dependency node ${m.targetId||'(missing)'} is not in the graph.`);
  }
  if(m.replacementNodeId && !(graph.nodes||[]).some(n=>n.id===m.replacementNodeId)){
    issues.push(`Replacement/fallback node ${m.replacementNodeId} is not in the graph.`);
  }
  return {mitigation:m,issues,valid:issues.length===0};
}

function applyMitigationToWorkspace(workspace={}, mitigationRaw={}) {
  const next=structuredClone(workspace);
  next.essentialActions=(next.essentialActions||[]).map(normalizeEssentialAction);
  next.graphNodes=(next.graphNodes||[]).map(normalizeGraphNode);
  next.graphEdges=(next.graphEdges||[]).map(normalizeGraphEdge);
  const m=normalizeDependencyMitigation(mitigationRaw);

  if(m.targetType==='Essential Action'){
    const action=next.essentialActions.find(a=>a.id===m.targetId);
    if(action){
      if(m.type==='Buffer') action.bufferDescription=m.description;
      if(m.type==='Recovery') action.recoveryDescription=m.description;
      if(['Fallback','Redundancy','Substitution'].includes(m.type) && m.replacementNodeId){
        action.fallbackNodeIds=unique([...(action.fallbackNodeIds||[]),m.replacementNodeId]);
      }
      if(m.type==='Coordination'){
        action.coordinationMitigation=m.description;
      }
    }
  } else if(m.targetType==='Dependency Node'){
    for(const action of next.essentialActions){
      if(!(action.dependencyNodeIds||[]).includes(m.targetId))continue;
      const specific={dependencyNodeId:m.targetId,type:m.type,replacementNodeId:m.replacementNodeId,description:m.description,status:m.status,validatedBy:m.validatedBy,validatedAt:m.validatedAt,evidenceRefs:[...m.evidenceRefs]};
      action.dependencyMitigations=[...(action.dependencyMitigations||[]).filter(item=>!(item.dependencyNodeId===m.targetId&&item.type===m.type)),specific];
    }
  }
  return next;
}

export function previewDependencyMitigation(workspace={}, mitigationRaw={}, options={}) {
  const baseline=analyzeDependencyGraph(workspace,options);
  const checked=mitigationIssues(mitigationRaw,baseline.graph);
  if(!checked.valid) return {valid:false,mitigation:checked.mitigation,issues:checked.issues,baseline,nullScenario:null};
  const scenarioWorkspace=applyMitigationToWorkspace(workspace,checked.mitigation);
  const scenario=analyzeDependencyGraph(scenarioWorkspace,options);
  const baseConstraint=new Set(baseline.constrainingDependencyCandidates.map(x=>x.nodeId));
  const scenarioConstraint=new Set(scenario.constrainingDependencyCandidates.map(x=>x.nodeId));
  return {
    valid:true,
    mitigation:checked.mitigation,
    issues:[],
    baseline,
    scenario,
    structuralEffect:{
      constrainingCandidatesBefore:baseConstraint.size,
      constrainingCandidatesAfter:scenarioConstraint.size,
      relievedCandidateNodeIds:[...baseConstraint].filter(x=>!scenarioConstraint.has(x)).sort(),
      newCandidateNodeIds:[...scenarioConstraint].filter(x=>!baseConstraint.has(x)).sort(),
      interpretation:'Structural scenario only. A modeled reduction in candidate exposure does not establish implemented control effectiveness or reduced real-world risk.',
    }
  };
}


export function classifyMitigationTransition(beforeAnalysis={}, afterAnalysis={}) {
  const beforeConstraint=new Set((beforeAnalysis.constrainingDependencyCandidates||[]).map(x=>x.nodeId));
  const afterConstraint=new Set((afterAnalysis.constrainingDependencyCandidates||[]).map(x=>x.nodeId));
  const beforeConcentration=new Set((beforeAnalysis.concentrationCandidates||[]).map(x=>x.nodeId));
  const afterConcentration=new Set((afterAnalysis.concentrationCandidates||[]).map(x=>x.nodeId));

  const relieved=[...beforeConstraint].filter(x=>!afterConstraint.has(x)).sort();
  const introduced=[...afterConstraint].filter(x=>!beforeConstraint.has(x)).sort();
  const persistent=[...beforeConstraint].filter(x=>afterConstraint.has(x)).sort();

  let classification='UNCHANGED_EXPOSURE';
  if(relieved.length && !introduced.length && !persistent.length) classification='RELIEVED';
  else if(relieved.length && introduced.length) classification='TRANSFERRED_OR_RESHAPED';
  else if(relieved.length || introduced.length || persistent.length) classification='CHANGED_EXPOSURE';

  return {
    classification,
    relievedConstrainingNodeIds:relieved,
    introducedConstrainingNodeIds:introduced,
    persistentConstrainingNodeIds:persistent,
    concentrationAdded:[...afterConcentration].filter(x=>!beforeConcentration.has(x)).sort(),
    concentrationRelieved:[...beforeConcentration].filter(x=>!afterConcentration.has(x)).sort(),
    interpretation:'Classification describes changes in recorded structural candidates only. It does not establish realized risk reduction, resilience, effectiveness, or business outcome.',
  };
}

export function applyValidatedMitigationWithSnapshots(workspace={}, mitigationRaw={}, options={}) {
  const appliedAt=String(options.appliedAt||new Date().toISOString());
  const appliedBy=String(options.appliedBy||mitigationRaw.validatedBy||'').trim();
  if(!appliedBy) throw new TypeError('Applied by is required for mitigation lifecycle capture.');

  const beforeAnalysis=analyzeDependencyGraph(workspace,options.analysisOptions||{});
  const beforeSnapshot=createDependencyGraphSnapshot(workspace,{
    label:options.beforeLabel||`Before mitigation: ${mitigationRaw.label||mitigationRaw.type||'Dependency mitigation'}`,
    note:options.beforeNote||`Automatic pre-application snapshot for mitigation ${mitigationRaw.id||'candidate'}.`,
    capturedAt:options.beforeCapturedAt||appliedAt,
    capturedBy:appliedBy,
  },options.analysisOptions||{});

  const appliedWorkspace=applyValidatedDependencyMitigation(workspace,mitigationRaw);
  const afterAnalysis=analyzeDependencyGraph(appliedWorkspace,options.analysisOptions||{});
  const afterSnapshot=createDependencyGraphSnapshot(appliedWorkspace,{
    label:options.afterLabel||`After mitigation: ${mitigationRaw.label||mitigationRaw.type||'Dependency mitigation'}`,
    note:options.afterNote||`Automatic post-application snapshot for mitigation ${mitigationRaw.id||'candidate'}.`,
    capturedAt:options.afterCapturedAt||appliedAt,
    capturedBy:appliedBy,
  },options.analysisOptions||{});

  const transition=classifyMitigationTransition(beforeAnalysis,afterAnalysis);
  const lifecycleRecord={
    id:stableId(`${mitigationRaw.id||'MITIGATION'}-${appliedAt}`,'DGL'),
    mitigationId:normalizeDependencyMitigation(mitigationRaw).id,
    appliedAt,
    appliedBy,
    beforeSnapshotId:beforeSnapshot.id,
    afterSnapshotId:afterSnapshot.id,
    transition,
    status:'Recorded structural transition — outcome validation still required',
  };

  const next=structuredClone(appliedWorkspace);
  next.dependencyGraphSnapshots=[
    ...(workspace.dependencyGraphSnapshots||[]),
    beforeSnapshot,
    afterSnapshot,
  ];
  next.dependencyMitigationLifecycle=[
    ...(workspace.dependencyMitigationLifecycle||[]),
    lifecycleRecord,
  ];

  return {workspace:next,beforeSnapshot,afterSnapshot,transition,lifecycleRecord};
}

export function applyValidatedDependencyMitigation(workspace={}, mitigationRaw={}) {
  const graph=buildDependencyGraph(workspace);
  const checked=mitigationIssues(mitigationRaw,graph);
  if(!checked.valid) throw new TypeError(checked.issues.join(' '));
  if(!['Validated','Implemented'].includes(checked.mitigation.status)){
    throw new TypeError('Only Validated or Implemented mitigations can be applied to the working graph.');
  }
  if(!checked.mitigation.validatedBy || !checked.mitigation.validatedAt){
    throw new TypeError('Validated by and validated at are required before applying a mitigation.');
  }
  const next=applyMitigationToWorkspace(workspace,checked.mitigation);
  next.dependencyMitigations=[...(workspace.dependencyMitigations||[]).filter(x=>x.id!==checked.mitigation.id),checked.mitigation];
  return next;
}

export const DEPENDENCY_FINDING_DISPOSITIONS = ['Pending review','Accept','Revise','Reject','Defer'];

export function dependencyFindingCandidateId(finding={}) {
  return stableId(`${finding.type||'candidate'}-${finding.subjectId||'unknown'}`,'DGF');
}

export function normalizeDependencyFindingReview(raw={}) {
  const disposition=DEPENDENCY_FINDING_DISPOSITIONS.includes(raw.disposition) ? raw.disposition : 'Pending review';
  return {
    id: raw.id || dependencyFindingCandidateId(raw),
    candidateId: raw.candidateId || raw.id || '',
    disposition,
    reviewer: String(raw.reviewer||'').trim(),
    reviewedAt: String(raw.reviewedAt||'').trim(),
    note: String(raw.note||'').trim(),
    revisedStatement: String(raw.revisedStatement||'').trim(),
    owner: String(raw.owner||'').trim(),
    requiredAction: String(raw.requiredAction||'').trim(),
    decisionImpact: ['Informational','Material','Decision-blocking'].includes(raw.decisionImpact) ? raw.decisionImpact : 'Material',
    severity: ['Observation','Low','Moderate','High','Decision-critical'].includes(raw.severity) ? raw.severity : 'Moderate',
  };
}

export function upsertDependencyFindingReview(reviews=[], candidate={}, rawReview={}) {
  const candidateId=dependencyFindingCandidateId(candidate);
  const review=normalizeDependencyFindingReview({
    ...rawReview,
    id:rawReview.id||candidateId,
    candidateId,
  });
  const next=(reviews||[]).filter(item=>(item.candidateId||item.id)!==candidateId);
  next.push(review);
  return next.map(normalizeDependencyFindingReview)
    .sort((a,b)=>(a.candidateId||a.id).localeCompare(b.candidateId||b.id));
}

export function dependencyFindingToConsultingRecord(candidate={}, reviewRaw={}) {
  const review=normalizeDependencyFindingReview(reviewRaw);
  if(!['Accept','Revise'].includes(review.disposition)) {
    throw new TypeError('Only accepted or revised dependency finding candidates can be promoted.');
  }
  if(!review.reviewer || !review.owner || !review.requiredAction) {
    throw new TypeError('Reviewer, owner, and required action are required before promotion.');
  }
  const statement=review.disposition==='Revise' && review.revisedStatement
    ? review.revisedStatement
    : candidate.statement || '';
  return {
    finding_id:'',
    title:`Dependency review: ${candidate.subjectId||'Unspecified subject'}`,
    domain:'Architecture',
    finding_statement:statement,
    severity:review.severity,
    status:'Open',
    supporting_evidence:[
      `Dependency candidate: ${dependencyFindingCandidateId(candidate)}`,
      `Candidate type: ${candidate.type||'Unknown'}`,
      `Subject: ${candidate.subjectId||'Unknown'}`,
      candidate.limitation ? `Original limitation: ${candidate.limitation}` : '',
      review.note ? `Reviewer note: ${review.note}` : '',
    ].filter(Boolean).join(' | '),
    contradictory_evidence:'',
    decision_impact:review.decisionImpact,
    owner:review.owner,
    required_action:review.requiredAction,
    due_date:'',
    resolution:'',
    recorded_at:review.reviewedAt||new Date().toISOString(),
  };
}

export function dependencyFindingsSummary(graph={}, analysis={}) {
  const concentration = analysis.concentrationCandidates || concentrationCandidates(graph);
  const fragmentation = analysis.fragmentationCandidates || fragmentationCandidates(graph);
  const constraining = analysis.constrainingDependencyCandidates || constrainingDependencyCandidates(graph);
  const shared = analysis.sharedFailureDomainCandidates || sharedFailureDomainCandidates(graph);
  const findings=[];

  for(const item of constraining){
    findings.push({
      type:'CONSTRAINING_DEPENDENCY_CANDIDATE',
      severity:'High review priority',
      subjectId:item.nodeId,
      statement:`Dependency ${item.nodeId} supports essential action(s) without a recorded fallback, buffer, or recovery path.`,
      limitation:'Candidate only. Human validation of essentiality, tolerance, operating dependency, and mitigation is required.',
    });
  }
  for(const item of concentration){
    findings.push({
      type:'DEPENDENCY_CONCENTRATION_CANDIDATE',
      severity:'Review',
      subjectId:item.nodeId,
      statement:`${item.inbound} recorded dependencies converge on ${item.node?.label||item.nodeId}.`,
      limitation:'Inbound degree is descriptive and does not by itself establish fragility or risk.',
    });
  }
  for(const item of fragmentation){
    findings.push({
      type:'FRAGMENTATION_CANDIDATE',
      severity:'Review',
      subjectId:item.action.id,
      statement:`Essential Action "${item.action.label}" depends on ${item.action.dependencyNodeIds.length} recorded nodes.`,
      limitation:'Dependency count alone does not prove coordination failure; ownership, sequencing, and operating behavior require review.',
    });
  }
  for(const item of shared){
    findings.push({
      type:'SHARED_FAILURE_DOMAIN_CANDIDATE',
      severity:'Review',
      subjectId:item.domain,
      statement:`Shared failure domain "${item.domain}" is recorded across ${item.edgeIds.length} dependency edges.`,
      limitation:'The recorded domain is evidence context only until common-cause failure semantics are validated.',
    });
  }
  return findings.map(item=>({...item,candidateId:dependencyFindingCandidateId(item)}))
    .sort((a,b)=>a.type.localeCompare(b.type)||a.subjectId.localeCompare(b.subjectId));
}

export function analyzeDependencyGraph(workspace={}, options={}) {
  const graph=buildDependencyGraph(workspace);
  return {
    graph,
    issues:graphIssues(graph),
    degrees:dependencyDegree(graph),
    sourceSummary:graphSourceSummary(graph),
    crossSourceConnections:crossSourceConnections(graph),
    reviewedCrossSourceConnections:reviewedCrossSourceConnections(graph),
    multiSourceNodes:multiSourceNodes(graph),
    essentialDependencyCoverage:essentialDependencyCoverage(graph),
    sharedFailureDomainCandidates:sharedFailureDomainCandidates(graph),
    concentrationCandidates:concentrationCandidates(graph,options),
    fragmentationCandidates:fragmentationCandidates(graph,options),
    constrainingDependencyCandidates:constrainingDependencyCandidates(graph),
    findingsSummary:dependencyFindingsSummary(graph,{
      concentrationCandidates:concentrationCandidates(graph,options),
      fragmentationCandidates:fragmentationCandidates(graph,options),
      constrainingDependencyCandidates:constrainingDependencyCandidates(graph),
      sharedFailureDomainCandidates:sharedFailureDomainCandidates(graph),
    }),
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
    sourceSummary:graphSourceSummary(graph),
    crossSourceConnections:crossSourceConnections(graph),
    reviewedCrossSourceConnections:reviewedCrossSourceConnections(graph),
    multiSourceNodes:multiSourceNodes(graph),
    essentialDependencyCoverage:essentialDependencyCoverage(graph),
    sharedFailureDomainCandidates:sharedFailureDomainCandidates(graph),
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
