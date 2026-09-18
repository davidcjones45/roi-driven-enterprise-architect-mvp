import assert from 'node:assert/strict';
import test from 'node:test';
import {
  OPERATING_CYCLE_SCREENS,
  deriveScreenReadiness,
  buildOperatingCycle,
  buildExecutivePackageGate,
  validateCycleEntailment,
  applyMaterialChangeToCycle,
  buildSecondEditionCycleProjection
} from './roi-ea-cross-screen-operating-cycle-model.mjs';

test('A8 defines exactly the five logical Second Edition screens', () => {
  assert.deepEqual(OPERATING_CYCLE_SCREENS.map(x=>x.label),[
    'Decision Overview',
    'Business Case & Evidence',
    'Architecture & Authority',
    'Process & AI Analysis',
    'Decision & Executive Package'
  ]);
});

test('screen readiness is review readiness, not approval or navigation lock', () => {
  const result=deriveScreenReadiness({
    screenKey:'BUSINESS_CASE_EVIDENCE',
    artifacts:[
      {id:'A1',screenKey:'BUSINESS_CASE_EVIDENCE',artifactType:'EVIDENCE',resolutionState:'RESOLVED'},
      {id:'A2',screenKey:'BUSINESS_CASE_EVIDENCE',artifactType:'ECONOMICS',resolutionState:'RESOLVED'}
    ]
  });
  assert.equal(result.status,'READY_FOR_REVIEW');
  assert.equal(result.navigationLocked,false);
  assert.equal(result.createsDecision,false);
  assert.equal(result.createsAuthorization,false);
  assert.equal(result.createsApproval,false);
});

test('required unresolved artifact keeps its screen not ready', () => {
  const result=deriveScreenReadiness({
    screenKey:'ARCHITECTURE_AUTHORITY',
    artifacts:[
      {id:'A1',screenKey:'ARCHITECTURE_AUTHORITY',artifactType:'AUTHORITY',resolutionState:'UNRESOLVED'}
    ]
  });
  assert.equal(result.status,'NOT_READY');
  assert.deepEqual(result.unresolvedArtifactIds,['A1']);
});

test('blocked artifact makes screen blocked without inferring a decision', () => {
  const cycle=buildOperatingCycle({
    artifacts:[
      {id:'A1',screenKey:'PROCESS_AI_ANALYSIS',artifactType:'HUMAN_CONTROL',resolutionState:'BLOCKED'}
    ]
  });
  assert.equal(cycle.screens.PROCESS_AI_ANALYSIS.status,'BLOCKED');
  assert.equal(cycle.autoDecision,false);
  assert.equal(cycle.autoRecommendation,false);
});

test('cross-screen link to missing artifact is incomplete rather than silently repaired', () => {
  const cycle=buildOperatingCycle({
    artifacts:[
      {id:'A1',screenKey:'DECISION_OVERVIEW',artifactType:'DECISION_QUESTION',resolutionState:'RESOLVED'}
    ],
    links:[
      {id:'L1',sourceArtifactId:'A1',targetArtifactId:'MISSING',relationshipType:'MAPS_TO'}
    ]
  });
  assert.equal(cycle.status,'INCOMPLETE');
  assert.equal(cycle.issues.some(x=>x.includes('unknown target artifact')),true);
});

test('evidence does not entail a decision', () => {
  const result=validateCycleEntailment({
    sourceConcept:'EVIDENCE',
    proposedConcept:'DECISION'
  });
  assert.equal(result.valid,false);
  assert.equal(result.status,'FORBIDDEN_ENTAILMENT');
});

test('classification does not entail authorization even inside an integrated cycle', () => {
  const result=validateCycleEntailment({
    sourceConcept:'CLASSIFICATION',
    proposedConcept:'AUTHORIZATION'
  });
  assert.equal(result.valid,false);
});

test('explicit materially different assertion requires an independent basis', () => {
  const noBasis=validateCycleEntailment({
    sourceConcept:'IMPACT_ASSESSMENT',
    proposedConcept:'INVESTMENT_DECISION',
    explicitAssertion:true
  });
  assert.equal(noBasis.status,'INSUFFICIENT_BASIS');

  const withBasis=validateCycleEntailment({
    sourceConcept:'IMPACT_ASSESSMENT',
    proposedConcept:'INVESTMENT_DECISION',
    explicitAssertion:true,
    derivationBasis:['DEC-1']
  });
  assert.equal(withBasis.valid,true);
});

test('executive package gate preserves unresolved and blocked conditions and creates no decision', () => {
  const cycle=buildOperatingCycle({
    artifacts:[
      {id:'D',screenKey:'DECISION_OVERVIEW',artifactType:'DECISION_QUESTION',resolutionState:'RESOLVED'},
      {id:'B',screenKey:'BUSINESS_CASE_EVIDENCE',artifactType:'ECONOMICS',resolutionState:'RESOLVED'},
      {id:'A',screenKey:'ARCHITECTURE_AUTHORITY',artifactType:'AUTHORITY',resolutionState:'UNRESOLVED'},
      {id:'P',screenKey:'PROCESS_AI_ANALYSIS',artifactType:'CLASSIFICATION',resolutionState:'RESOLVED'}
    ]
  });
  const gate=buildExecutivePackageGate(cycle);
  assert.equal(gate.readyForExecutiveDecisionReview,false);
  assert.deepEqual(gate.unresolvedArtifactIds,['A']);
  assert.equal(gate.decision,null);
  assert.equal(gate.recommendation,null);
  assert.equal(gate.authorization,null);
});

test('fully resolved prior screens can become ready for executive decision review without auto-deciding', () => {
  const cycle=buildOperatingCycle({
    artifacts:[
      {id:'D',screenKey:'DECISION_OVERVIEW',artifactType:'DECISION_QUESTION',resolutionState:'RESOLVED'},
      {id:'B',screenKey:'BUSINESS_CASE_EVIDENCE',artifactType:'ECONOMICS',resolutionState:'RESOLVED'},
      {id:'A',screenKey:'ARCHITECTURE_AUTHORITY',artifactType:'AUTHORITY',resolutionState:'RESOLVED'},
      {id:'P',screenKey:'PROCESS_AI_ANALYSIS',artifactType:'CLASSIFICATION',resolutionState:'RESOLVED'}
    ]
  });
  const gate=buildExecutivePackageGate(cycle);
  assert.equal(gate.readyForExecutiveDecisionReview,true);
  assert.equal(gate.packageStatus,'READY_FOR_EXECUTIVE_DECISION_REVIEW');
  assert.equal(gate.decision,null);
});

test('material change reopens only explicitly affected artifacts and does not infer propagation', () => {
  const cycle=buildOperatingCycle({
    artifacts:[
      {id:'A1',screenKey:'BUSINESS_CASE_EVIDENCE',artifactType:'ECONOMICS',resolutionState:'RESOLVED'},
      {id:'A2',screenKey:'ARCHITECTURE_AUTHORITY',artifactType:'AUTHORITY',resolutionState:'RESOLVED'}
    ]
  });

  const result=applyMaterialChangeToCycle({
    cycle,
    change:{id:'CHG-1',affectedArtifactIds:['A2']}
  });

  assert.equal(result.status,'REASSESSMENT_REQUIRED');
  assert.equal(result.cycle.artifacts.find(x=>x.id==='A1').resolutionState,'RESOLVED');
  assert.equal(result.cycle.artifacts.find(x=>x.id==='A2').resolutionState,'UNRESOLVED');
  assert.equal(result.propagationInferred,false);
  assert.equal(result.sourceRecordsModified,false);
});

test('Second Edition projection maps A1-A7 source states into five-screen cycle without copying authority into classification', () => {
  const cycle=buildSecondEditionCycleProjection({
    decision:{id:'DEC-1',resolutionState:'RESOLVED'},
    economics:{caseId:'CASE-1',resolutionState:'RESOLVED'},
    evidence:{id:'EVD-1',resolutionState:'RESOLVED'},
    authority:{id:'AUTH-1',resolutionState:'RESOLVED'},
    architecture:{id:'ARCH-1',resolutionState:'RESOLVED'},
    aacm:{id:'AACM-1',resolutionState:'RESOLVED'},
    humanControl:{id:'HC-1',resolutionState:'RESOLVED'},
    impact:{id:'IA-1',resolutionState:'RESOLVED'},
    portfolio:{id:'PORT-1',resolutionState:'RESOLVED'},
    executivePackage:{id:'PKG-1',resolutionState:'RESOLVED'}
  });
  assert.equal(cycle.status,'READY_FOR_DECISION_REVIEW');
  assert.equal(cycle.screens.PROCESS_AI_ANALYSIS.status,'READY_FOR_REVIEW');
  assert.equal(cycle.autoAuthorization,false);
  const aacm=cycle.artifacts.find(x=>x.id==='ART-AACM');
  const authority=cycle.artifacts.find(x=>x.id==='ART-AUTHORITY');
  assert.notEqual(aacm.sourceRecordId,authority.sourceRecordId);
});
