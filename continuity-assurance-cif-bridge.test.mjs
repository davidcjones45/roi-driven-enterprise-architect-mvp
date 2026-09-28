import test from 'node:test';
import assert from 'node:assert/strict';
import { continuityAssuranceCifHandoff } from './continuity-assurance-cif-bridge.mjs';

const workspace={
  graphNodes:[{id:'APP',label:'App',nodeType:'application'},{id:'IDP',label:'IDP',nodeType:'external-service'}],
  graphEdges:[{id:'DEP-1',sourceId:'APP',targetId:'IDP',edgeType:'depends-on',dimension:'technical',resolutionState:'Resolved',evidenceRefs:['E1']}],
  continuityAnchors:[{id:'CA-1',label:'Customer access'}],
  essentialActions:[{id:'EA-1',label:'Authenticate',anchorId:'CA-1',dependencyNodeIds:['IDP']}],
  evidence:[{evidence_id:'E1',classification:'Verified fact',review_state:'Reviewed with limitation'}],
  relianceClaims:[{id:'R1',relyingActorRef:'ROLE-OPS',essentialActionRef:'EA-1',dependencyRefs:['DEP-1'],evidenceRefs:['E1'],scope:'Production',boundary:'Current configuration',status:'SUPPORTED'}],
  constraintValidations:[],reassessmentRecords:[],evidenceConflictCases:[],successorAssuranceRecords:[],interventionOutcomes:[],dependencyMitigations:[],dependencyMitigationLifecycle:[]
};

test('continuity handoff extends dependency CIF projection without canonicalizing specialization records',()=>{
  const handoff=continuityAssuranceCifHandoff(workspace,{generatedAt:'2026-09-28T21:00:00.000Z'});
  assert.equal(handoff.specialization,'CIF-S-009');
  assert.equal(handoff.applicationPattern,'CIF-AP-002');
  assert.equal(handoff.canonicalization,false);
  assert.equal(handoff.relianceClaims.length,1);
  assert.equal(handoff.relianceClaims[0].classificationState,'SPECIALIZATION_METADATA_ONLY');
  assert.match(handoff.localAuthorityBoundary,/does not create canonical Authority/i);
});

test('continuity handoff preserves dependency projection and evidence state separately',()=>{
  const handoff=continuityAssuranceCifHandoff(workspace);
  assert.ok(handoff.dependencyProjection.dependencies.length>=1);
  assert.equal(handoff.evidenceStates[0].relianceClaimRef,'R1');
  assert.equal(handoff.evidenceStates[0].effectiveStatus,'SUPPORTED');
});
