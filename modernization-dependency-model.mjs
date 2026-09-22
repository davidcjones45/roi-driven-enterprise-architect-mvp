// ROI-EA Application Modernization M3 — provider-neutral dependency and wave analysis.
// This module produces candidate groupings and sequencing evidence only.
// It does not authorize migration, cutover, architecture, funding, or production change.

import { stableId } from './authority-model.mjs';

export const DEPENDENCY_TYPES = [
  'runtime','data','identity','network','integration','batch','file',
  'messaging','deployment','operational','licensing','vendor',
  'temporal','business-process','regulatory','shared-infrastructure','unknown'
];

export const COUPLING_LEVELS = ['Unknown','Low','Medium','High','Mandatory'];
export const CRITICALITY_LEVELS = ['Unknown','Low','Moderate','High','Mission critical'];
export const DIRECTION_TYPES = ['DIRECTED','BIDIRECTIONAL','UNDIRECTED'];
export const RESOLUTION_STATES = ['Resolved','Partially resolved','Unresolved'];

const list = value => Array.isArray(value)
  ? value.filter(Boolean)
  : String(value || '').split(/[;,\n]/).map(v=>v.trim()).filter(Boolean);
const unique = values => [...new Set(values)];
const clamp01 = value => {
  if(value === null || value === undefined || value === '') return null;
  const n = Number(value);
  if(!Number.isFinite(n)) return null;
  return Math.max(0,Math.min(1,n>1?n/100:n));
};

export function normalizeDependency(raw={}) {
  const sourceId=raw.sourceId||'';
  const targetId=raw.targetId||'';
  const type=DEPENDENCY_TYPES.includes(raw.dependencyType)?raw.dependencyType:'unknown';
  const direction=DIRECTION_TYPES.includes(raw.direction)?raw.direction:'DIRECTED';
  const migrationCoupling=COUPLING_LEVELS.includes(raw.migrationCoupling)?raw.migrationCoupling:'Unknown';
  const criticality=CRITICALITY_LEVELS.includes(raw.criticality)?raw.criticality:'Unknown';
  const confidence=clamp01(raw.confidence);
  const resolutionState=RESOLUTION_STATES.includes(raw.resolutionState)
    ? raw.resolutionState
    : (sourceId&&targetId?'Resolved':'Unresolved');

  return {
    ...raw,
    id:raw.id||stableId(`${sourceId||'unknown-source'}-${type}-${targetId||'unknown-target'}`,'DEP'),
    sourceId,targetId,
    sourceType:raw.sourceType||'application',
    targetType:raw.targetType||'application',
    dependencyType:type,
    direction,
    criticality,
    migrationCoupling,
    confidence,
    resolutionState,
    failureImpact:raw.failureImpact||'',
    sequencingRule:raw.sequencingRule||'',
    sharedChangeWindow:raw.sharedChangeWindow===true,
    evidenceRefs:unique(list(raw.evidenceRefs)),
    sourceProvider:raw.sourceProvider||'',
    sourceReference:raw.sourceReference||'',
    observedAt:raw.observedAt||'',
    notes:raw.notes||''
  };
}

export function dependencyIssues(raw={}, context={}) {
  const d=normalizeDependency(raw);
  const known=new Set((context.applications||[]).map(x=>x.id));
  const issues=[];
  if(!d.sourceId) issues.push('Dependency source is unresolved.');
  if(!d.targetId) issues.push('Dependency target is unresolved.');
  if(d.sourceType==='application' && d.sourceId && !known.has(d.sourceId)) issues.push(`Source application ${d.sourceId} is not in the local portfolio.`);
  if(d.targetType==='application' && d.targetId && !known.has(d.targetId)) issues.push(`Target application ${d.targetId} is not in the local portfolio.`);
  if(d.confidence===null) issues.push('Dependency confidence is not supplied.');
  if(!d.evidenceRefs.length && !d.sourceReference) issues.push('Dependency has no evidence or source reference.');
  if(d.migrationCoupling==='Unknown') issues.push('Migration coupling is not assessed.');
  return {valid:issues.length===0,issues,dependency:d};
}

export function unresolvedDependencies(dependencies=[],context={}) {
  return dependencies.map(normalizeDependency)
    .map(d=>({dependency:d,issues:dependencyIssues(d,context).issues}))
    .filter(x=>x.dependency.resolutionState!=='Resolved'||x.issues.length>0);
}

export function adjacency(dependencies=[], options={}) {
  const threshold=options.couplingLevels||['High','Mandatory'];
  const graph=new Map();
  const add=(a,b)=>{
    if(!a||!b) return;
    if(!graph.has(a)) graph.set(a,new Set());
    graph.get(a).add(b);
  };
  for(const raw of dependencies){
    const d=normalizeDependency(raw);
    if(!threshold.includes(d.migrationCoupling)) continue;
    if(d.resolutionState!=='Resolved') continue;
    add(d.sourceId,d.targetId);
    // For co-migration grouping, strong directed dependencies still couple both members.
    add(d.targetId,d.sourceId);
  }
  return graph;
}

export function connectedComponents(applicationIds=[], dependencies=[], options={}) {
  const graph=adjacency(dependencies,options);
  const ids=unique(applicationIds.filter(Boolean));
  ids.forEach(id=>{if(!graph.has(id))graph.set(id,new Set())});
  const seen=new Set(), groups=[];
  for(const id of ids){
    if(seen.has(id)) continue;
    const stack=[id], group=[];
    while(stack.length){
      const current=stack.pop();
      if(seen.has(current)) continue;
      seen.add(current); group.push(current);
      for(const n of graph.get(current)||[]) if(!seen.has(n)) stack.push(n);
    }
    groups.push(group.sort());
  }
  return groups.sort((a,b)=>b.length-a.length || a[0].localeCompare(b[0]));
}

function sequenceEdges(dependencies=[]){
  return dependencies.map(normalizeDependency)
    .filter(d=>d.resolutionState==='Resolved' && d.sourceId && d.targetId)
    .filter(d=>d.sequencingRule && d.sequencingRule!=='None')
    .map(d=>{
      // Canonical semantics:
      // TARGET_BEFORE_SOURCE means the target must transition first.
      // SOURCE_BEFORE_TARGET means the source must transition first.
      if(d.sequencingRule==='TARGET_BEFORE_SOURCE') return {from:d.targetId,to:d.sourceId,dependencyId:d.id};
      if(d.sequencingRule==='SOURCE_BEFORE_TARGET') return {from:d.sourceId,to:d.targetId,dependencyId:d.id};
      return null;
    }).filter(Boolean);
}

export function detectCycles(nodes=[],edges=[]){
  const out=new Map(nodes.map(n=>[n,[]]));
  edges.forEach(e=>{if(out.has(e.from))out.get(e.from).push(e.to)});
  const visiting=new Set(), visited=new Set(), cycles=[];
  const stack=[];
  function dfs(node){
    if(visiting.has(node)){
      const i=stack.indexOf(node);
      cycles.push([...stack.slice(i),node]);
      return;
    }
    if(visited.has(node)) return;
    visiting.add(node); stack.push(node);
    for(const next of out.get(node)||[]) dfs(next);
    stack.pop(); visiting.delete(node); visited.add(node);
  }
  nodes.forEach(dfs);
  return cycles;
}

export function topologicalLayers(nodes=[],edges=[]){
  const nodeSet=new Set(nodes);
  const indegree=new Map(nodes.map(n=>[n,0]));
  const out=new Map(nodes.map(n=>[n,[]]));
  edges.forEach(e=>{
    if(!nodeSet.has(e.from)||!nodeSet.has(e.to)||e.from===e.to) return;
    out.get(e.from).push(e.to);
    indegree.set(e.to,(indegree.get(e.to)||0)+1);
  });
  const layers=[];
  let remaining=new Set(nodes);
  while(remaining.size){
    const zero=[...remaining].filter(n=>(indegree.get(n)||0)===0).sort();
    if(!zero.length) return {layers,cycle:true,remaining:[...remaining].sort()};
    layers.push(zero);
    for(const n of zero){
      remaining.delete(n);
      for(const t of out.get(n)||[]) indegree.set(t,indegree.get(t)-1);
    }
  }
  return {layers,cycle:false,remaining:[]};
}

export function candidateTransitionWaves(workspace={}, options={}) {
  const applications=workspace.applications||[];
  const dependencies=(workspace.dependencies||[]).map(normalizeDependency);
  const appIds=applications.map(a=>a.id).filter(Boolean);
  const groups=connectedComponents(appIds,dependencies,{
    couplingLevels:options.couplingLevels||['High','Mandatory']
  });
  const appToGroup=new Map();
  groups.forEach((g,i)=>g.forEach(id=>appToGroup.set(id,i)));

  const precedence=sequenceEdges(dependencies);
  const groupEdges=[];
  for(const e of precedence){
    const from=appToGroup.get(e.from), to=appToGroup.get(e.to);
    if(from===undefined||to===undefined||from===to) continue;
    groupEdges.push({from:`GRP-${from+1}`,to:`GRP-${to+1}`,dependencyId:e.dependencyId});
  }
  const groupNodes=groups.map((_,i)=>`GRP-${i+1}`);
  const order=topologicalLayers(groupNodes,groupEdges);

  const unresolved=unresolvedDependencies(dependencies,{applications});
  const waves=groups.map((ids,i)=>{
    const relevant=dependencies.filter(d=>ids.includes(d.sourceId)||ids.includes(d.targetId));
    const confidenceValues=relevant.map(d=>d.confidence).filter(v=>v!==null);
    const avgConfidence=confidenceValues.length
      ? confidenceValues.reduce((a,b)=>a+b,0)/confidenceValues.length
      : null;
    const unresolvedCount=unresolved.filter(x=>ids.includes(x.dependency.sourceId)||ids.includes(x.dependency.targetId)).length;
    return {
      id:`CWAVE-${i+1}`,
      groupId:`GRP-${i+1}`,
      applicationIds:ids,
      rationale:ids.length>1
        ? 'Candidate co-migration group due to high/mandatory resolved coupling.'
        : 'Standalone candidate group under the current coupling threshold.',
      dependencyIds:relevant.map(d=>d.id),
      averageDependencyConfidence:avgConfidence,
      unresolvedDependencyCount:unresolvedCount,
      sequenceLayer:order.cycle?null:(order.layers.findIndex(layer=>layer.includes(`GRP-${i+1}`))+1 || null),
      status:'Candidate only — human review required'
    };
  });

  return {
    generatedAt:new Date().toISOString(),
    couplingThreshold:options.couplingLevels||['High','Mandatory'],
    candidateWaves:waves,
    precedenceEdges:groupEdges,
    sequenceLayers:order.layers,
    sequencingCycle:order.cycle,
    sequencingRemainder:order.remaining,
    unresolvedDependencies:unresolved,
    authorityState:'Advisory analysis only'
  };
}

export function blastRadius(applicationId, dependencies=[], depth=1){
  const normalized=dependencies.map(normalizeDependency);
  const graph=new Map();
  const add=(a,b,id)=>{
    if(!a||!b)return;
    if(!graph.has(a))graph.set(a,[]);
    graph.get(a).push({id,target:b});
  };
  normalized.forEach(d=>{
    add(d.sourceId,d.targetId,d.id);
    if(d.direction!=='DIRECTED') add(d.targetId,d.sourceId,d.id);
    // Even directed dependencies have reverse impact relevance.
    else add(d.targetId,d.sourceId,d.id);
  });
  const visited=new Set([applicationId]), frontier=[{id:applicationId,level:0}], affected=[];
  while(frontier.length){
    const {id,level}=frontier.shift();
    if(level>=depth) continue;
    for(const edge of graph.get(id)||[]){
      if(visited.has(edge.target)) continue;
      visited.add(edge.target);
      affected.push({applicationId:edge.target,viaDependencyId:edge.id,depth:level+1});
      frontier.push({id:edge.target,level:level+1});
    }
  }
  return {applicationId,depth,affected};
}
