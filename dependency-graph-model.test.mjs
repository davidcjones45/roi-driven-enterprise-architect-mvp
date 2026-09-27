import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDependencyGraph, analyzeDependencyGraph, dependencyAccumulationDelta,
  normalizeContinuityAnchor, normalizeEssentialAction, graphSourceSummary,
  crossSourceConnections, reviewedCrossSourceConnections, essentialDependencyCoverage,
  sharedFailureDomainCandidates, multiSourceNodes, dependencyFindingsSummary, upsertDependencyFindingReview, dependencyFindingToConsultingRecord, normalizeDependencyMitigation, previewDependencyMitigation, applyValidatedDependencyMitigation
} from './dependency-graph-model.mjs';
import { bpmnImportToDependencyGraph } from './bpmn-dependency-adapter.mjs';
import { microsoftGraphOrgToDependencyGraph } from './ms-graph-org-adapter.mjs';

test('builds a provider-neutral dependency graph from existing modernization data',()=>{
  const graph=buildDependencyGraph({
    applications:[{id:'APP-A',name:'A'},{id:'APP-B',name:'B'}],
    dependencies:[{id:'DEP-1',sourceId:'APP-A',targetId:'APP-B',dependencyType:'runtime',resolutionState:'Resolved'}]
  });
  assert.equal(graph.nodes.length,2);
  assert.equal(graph.edges.length,1);
  assert.equal(graph.edges[0].dimension,'technical');
});

test('identifies concentration and candidate constraining dependencies without treating dependency as inherently bad',()=>{
  const workspace={
    graphNodes:[
      {id:'GRID',label:'Grid power',nodeType:'infrastructure'},
      {id:'GEN',label:'Emergency generator',nodeType:'infrastructure'},
      {id:'ICU',label:'ICU systems',nodeType:'application'},
      {id:'OR',label:'Operating room systems',nodeType:'application'},
      {id:'ED',label:'Emergency department systems',nodeType:'application'},
    ],
    graphEdges:[
      {id:'E1',sourceId:'ICU',targetId:'GRID',edgeType:'depends-on',dimension:'technical'},
      {id:'E2',sourceId:'OR',targetId:'GRID',edgeType:'depends-on',dimension:'technical'},
      {id:'E3',sourceId:'ED',targetId:'GRID',edgeType:'depends-on',dimension:'technical'},
    ],
    continuityAnchors:[normalizeContinuityAnchor({id:'CA-CARE',label:'Critical patient care'})],
    essentialActions:[
      normalizeEssentialAction({id:'EA-ICU',label:'Maintain ICU monitoring',anchorId:'CA-CARE',dependencyNodeIds:['GRID'],fallbackNodeIds:['GEN'],toleranceMinutes:1}),
      normalizeEssentialAction({id:'EA-OR',label:'Maintain emergency surgery',anchorId:'CA-CARE',dependencyNodeIds:['GRID'],toleranceMinutes:1}),
    ]
  };
  const result=analyzeDependencyGraph(workspace,{minimumInbound:3});
  assert.equal(result.concentrationCandidates[0].nodeId,'GRID');
  assert.deepEqual(result.constrainingDependencyCandidates.map(x=>x.nodeId),['GRID']);
  assert.equal(result.graph.essentialActions.find(x=>x.id==='EA-ICU').fallbackNodeIds[0],'GEN');
});

test('dependency accumulation delta is descriptive rather than a risk verdict',()=>{
  const prior={nodes:[{id:'A'}],edges:[]};
  const current={nodes:[{id:'A'},{id:'B'}],edges:[{id:'E1'}]};
  const delta=dependencyAccumulationDelta(prior,current);
  assert.equal(delta.nodeDelta,1);
  assert.equal(delta.edgeDelta,1);
  assert.match(delta.interpretation,/not inherently adverse/i);
});

test('BPMN adapter maps modeled process structure without asserting operating truth',()=>{
  const result=bpmnImportToDependencyGraph({
    source:{sha256:'abc'},status:'STAGED',
    elements:[
      {sourceId:'P1',bpmnType:'bpmn:Process',name:'Claims'},
      {sourceId:'T1',bpmnType:'bpmn:UserTask',name:'Review claim'},
      {sourceId:'T2',bpmnType:'bpmn:ServiceTask',name:'Validate policy'},
    ],
    relationships:[{kind:'SEQUENCE_FLOW',sourceId:'T1',targetId:'T2'}]
  });
  assert.equal(result.nodes.length,3);
  assert.equal(result.edges[0].dimension,'process');
  assert.match(result.limitations[0],/modeled process structure/i);
});

test('Microsoft Graph adapter reconstructs reporting relationships but does not infer authority',()=>{
  const result=microsoftGraphOrgToDependencyGraph({
    tenantId:'TENANT',
    users:[
      {id:'1',displayName:'Analyst',jobTitle:'Analyst',department:'Risk'},
      {id:'2',displayName:'Manager',jobTitle:'Manager',department:'Risk'},
    ],
    relationships:[{userId:'1',managerId:'2'}]
  });
  assert.equal(result.nodes.length,2);
  assert.equal(result.edges.length,1);
  assert.equal(result.edges[0].edgeType,'reports-to');
  assert.match(result.limitations[0],/not process ownership or decision authority/i);
});

import { createDependencyGraphSnapshot, compareDependencyGraphSnapshots } from './dependency-graph-model.mjs';

test('captures immutable point-in-time dependency snapshots and compares accumulation',()=>{
  const base={
    graphNodes:[{id:'A',label:'A',nodeType:'application'},{id:'B',label:'B',nodeType:'vendor'}],
    graphEdges:[{id:'E1',sourceId:'A',targetId:'B',edgeType:'depends-on',dimension:'vendor'}],
    continuityAnchors:[{id:'CA-1',label:'Service continuity'}],
    essentialActions:[{id:'EA-1',label:'Serve customer',anchorId:'CA-1',dependencyNodeIds:['B']}]
  };
  const prior=createDependencyGraphSnapshot(base,{id:'S1',label:'Before',capturedAt:'2026-09-01T00:00:00.000Z'});
  const current=createDependencyGraphSnapshot({...base,graphNodes:[...base.graphNodes,{id:'C',label:'C',nodeType:'vendor'}],graphEdges:[...base.graphEdges,{id:'E2',sourceId:'A',targetId:'C',edgeType:'depends-on',dimension:'vendor'}]},{id:'S2',label:'After',capturedAt:'2026-09-02T00:00:00.000Z'});
  const c=compareDependencyGraphSnapshots(prior,current);
  assert.equal(c.accumulation.nodeDelta,1);
  assert.equal(c.accumulation.edgeDelta,1);
  assert.deepEqual(c.recordChanges.nodes.added,['C']);
  assert.deepEqual(c.recordChanges.edges.added,['E2']);
});

test('comparison reports new and relieved candidate findings as reassessment signals',()=>{
  const mk=(id,graph,analysis)=>({profile:'AIHS-DEPENDENCY-GRAPH-SNAPSHOT-V0.1',id,capturedAt:`2026-09-0${id==='P'?1:2}T00:00:00.000Z`,graph,analysis});
  const graph={nodes:[{id:'N1'}],edges:[],continuityAnchors:[],essentialActions:[]};
  const prior=mk('P',graph,{concentrationCandidates:[],constrainingDependencyCandidates:[],fragmentationCandidates:[]});
  const current=mk('C',graph,{concentrationCandidates:[{nodeId:'N1'}],constrainingDependencyCandidates:[{nodeId:'N1'}],fragmentationCandidates:[]});
  const c=compareDependencyGraphSnapshots(prior,current);
  assert.deepEqual(c.newlyConcentratedNodeIds,['N1']);
  assert.deepEqual(c.newlyConstrainingNodeIds,['N1']);
  assert.match(c.interpretation.join(' '),/human validation/i);
});


test('preserves provenance when graph records from more than one source share an ID',()=>{
  const graph=buildDependencyGraph({
    applications:[{id:'APP-A',name:'Claims'}],
    graphNodes:[{id:'APP-A',label:'Claims',nodeType:'application',sourceSystem:'Manual',sourceReference:'Interview-1'}]
  });
  const node=graph.nodes.find(x=>x.id==='APP-A');
  assert.ok(node);
  assert.deepEqual(new Set(node.provenance.map(x=>x.sourceType)),new Set(['Modernization','Manual']));
  assert.equal(multiSourceNodes(graph)[0].node.id,'APP-A');
});

test('summarizes source provenance across a unified graph',()=>{
  const graph=buildDependencyGraph({
    applications:[{id:'APP-A',name:'A'}],
    graphNodes:[{id:'P1',label:'Person',nodeType:'person',sourceSystem:'Microsoft Graph'}],
    graphEdges:[{id:'E1',sourceId:'P1',targetId:'APP-A',edgeType:'owns',dimension:'organizational',sourceSystem:'Manual'}]
  });
  const summary=graphSourceSummary(graph);
  assert.ok(summary.some(x=>x.sourceType==='Modernization'&&x.nodes===1));
  assert.ok(summary.some(x=>x.sourceType==='Microsoft Graph'&&x.nodes===1));
  assert.ok(summary.some(x=>x.sourceType==='Manual'&&x.edges===1));
});

test('identifies explicit cross-source connections without inferring them',()=>{
  const graph=buildDependencyGraph({
    graphNodes:[
      {id:'BPMN-T1',label:'Review',nodeType:'activity',sourceSystem:'BPMN'},
      {id:'MSUSER-1',label:'Analyst',nodeType:'person',sourceSystem:'Microsoft Graph'},
    ],
    graphEdges:[{id:'E1',sourceId:'MSUSER-1',targetId:'BPMN-T1',edgeType:'performs',dimension:'human',sourceSystem:'Manual'}]
  });
  const rows=crossSourceConnections(graph);
  assert.equal(rows.length,1);
  assert.deepEqual(rows[0].sourceSources,['Microsoft Graph']);
  assert.deepEqual(rows[0].targetSources,['BPMN']);
});

test('identifies recorded shared failure domains affecting multiple dependencies',()=>{
  const graph=buildDependencyGraph({
    graphNodes:[
      {id:'A',label:'App A',nodeType:'application'},
      {id:'B',label:'App B',nodeType:'application'},
      {id:'IDP',label:'Identity provider',nodeType:'external-service'},
    ],
    graphEdges:[
      {id:'E1',sourceId:'A',targetId:'IDP',edgeType:'depends-on',dimension:'authority',sharedFailureDomain:'Enterprise identity'},
      {id:'E2',sourceId:'B',targetId:'IDP',edgeType:'depends-on',dimension:'authority',sharedFailureDomain:'Enterprise identity'},
    ],
    essentialActions:[
      {id:'EA1',label:'Serve A',dependencyNodeIds:['IDP']},
      {id:'EA2',label:'Serve B',dependencyNodeIds:['IDP']},
    ]
  });
  const rows=sharedFailureDomainCandidates(graph);
  assert.equal(rows.length,1);
  assert.equal(rows[0].domain,'Enterprise identity');
  assert.equal(rows[0].edgeIds.length,2);
  assert.equal(rows[0].essentialActionIds.length,2);
});


test('distinguishes explicitly reviewed cross-source relationships from merely recorded cross-source edges',()=>{
  const graph=buildDependencyGraph({
    graphNodes:[
      {id:'BPMN-T1',label:'Review claim',nodeType:'activity',sourceSystem:'BPMN'},
      {id:'MSUSER-1',label:'Analyst',nodeType:'person',sourceSystem:'Microsoft Graph'},
    ],
    graphEdges:[
      {id:'E-UNREVIEWED',sourceId:'MSUSER-1',targetId:'BPMN-T1',edgeType:'performs',dimension:'human',sourceSystem:'Manual'},
      {id:'E-REVIEWED',sourceId:'BPMN-T1',targetId:'MSUSER-1',edgeType:'depends-on',dimension:'human',sourceSystem:'Reviewed cross-source',
       reviewState:'Reviewed',reviewer:'Consultant',reviewedAt:'2026-09-27T12:00:00.000Z',reviewNote:'Interview-confirmed',evidenceRefs:['EVD-1']},
    ]
  });
  assert.equal(crossSourceConnections(graph).length,2);
  const reviewed=reviewedCrossSourceConnections(graph);
  assert.equal(reviewed.length,1);
  assert.equal(reviewed[0].edgeId,'E-REVIEWED');
  assert.equal(reviewed[0].reviewer,'Consultant');
});

test('ties dependency nodes to Essential Actions and Continuity Anchors for diagnostic emphasis',()=>{
  const graph=buildDependencyGraph({
    graphNodes:[{id:'IDP',label:'Identity provider',nodeType:'external-service'}],
    continuityAnchors:[{id:'CA-1',label:'Customer access'}],
    essentialActions:[{id:'EA-1',label:'Authenticate customer',anchorId:'CA-1',dependencyNodeIds:['IDP'],toleranceMinutes:5}]
  });
  const rows=essentialDependencyCoverage(graph);
  assert.equal(rows.length,1);
  assert.equal(rows[0].nodeId,'IDP');
  assert.equal(rows[0].anchorLabel,'Customer access');
  assert.equal(rows[0].actionLabel,'Authenticate customer');
  assert.equal(rows[0].mitigated,false);
});


test('derives qualified consulting review candidates rather than final findings',()=>{
  const analysis=analyzeDependencyGraph({
    graphNodes:[
      {id:'IDP',label:'Identity provider',nodeType:'external-service'},
      {id:'A',label:'A',nodeType:'application'},
      {id:'B',label:'B',nodeType:'application'},
      {id:'C',label:'C',nodeType:'application'},
    ],
    graphEdges:[
      {id:'1',sourceId:'A',targetId:'IDP',sharedFailureDomain:'CLOUD'},
      {id:'2',sourceId:'B',targetId:'IDP',sharedFailureDomain:'CLOUD'},
      {id:'3',sourceId:'C',targetId:'IDP',sharedFailureDomain:'CLOUD'},
    ],
    continuityAnchors:[{id:'CA',label:'Customer access'}],
    essentialActions:[{id:'EA',label:'Authenticate',anchorId:'CA',dependencyNodeIds:['IDP']}],
  },{minimumInbound:3});
  assert.ok(analysis.findingsSummary.some(x=>x.type==='CONSTRAINING_DEPENDENCY_CANDIDATE'));
  assert.ok(analysis.findingsSummary.some(x=>x.type==='DEPENDENCY_CONCENTRATION_CANDIDATE'));
  assert.ok(analysis.findingsSummary.every(x=>/Candidate only|does not|require|until/i.test(x.limitation)));
});


test('records candidate disposition and converts accepted finding to consulting record',()=>{
  const candidate={
    type:'CONSTRAINING_DEPENDENCY_CANDIDATE',
    subjectId:'IDP',
    statement:'Identity dependency may constrain authentication.',
    limitation:'Candidate only.'
  };
  const reviews=upsertDependencyFindingReview([],candidate,{
    disposition:'Accept',reviewer:'Consultant',reviewedAt:'2026-09-27T18:00:00.000Z',
    owner:'CIO',requiredAction:'Validate fallback and tolerance.',severity:'High',decisionImpact:'Material',note:'Supported by reviewed dependency evidence.'
  });
  assert.equal(reviews.length,1);
  assert.equal(reviews[0].disposition,'Accept');
  const finding=dependencyFindingToConsultingRecord(candidate,reviews[0]);
  assert.equal(finding.domain,'Architecture');
  assert.equal(finding.severity,'High');
  assert.equal(finding.owner,'CIO');
  assert.match(finding.supporting_evidence,/CONSTRAINING_DEPENDENCY_CANDIDATE/);
});

test('rejects promotion when candidate disposition is not accepted or revised',()=>{
  const candidate={type:'FRAGMENTATION_CANDIDATE',subjectId:'EA-1',statement:'Candidate',limitation:'Review required'};
  const review=upsertDependencyFindingReview([],candidate,{disposition:'Reject',reviewer:'Consultant',owner:'COO',requiredAction:'None',note:'Rejected'})[0];
  assert.throws(()=>dependencyFindingToConsultingRecord(candidate,review),/accepted or revised/i);
});


test('previews a mitigation without claiming real-world risk reduction',()=>{
  const workspace={
    graphNodes:[
      {id:'IDP',label:'Identity provider',nodeType:'external-service'},
      {id:'ALT',label:'Alternate identity provider',nodeType:'external-service'},
    ],
    continuityAnchors:[{id:'CA',label:'Customer access'}],
    essentialActions:[{id:'EA',label:'Authenticate',anchorId:'CA',dependencyNodeIds:['IDP']}],
  };
  const preview=previewDependencyMitigation(workspace,{
    targetType:'Essential Action',targetId:'EA',type:'Fallback',status:'Candidate',
    owner:'CIO',description:'Use alternate provider',replacementNodeId:'ALT',evidenceRefs:['EVD-1']
  });
  assert.equal(preview.valid,true);
  assert.deepEqual(preview.structuralEffect.relievedCandidateNodeIds,['IDP']);
  assert.match(preview.structuralEffect.interpretation,/does not establish/i);
  assert.equal(workspace.essentialActions[0].fallbackNodeIds,undefined);
});

test('applies only validated mitigation to working graph',()=>{
  const workspace={
    graphNodes:[
      {id:'IDP',label:'Identity provider',nodeType:'external-service'},
      {id:'ALT',label:'Alternate identity provider',nodeType:'external-service'},
    ],
    continuityAnchors:[{id:'CA',label:'Customer access'}],
    essentialActions:[{id:'EA',label:'Authenticate',anchorId:'CA',dependencyNodeIds:['IDP']}],
  };
  assert.throws(()=>applyValidatedDependencyMitigation(workspace,{
    targetType:'Essential Action',targetId:'EA',type:'Fallback',status:'Candidate',
    owner:'CIO',description:'Use alternate provider',replacementNodeId:'ALT',evidenceRefs:['EVD-1']
  }),/Validated or Implemented/i);
  const next=applyValidatedDependencyMitigation(workspace,{
    targetType:'Essential Action',targetId:'EA',type:'Fallback',status:'Validated',
    owner:'CIO',description:'Use alternate provider',replacementNodeId:'ALT',evidenceRefs:['EVD-1'],
    validatedBy:'Architect',validatedAt:'2026-09-27T19:00:00.000Z'
  });
  assert.deepEqual(next.essentialActions[0].fallbackNodeIds,['ALT']);
  assert.equal(next.dependencyMitigations.length,1);
});
