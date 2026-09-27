import test from 'node:test';
import assert from 'node:assert/strict';
import { dependencyGraphCifProjection, dependencyAnalysisEngagementEvidence } from './dependency-cif-bridge.mjs';

const workspace={
  graphNodes:[
    {id:'APP',label:'Application',nodeType:'application',sourceSystem:'Manual'},
    {id:'IDP',label:'Identity provider',nodeType:'external-service',sourceSystem:'Manual'}
  ],
  graphEdges:[
    {id:'EDGE-1',sourceId:'APP',targetId:'IDP',edgeType:'depends-on',dimension:'technical',
     evidenceRefs:['EVD-1'],resolutionState:'Resolved'}
  ],
  continuityAnchors:[{id:'CA-1',label:'Customer access'}],
  essentialActions:[{id:'EA-1',label:'Authenticate',anchorId:'CA-1',dependencyNodeIds:['IDP']}],
  dependencyMitigations:[],
  dependencyMitigationLifecycle:[]
};

test('projects graph dependencies into CIF OF-09 candidates without canonicalizing them',()=>{
  const p=dependencyGraphCifProjection(workspace,{generatedAt:'2026-09-27T20:00:00.000Z'});
  assert.equal(p.cifFrameworkVersion,'0.4.1');
  assert.equal(p.dependencies.length,1);
  assert.equal(p.dependencies[0].cifDependencyCandidate.family,'OF-09');
  assert.equal(p.dependencies[0].relationshipCandidate.relationshipType,'DEPENDS_ON');
  assert.equal(p.dependencies[0].conformanceState,'PASS');
  assert.match(p.localAuthorityBoundary,/Projection only/i);
});

test('keeps continuity anchor binding unresolved between Purpose and Outcome',()=>{
  const p=dependencyGraphCifProjection(workspace);
  assert.deepEqual(p.continuityAnchors[0].cifCandidateFamilies,['OF-02','OF-03']);
  assert.equal(p.continuityAnchors[0].classificationState,'HUMAN_CLASSIFICATION_REQUIRED');
});

test('builds a qualified consulting evidence record from dependency analysis',()=>{
  const e=dependencyAnalysisEngagementEvidence(workspace,{reviewer:'Architect',observedAt:'2026-09-27T20:00:00.000Z'});
  assert.equal(e.evidence_type,'System or architecture document');
  assert.equal(e.classification,'Consultant inference');
  assert.equal(e.review_state,'Reviewed with limitation');
  assert.match(e.limitation_or_gap,/do not establish/i);
  assert.match(e.relevance,/CIF dependency relationship candidates/i);
});
