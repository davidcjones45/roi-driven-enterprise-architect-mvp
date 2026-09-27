import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDependencyGraph, analyzeDependencyGraph, dependencyAccumulationDelta,
  normalizeContinuityAnchor, normalizeEssentialAction
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
