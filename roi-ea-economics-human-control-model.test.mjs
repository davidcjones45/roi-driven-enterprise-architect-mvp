import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DELEGATION_COST_CLASSES,
  calculateDelegationEconomics,
  normalizeSpecificationRecord,
  specificationReassessmentRequired,
  normalizeAssuranceActivity,
  evaluateHumanControlCapacity,
  aggregateHumanControlCapacity,
  validateBenefitState,
  validateBenefitTransition,
  validateFundingAllocation
} from './roi-ea-economics-human-control-model.mjs';

test('delegation economics exposes all nine lifecycle cost classes', () => {
  assert.deepEqual(DELEGATION_COST_CLASSES,[
    'IMPLEMENTATION','SPECIFICATION','OPERATING','VERIFICATION_ASSURANCE',
    'HUMAN_CONTROL','DEPENDENCY','RECOVERY_FALLBACK','TRANSITION','EXIT'
  ]);
});

test('net delegation value subtracts explicit lifecycle costs without collapsing governance dimensions', () => {
  const result=calculateDelegationEconomics({
    caseId:'CASE-A',
    benefits:[{id:'B1',caseId:'CASE-A',amount:1000}],
    costs:[
      {id:'C1',caseId:'CASE-A',costClass:'IMPLEMENTATION',amount:100},
      {id:'C2',caseId:'CASE-A',costClass:'SPECIFICATION',amount:50},
      {id:'C3',caseId:'CASE-A',costClass:'HUMAN_CONTROL',amount:150}
    ],
    adverseExposure:5000,
    necessity:'MANDATORY',
    strategicValue:'HIGH',
    authorizationState:'UNRESOLVED',
    impactState:'REVIEW_REQUIRED'
  });
  assert.equal(result.expectedBusinessValue,1000);
  assert.equal(result.totalDelegationCost,300);
  assert.equal(result.netDelegationValue,700);
  assert.equal(result.adverseExposureAutomaticallyAccepted,false);
  assert.equal(result.authorizationIncludedInScore,false);
  assert.equal(result.universalAIScore,null);
});

test('specification is a versioned operating dependency with explicit quality state', () => {
  const spec=normalizeSpecificationRecord({
    id:'SPEC-1',deploymentId:'DEP-1',ownerId:'OWNER-1',version:'2.1',
    effectiveFrom:'2026-10-01T00:00:00Z',qualityState:'ACCEPTED',maintenanceCost:200
  });
  assert.equal(spec.errors.length,0);
  assert.equal(spec.qualityState,'ACCEPTED');
  assert.equal(spec.maintenanceCost,200);
});

test('material operating change reopens specification review without auto-accepting it', () => {
  const result=specificationReassessmentRequired({
    specification:{
      id:'SPEC-1',deploymentId:'DEP-1',ownerId:'OWNER-1',version:'2.1',
      effectiveFrom:'2026-10-01T00:00:00Z',qualityState:'ACCEPTED'
    },
    changedFact:{id:'CHG-1',subjectId:'DEP-1',changeType:'TOOL_ACCESS'}
  });
  assert.equal(result.reassessmentRequired,true);
  assert.equal(result.automaticAcceptance,false);
  assert.equal(result.qualityStateAfterChange,'REVIEW_REQUIRED');
});

test('assurance activity carries an explicit lifecycle cost', () => {
  const activity=normalizeAssuranceActivity({
    id:'ASSUR-1',subjectId:'DEP-1',ownerId:'QA-1',activityType:'Regression evaluation',
    cost:450,recurring:true,frequency:'monthly'
  });
  assert.equal(activity.errors.length,0);
  assert.equal(activity.cost,450);
});

const pool={
  id:'POOL-1',ownerId:'OPS-1',period:'week',availableMinutes:600,
  competenceTags:['routing-review'],authorityRefs:['AUTH-REVIEW'],
  independenceConfirmed:true,evidenceIds:['EVD-POOL']
};

const requirement={
  id:'HC-1',deploymentId:'DEP-1',reviewerPoolId:'POOL-1',
  caseVolume:20,minutesPerCase:20,escalationMinutes:60,exceptionMinutes:40,
  requiredCompetenceTags:['routing-review'],requiredAuthorityRefs:['AUTH-REVIEW'],
  informationAvailable:true,usableInterface:true,interventionMechanism:true,
  escalationStopPath:true,operatingEvidenceIds:['EVD-HC-1'],independenceRequired:true
};

test('meaningful human control passes when capacity and all operational conditions are satisfied', () => {
  const result=evaluateHumanControlCapacity({requirement,reviewerPool:pool});
  assert.equal(result.demandMinutes,500);
  assert.equal(result.capacityMarginMinutes,100);
  assert.equal(result.meaningfulHumanControl,true);
  assert.equal(result.status,'PASS');
});

test('human presence alone is insufficient when reviewer pool is overcommitted', () => {
  const overloaded={...requirement,caseVolume:40};
  const result=evaluateHumanControlCapacity({requirement:overloaded,reviewerPool:pool});
  assert.equal(result.capacityMarginMinutes < 0,true);
  assert.equal(result.conditions.attentionCapacity,false);
  assert.equal(result.meaningfulHumanControl,false);
  assert.equal(result.humanPresenceAloneSufficient,false);
});

test('human control fails when authority or competence prerequisites are missing even with spare time', () => {
  const weakPool={...pool,availableMinutes:5000,competenceTags:[],authorityRefs:[]};
  const result=evaluateHumanControlCapacity({requirement,reviewerPool:weakPool});
  assert.equal(result.conditions.competence,false);
  assert.equal(result.conditions.authority,false);
  assert.equal(result.status,'FAIL');
});

test('portfolio aggregation detects shared reviewer-pool overcommitment', () => {
  const req2={...requirement,id:'HC-2',deploymentId:'DEP-2',caseVolume:10};
  const aggregate=aggregateHumanControlCapacity({requirements:[requirement,req2],reviewerPools:[pool]});
  assert.equal(aggregate.byPool[0].demandMinutes,800);
  assert.equal(aggregate.byPool[0].overcommitted,true);
  assert.equal(aggregate.anyOvercommitted,true);
});

test('projected benefit cannot be treated as available funding', () => {
  const result=validateBenefitState({
    id:'BEN-1',category:'CASHABLE',state:'PROJECTED',amount:10000,availableAmount:0
  });
  assert.equal(result.status,'PASS');

  const allocation=validateFundingAllocation({
    allocation:{id:'FA-1',sourceBenefitId:'BEN-1',targetInitiativeId:'INIT-2',authorityId:'AUTH-1',amount:1000},
    benefit:{id:'BEN-1',category:'CASHABLE',state:'PROJECTED',amount:10000,availableAmount:0}
  });
  assert.equal(allocation.valid,false);
  assert.equal(allocation.createsFundingFromProjection,false);
});

test('cashable benefit requires finance validation before AVAILABLE', () => {
  const noValidation=validateBenefitState({
    id:'BEN-1',category:'CASHABLE',state:'AVAILABLE',amount:10000,
    availableAmount:5000,evidenceIds:['EVD-1']
  });
  assert.equal(noValidation.valid,false);

  const valid=validateBenefitState({
    id:'BEN-1',category:'CASHABLE',state:'AVAILABLE',amount:10000,
    availableAmount:5000,evidenceIds:['EVD-1'],financeValidationId:'FIN-1'
  });
  assert.equal(valid.valid,true);
});

test('capacity benefit requires operating-owner validation before AVAILABLE', () => {
  const result=validateBenefitState({
    id:'BEN-CAP',category:'CAPACITY',state:'AVAILABLE',amount:100,
    unit:'hours',availableAmount:60,evidenceIds:['EVD-CAP'],operatingValidationId:'OPS-VALID-1'
  });
  assert.equal(result.valid,true);
});

test('protective and strategic benefits may be validated but cannot become available funding', () => {
  const protective=validateBenefitState({
    id:'BEN-P',category:'PROTECTIVE',state:'VALIDATED',amount:1000,evidenceIds:['EVD-P']
  });
  assert.equal(protective.valid,true);

  const strategic=validateBenefitState({
    id:'BEN-S',category:'STRATEGIC',state:'AVAILABLE',amount:1000,
    availableAmount:1000,evidenceIds:['EVD-S']
  });
  assert.equal(strategic.valid,false);
});

test('benefit maturity cannot skip directly from PROJECTED to AVAILABLE', () => {
  const result=validateBenefitTransition(
    {id:'BEN-1',category:'CASHABLE',state:'PROJECTED',amount:10000},
    {id:'BEN-1',category:'CASHABLE',state:'AVAILABLE',amount:10000,
      availableAmount:5000,evidenceIds:['EVD-1'],financeValidationId:'FIN-1'}
  );
  assert.equal(result.valid,false);
  assert.equal(result.issues.some(x=>x.includes('cannot skip')),true);
});

test('funding allocation cannot exceed remaining available benefit', () => {
  const benefit={
    id:'BEN-1',category:'CASHABLE',state:'AVAILABLE',amount:10000,
    availableAmount:5000,evidenceIds:['EVD-1'],financeValidationId:'FIN-1'
  };
  const result=validateFundingAllocation({
    allocation:{id:'FA-2',sourceBenefitId:'BEN-1',targetInitiativeId:'INIT-3',authorityId:'AUTH-1',amount:2500},
    benefit,
    priorAllocations:[{sourceBenefitId:'BEN-1',amount:3000}]
  });
  assert.equal(result.valid,false);
  assert.equal(result.remainingAvailable,2000);
});

test('available cashable benefit can be allocated within remaining amount under explicit authority', () => {
  const benefit={
    id:'BEN-1',category:'CASHABLE',state:'AVAILABLE',amount:10000,
    availableAmount:5000,evidenceIds:['EVD-1'],financeValidationId:'FIN-1'
  };
  const result=validateFundingAllocation({
    allocation:{id:'FA-1',sourceBenefitId:'BEN-1',targetInitiativeId:'INIT-2',authorityId:'AUTH-1',amount:2000},
    benefit
  });
  assert.equal(result.valid,true);
});
