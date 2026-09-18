import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AACM_DIMENSIONS,
  AACM_SWARM_DIMENSIONS,
  normalizeAgenticDeployment,
  validateAACMClassification,
  validateSwarmClassification,
  assessAACMReclassification
} from './roi-ea-agentic-deployment-aacm.mjs';

const evidenceDimensions = definitions => Object.fromEntries(
  definitions.map(def => [def.key,{ value:`example-${def.key}`, status:'RESOLVED', evidenceIds:[`EVD-${def.id}`] }])
);

const deployment = {
  id:'DEP-ROUTE-1',
  aiCapabilityId:'AICAP-ROUTE',
  modelOrServiceRef:'MODEL-X',
  version:'1',
  configurationRef:'CFG-A',
  purpose:'Prepare and rank eligible routing options for human review',
  operatingEnvironment:'Production-like controlled pilot',
  availableCapabilities:[
    { id:'CAP-READ', label:'Read approved records', available:true, evidenceIds:['EVD-C1'] },
    { id:'CAP-RANK', label:'Rank eligible options', available:true, evidenceIds:['EVD-C2'] },
    { id:'CAP-WRITE', label:'Write production routing result', available:false, evidenceIds:['EVD-C3'] }
  ],
  effectiveFrom:'2026-10-01T00:00:00Z'
};

const classification = {
  id:'AACM-DEP-ROUTE-1',
  deploymentId:'DEP-ROUTE-1',
  dimensions:evidenceDimensions(AACM_DIMENSIONS),
  highestEffectiveCapabilityId:'CAP-RANK',
  highestEffectiveCapabilityBasis:'CAP-RANK is the highest consequential capability actually available; CAP-WRITE is not available.',
  reviewerId:'ARCH-1',
  effectiveFrom:'2026-10-01T00:00:00Z',
  reassessmentTriggerRefs:['CHG-TOOLS']
};

test('AACM contains exactly the 15 approved deployment dimensions', () => {
  assert.equal(AACM_DIMENSIONS.length,15);
  assert.deepEqual(AACM_DIMENSIONS.map(x=>x.label),[
    'Operational capability','Decision autonomy','Initiative','Authority scope','Delegation depth',
    'Environment of effect','Persistence','Adaptability','Composition','Human oversight',
    'Consequence magnitude','Reversibility','Observability','Dependency criticality','Recovery/resumption mode'
  ]);
});

test('same underlying model can be governed as two separate deployments', () => {
  const a = normalizeAgenticDeployment(deployment);
  const b = normalizeAgenticDeployment({
    ...deployment,
    id:'DEP-ROUTE-2',
    purpose:'Autonomously write approved routing result',
    configurationRef:'CFG-B'
  });
  assert.equal(a.modelOrServiceRef,b.modelOrServiceRef);
  assert.notEqual(a.id,b.id);
  assert.notEqual(a.purpose,b.purpose);
});

test('complete AACM classification passes without creating authorization or aggregate score', () => {
  const result = validateAACMClassification(classification,deployment);
  assert.equal(result.status,'PASS');
  assert.equal(result.createsAuthorization,false);
  assert.equal(result.riskAssessment,null);
  assert.equal(result.safetyValidation,null);
  assert.equal(result.valueJudgment,null);
  assert.equal(result.aggregateAutonomyScore,null);
});

test('AACM remains incomplete when one dimension is unresolved', () => {
  const dimensions = evidenceDimensions(AACM_DIMENSIONS);
  dimensions.humanOversight = { value:'', status:'UNRESOLVED', evidenceIds:[] };
  const result = validateAACMClassification({ ...classification, dimensions },deployment);
  assert.equal(result.status,'INCOMPLETE');
  assert.equal(result.issues.some(x=>x.includes('Human oversight is unresolved')),true);
});

test('resolved AACM dimension requires evidence', () => {
  const dimensions = evidenceDimensions(AACM_DIMENSIONS);
  dimensions.authorityScope = { value:'bounded', status:'RESOLVED', evidenceIds:[] };
  const result = validateAACMClassification({ ...classification, dimensions },deployment);
  assert.equal(result.status,'INCOMPLETE');
  assert.equal(result.issues.some(x=>x.includes('Authority scope requires evidence')),true);
});

test('highest-effective-capability must be actually available in the deployment', () => {
  const result = validateAACMClassification({
    ...classification,
    highestEffectiveCapabilityId:'CAP-WRITE'
  },deployment);
  assert.equal(result.status,'INCOMPLETE');
  assert.equal(result.issues.some(x=>x.includes('actually available')),true);
});

test('AACM does not collapse capability, authority, autonomy, and consequence into one score', () => {
  const result = validateAACMClassification(classification,deployment);
  assert.equal('score' in result,false);
  assert.equal(result.aggregateAutonomyScore,null);
  assert.notEqual(result.classification.dimensions.operationalCapability.value,'');
  assert.notEqual(result.classification.dimensions.authorityScope.value,'');
  assert.notEqual(result.classification.dimensions.decisionAutonomy.value,'');
  assert.notEqual(result.classification.dimensions.consequenceMagnitude.value,'');
});

test('swarm extension contains exactly four independent system dimensions', () => {
  assert.equal(AACM_SWARM_DIMENSIONS.length,4);
  assert.deepEqual(AACM_SWARM_DIMENSIONS.map(x=>x.label),[
    'Role scope','Coordination topology','Shared-state model','Collective synthesis rule'
  ]);
});

test('component classifications do not infer a swarm classification', () => {
  const result = validateSwarmClassification({
    id:'SWARM-1',
    systemId:'SYS-1',
    componentDeploymentIds:['DEP-A','DEP-B'],
    componentClassificationIds:['AACM-A','AACM-B'],
    reviewerId:'ARCH-1',
    effectiveFrom:'2026-10-01T00:00:00Z',
    dimensions:{}
  });
  assert.equal(result.status,'INCOMPLETE');
  assert.equal(result.inferredFromComponents,false);
});

test('explicit swarm dimensions can be classified without an aggregate score or authorization', () => {
  const result = validateSwarmClassification({
    id:'SWARM-1',
    systemId:'SYS-1',
    componentDeploymentIds:['DEP-A','DEP-B'],
    componentClassificationIds:['AACM-A','AACM-B'],
    reviewerId:'ARCH-1',
    effectiveFrom:'2026-10-01T00:00:00Z',
    dimensions:evidenceDimensions(AACM_SWARM_DIMENSIONS)
  });
  assert.equal(result.status,'PASS');
  assert.equal(result.inferredFromComponents,false);
  assert.equal(result.createsAuthorization,false);
  assert.equal(result.aggregateAutonomyScore,null);
});

test('material tool-access change requires AACM reclassification but never performs it automatically', () => {
  const result = assessAACMReclassification({
    classification,
    change:{
      id:'CHG-TOOLS',
      subjectId:'DEP-ROUTE-1',
      changeType:'TOOL_ACCESS',
      effectiveTime:'2026-10-15T00:00:00Z',
      explicitlyAffectedBoundaryIds:['AACM-DEP-ROUTE-1']
    }
  });
  assert.equal(result.status,'RECLASSIFICATION_REQUIRED');
  assert.equal(result.reclassificationRequired,true);
  assert.equal(result.automaticReclassification,false);
});

test('non-agentic economic change need not force AACM reclassification when not otherwise material to classification', () => {
  const result = assessAACMReclassification({
    classification:{ ...classification, reassessmentTriggerRefs:[] },
    change:{
      id:'CHG-COST',
      subjectId:'DEP-ROUTE-1',
      changeType:'FINANCIAL_THRESHOLD',
      effectiveTime:'2026-10-15T00:00:00Z',
      explicitlyAffectedBoundaryIds:['ECON-1']
    }
  });
  assert.equal(result.status,'NO_RECLASSIFICATION_REQUIRED');
  assert.equal(result.reclassificationRequired,false);
});
