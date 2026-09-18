import assert from 'node:assert/strict';
import test from 'node:test';
import {
  validateImpactAssessment,
  evaluateControl,
  evaluateTrustReliance,
  validateWorkforceOperatingPattern,
  impactFromOperatingPattern
} from './roi-ea-impact-controls-trust-workforce-model.mjs';

test('impact assessment remains separate from ROI, authorization, and risk acceptance', () => {
  const result=validateImpactAssessment({
    id:'IA-1',
    subjectId:'DEP-1',
    ownerId:'OWNER-1',
    state:'COMPLETE',
    affectedGroupIds:['ROLE-COORD'],
    effectiveFrom:'2026-10-01T00:00:00Z',
    findings:[{
      id:'IF-1',
      assessmentId:'IA-1',
      impactType:'WORKFORCE',
      affectedGroupId:'ROLE-COORD',
      direction:'MIXED',
      description:'Reduces repetitive triage while increasing exception-review burden.',
      evidenceIds:['EVD-1']
    }]
  });
  assert.equal(result.status,'PASS');
  assert.equal(result.createsAuthorization,false);
  assert.equal(result.createsRiskAcceptance,false);
  assert.equal(result.createsInvestmentDecision,false);
  assert.equal(result.roiScore,null);
  assert.equal(result.universalImpactScore,null);
});

test('complete impact assessment cannot silently omit findings', () => {
  const result=validateImpactAssessment({
    id:'IA-1',subjectId:'DEP-1',ownerId:'OWNER-1',
    state:'COMPLETE',affectedGroupIds:['ROLE-1'],
    effectiveFrom:'2026-10-01T00:00:00Z',findings:[]
  });
  assert.equal(result.valid,false);
});

test('impact finding cannot reference an undeclared affected group', () => {
  const result=validateImpactAssessment({
    id:'IA-1',subjectId:'DEP-1',ownerId:'OWNER-1',
    state:'IN_REVIEW',affectedGroupIds:['ROLE-A'],
    effectiveFrom:'2026-10-01T00:00:00Z',
    findings:[{
      id:'IF-1',impactType:'WORKFORCE',affectedGroupId:'ROLE-B',
      direction:'ADVERSE',description:'Workload shift',evidenceIds:['EVD-1']
    }]
  });
  assert.equal(result.valid,false);
  assert.equal(result.issues.some(x=>x.includes('not declared')),true);
});

test('defined control is not automatically implemented, operating, or effective', () => {
  const result=evaluateControl({
    control:{
      id:'CTL-1',purpose:'Require qualified human review',ownerId:'OPS-1',
      state:'DESIGNED'
    }
  });
  assert.equal(result.implemented,false);
  assert.equal(result.operating,false);
  assert.equal(result.effectivenessEstablished,false);
  assert.equal(result.definitionCreatesImplementation,false);
  assert.equal(result.operationCreatesEffectiveness,false);
});

test('operating control still requires separate evidence-backed effectiveness assessment', () => {
  const result=evaluateControl({
    control:{
      id:'CTL-1',purpose:'Require qualified human review',ownerId:'OPS-1',
      state:'OPERATING',
      implementationEvidenceIds:['EVD-IMPL'],
      operatingEvidenceIds:['EVD-OPS']
    }
  });
  assert.equal(result.operating,true);
  assert.equal(result.effectivenessEstablished,false);
});

test('control effectiveness is established only by separate scoped assessment with evidence', () => {
  const result=evaluateControl({
    control:{
      id:'CTL-1',purpose:'Require qualified human review',ownerId:'OPS-1',
      state:'OPERATING',
      implementationEvidenceIds:['EVD-IMPL'],
      operatingEvidenceIds:['EVD-OPS']
    },
    effectivenessAssessment:{
      id:'CEA-1',controlId:'CTL-1',reviewerId:'QA-1',
      scope:'Routing pilot',result:'EFFECTIVE_FOR_SCOPE',
      evidenceIds:['EVD-TEST'],assessedAt:'2026-10-15T00:00:00Z'
    }
  });
  assert.equal(result.effectivenessEstablished,true);
  assert.equal(result.effectivenessCreatesAuthorization,false);
});

test('high reliance plus degraded trust requires review without collapsing trust into reliance', () => {
  const result=evaluateTrustReliance({
    trustState:{
      id:'TS-1',subjectId:'PROVIDER-X',purpose:'Routing inference',
      state:'DEGRADED',assessorId:'ARCH-1',
      evidenceIds:['EVD-1'],effectiveFrom:'2026-10-01T00:00:00Z'
    },
    reliance:{
      id:'REL-1',relyingObjectId:'CAP-ROUTING',subjectId:'PROVIDER-X',
      purpose:'Routing inference',criticality:'CRITICAL',
      fallbackId:'FB-1'
    }
  });
  assert.equal(result.status,'REVIEW_REQUIRED');
  assert.equal(result.highReliance,true);
  assert.equal(result.degradedTrust,true);
  assert.equal(result.trustCreatesReliance,false);
  assert.equal(result.relianceInheritsTrust,false);
});

test('strong trust does not create reliance', () => {
  const result=evaluateTrustReliance({
    trustState:{
      id:'TS-1',subjectId:'PROVIDER-X',purpose:'Routing inference',
      state:'TRUSTED_FOR_SCOPE',effectiveFrom:'2026-10-01T00:00:00Z'
    },
    reliance:{
      id:'REL-1',relyingObjectId:'CAP-ROUTING',subjectId:'PROVIDER-X',
      purpose:'Routing inference',criticality:'LOW'
    }
  });
  assert.equal(result.trustCreatesReliance,false);
});

test('workforce operating pattern is descriptive and does not create an impact conclusion', () => {
  const result=validateWorkforceOperatingPattern({
    id:'WOP-1',subjectId:'DEP-1',pattern:'AUGMENTATION',
    ownerId:'OPS-1',affectedRoleIds:['ROLE-COORD'],
    retainedHumanDecisionRights:['Final routing decision']
  });
  assert.equal(result.status,'PASS');
  assert.equal(result.createsImpactConclusion,false);
  assert.equal(result.createsAuthorization,false);
  assert.equal(result.createsWorkforceDecision,false);
});

test('delegated-action workforce pattern requires explicit delegated action references', () => {
  const result=validateWorkforceOperatingPattern({
    id:'WOP-1',subjectId:'DEP-1',pattern:'DELEGATED_ACTION',
    ownerId:'OPS-1'
  });
  assert.equal(result.valid,false);
});

test('role displacement requires explicit displacement expectation', () => {
  const result=validateWorkforceOperatingPattern({
    id:'WOP-2',subjectId:'DEP-1',pattern:'ROLE_DISPLACEMENT',
    ownerId:'OPS-1',affectedRoleIds:['ROLE-X']
  });
  assert.equal(result.valid,false);
});

test('operating pattern alone cannot stand in for impact assessment', () => {
  const result=impactFromOperatingPattern({
    operatingPattern:{
      id:'WOP-1',subjectId:'DEP-1',pattern:'TASK_AUTOMATION',
      ownerId:'OPS-1',affectedRoleIds:['ROLE-COORD'],
      displacedTaskIds:['TASK-REPETITIVE']
    }
  });
  assert.equal(result.pattern.valid,true);
  assert.equal(result.impact,null);
  assert.equal(result.impactConclusionEstablished,false);
  assert.equal(result.operatingPatternAloneCreatesImpactConclusion,false);
});

test('completed impact assessment may be linked to operating pattern without collapsing the two records', () => {
  const result=impactFromOperatingPattern({
    operatingPattern:{
      id:'WOP-1',subjectId:'DEP-1',pattern:'DECISION_SUPPORT',
      ownerId:'OPS-1',affectedRoleIds:['ROLE-COORD']
    },
    impactAssessment:{
      id:'IA-1',subjectId:'DEP-1',ownerId:'HR-1',
      state:'COMPLETE_WITH_GAPS',affectedGroupIds:['ROLE-COORD'],
      effectiveFrom:'2026-10-01T00:00:00Z',
      findings:[{
        id:'IF-1',impactType:'WORKFORCE',affectedGroupId:'ROLE-COORD',
        direction:'MIXED',description:'Decision support changes reviewer workload.',
        evidenceIds:['EVD-1']
      }]
    }
  });
  assert.equal(result.pattern.valid,true);
  assert.equal(result.impact.valid,true);
  assert.equal(result.impactConclusionEstablished,true);
});
