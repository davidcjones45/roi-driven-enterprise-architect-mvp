import assert from 'node:assert/strict';
import test from 'node:test';

import { validateSemanticEntailment } from './roi-ea-canonical-model.mjs';
import { deriveThreeAxisState, evaluateResumption } from './roi-ea-lifecycle-state-model.mjs';
import { AACM_DIMENSIONS, validateAACMClassification } from './roi-ea-agentic-deployment-aacm.mjs';
import { validateDelegatedActionContext } from './roi-ea-authority-identity-model.mjs';
import {
  calculateDelegationEconomics,
  evaluateHumanControlCapacity,
  validateBenefitState
} from './roi-ea-economics-human-control-model.mjs';
import {
  validateImpactAssessment,
  evaluateControl,
  evaluateTrustReliance,
  validateWorkforceOperatingPattern
} from './roi-ea-impact-controls-trust-workforce-model.mjs';
import { buildExecutivePortfolioSnapshot } from './roi-ea-portfolio-executive-analytics-model.mjs';
import {
  buildSecondEditionCycleProjection,
  buildExecutivePackageGate
} from './roi-ea-cross-screen-operating-cycle-model.mjs';
import {
  buildOperatingCycleShellModel,
  normalizeBpmnCycleSnapshot
} from './roi-ea-operating-cycle-ui.mjs';

const dimensions=Object.fromEntries(
  AACM_DIMENSIONS.map(def=>[
    def.key,
    {value:`validated-${def.key}`,status:'RESOLVED',evidenceIds:[`EVD-${def.id}`]}
  ])
);

test('A10 North Star Second Edition path traverses A1-A9 without semantic collapse',()=>{
  // A1 — non-entailment
  assert.equal(validateSemanticEntailment({
    sourceConcept:'CLASSIFICATION',
    proposedConcept:'AUTHORIZATION'
  }).valid,false);

  // A2 — independent lifecycle axes and recovery/resumption
  const lifecycle=deriveThreeAxisState([
    {id:'L1',subjectId:'DEP-NS',axis:'investment',state:'COMMITTED',effectiveTime:'2026-09-01T00:00:00Z'},
    {id:'L2',subjectId:'DEP-NS',axis:'execution',state:'OPERATIONAL',effectiveTime:'2026-09-01T00:00:00Z'},
    {id:'L3',subjectId:'DEP-NS',axis:'authority',state:'SUSPENDED',effectiveTime:'2026-09-15T00:00:00Z'}
  ],'DEP-NS','2026-09-18T00:00:00Z');
  assert.equal(lifecycle.investment.state,'COMMITTED');
  assert.equal(lifecycle.execution.state,'OPERATIONAL');
  assert.equal(lifecycle.authority.state,'SUSPENDED');
  assert.equal(evaluateResumption({technicalRecoveryEstablished:true,authorityState:'SUSPENDED'}).authorizedResumption,false);

  // A3 — deployment-specific AACM, no authorization
  const deployment={
    id:'DEP-NS',
    aiCapabilityId:'CAP-NS',
    modelOrServiceRef:'MODEL-NS',
    version:'1.0',
    configurationRef:'CFG-NS',
    purpose:'Rank already eligible options for accountable human review',
    operatingEnvironment:'Controlled production pilot',
    availableCapabilities:[
      {id:'CAP-READ',available:true,evidenceIds:['E1']},
      {id:'CAP-RANK',available:true,evidenceIds:['E2']}
    ],
    effectiveFrom:'2026-09-01T00:00:00Z'
  };
  const classification=validateAACMClassification({
    id:'AACM-NS',
    deploymentId:'DEP-NS',
    dimensions,
    highestEffectiveCapabilityId:'CAP-RANK',
    highestEffectiveCapabilityBasis:'Ranking is the highest consequential capability actually available.',
    reviewerId:'ARCH-1',
    effectiveFrom:'2026-09-01T00:00:00Z'
  },deployment);
  assert.equal(classification.status,'PASS');
  assert.equal(classification.createsAuthorization,false);

  // A4 — delegated machine action chain
  const authority={
    id:'AE-NS',
    effectiveDate:'2026-09-01',
    reviewDate:'2026-12-31',
    status:'Active',
    actions:[{id:'ACT-RANK',label:'Rank eligible options'}],
    resources:[{id:'RES-CASE',label:'Approved case'}],
    relationships:[],
    evidenceRequirements:[],
    decisionHistory:[]
  };
  const delegated=validateDelegatedActionContext({
    context:{
      id:'CTX-NS',principalId:'PRINCIPAL-OPS',actorId:'AGT-NS',
      machineIdentityId:'MID-NS',delegationId:'DLG-NS',authorityId:'AE-NS',
      permissionId:'PER-NS',technicalPermissionId:'TP-NS',
      actionId:'ACT-RANK',resourceIds:['RES-CASE'],asOfTime:'2026-09-18T00:00:00Z'
    },
    principal:{id:'PRINCIPAL-OPS',type:'ORGANIZATION'},
    machineIdentity:{
      id:'MID-NS',type:'WORKLOAD',actorId:'AGT-NS',ownerId:'ID-OWNER',
      effectiveFrom:'2026-09-01T00:00:00Z'
    },
    delegation:{
      id:'DLG-NS',delegatorId:'PRINCIPAL-OPS',delegateId:'AGT-NS',
      sourceAuthorityId:'AE-NS',permittedActions:['ACT-RANK'],
      effectiveFrom:'2026-09-01T00:00:00Z'
    },
    authorityEnvelope:authority,
    permission:{
      id:'PER-NS',grantorSubjectId:'PRINCIPAL-OPS',holderParticipantId:'AGT-NS',
      purpose:'Review support',permittedDataActions:['ACT-RANK'],
      effectiveFrom:'2026-09-01T00:00:00Z'
    },
    technicalPermission:{
      id:'TP-NS',machineIdentityId:'MID-NS',actionIds:['ACT-RANK'],
      resourceIds:['RES-CASE'],effectiveFrom:'2026-09-01T00:00:00Z'
    }
  });
  assert.equal(delegated.status,'PASS');
  assert.equal(delegated.technicalPermissionCreatesAuthority,false);

  // A5 — economics, meaningful human control, validated available benefit
  const economics=calculateDelegationEconomics({
    caseId:'CASE-NS',
    benefits:[{id:'B1',amount:120000}],
    costs:[
      {id:'C1',costClass:'IMPLEMENTATION',amount:20000},
      {id:'C2',costClass:'SPECIFICATION',amount:5000},
      {id:'C3',costClass:'HUMAN_CONTROL',amount:15000}
    ],
    authorizationState:'ACTIVE'
  });
  assert.equal(economics.netDelegationValue,80000);
  assert.equal(economics.authorizationIncludedInScore,false);

  const humanControl=evaluateHumanControlCapacity({
    requirement:{
      id:'HC-NS',deploymentId:'DEP-NS',reviewerPoolId:'POOL-NS',
      caseVolume:20,minutesPerCase:10,escalationMinutes:30,exceptionMinutes:20,
      requiredCompetenceTags:['routing'],requiredAuthorityRefs:['AUTH-REVIEW'],
      informationAvailable:true,usableInterface:true,interventionMechanism:true,
      escalationStopPath:true,operatingEvidenceIds:['EVD-HC'],independenceRequired:true
    },
    reviewerPool:{
      id:'POOL-NS',ownerId:'OPS',availableMinutes:600,
      competenceTags:['routing'],authorityRefs:['AUTH-REVIEW'],independenceConfirmed:true
    }
  });
  assert.equal(humanControl.meaningfulHumanControl,true);

  assert.equal(validateBenefitState({
    id:'BEN-NS',category:'CASHABLE',state:'AVAILABLE',amount:50000,
    availableAmount:25000,evidenceIds:['EVD-BEN'],financeValidationId:'FIN-1'
  }).valid,true);

  // A6 — impact/control/trust/workforce remain distinct
  assert.equal(validateImpactAssessment({
    id:'IA-NS',subjectId:'DEP-NS',ownerId:'HR',
    state:'COMPLETE',affectedGroupIds:['ROLE-OPS'],
    effectiveFrom:'2026-09-01T00:00:00Z',
    findings:[{
      id:'IF-NS',impactType:'WORKFORCE',affectedGroupId:'ROLE-OPS',
      direction:'MIXED',description:'Reduces repetitive work and increases exception review.',
      evidenceIds:['EVD-IMPACT']
    }]
  }).createsAuthorization,false);

  assert.equal(evaluateControl({
    control:{
      id:'CTL-NS',purpose:'Qualified human review',ownerId:'OPS',
      state:'OPERATING',implementationEvidenceIds:['EVD-I'],operatingEvidenceIds:['EVD-O']
    },
    effectivenessAssessment:{
      id:'CEA-NS',controlId:'CTL-NS',reviewerId:'QA',
      result:'EFFECTIVE_FOR_SCOPE',evidenceIds:['EVD-TEST'],
      assessedAt:'2026-09-18T00:00:00Z'
    }
  }).effectivenessCreatesAuthorization,false);

  assert.equal(evaluateTrustReliance({
    trustState:{
      id:'TS-NS',subjectId:'PROVIDER-NS',purpose:'Routing inference',
      state:'TRUSTED_FOR_SCOPE',effectiveFrom:'2026-09-01T00:00:00Z'
    },
    reliance:{
      id:'REL-NS',relyingObjectId:'DEP-NS',subjectId:'PROVIDER-NS',
      purpose:'Routing inference',criticality:'HIGH'
    }
  }).trustCreatesReliance,false);

  assert.equal(validateWorkforceOperatingPattern({
    id:'WOP-NS',subjectId:'DEP-NS',pattern:'DECISION_SUPPORT',
    ownerId:'OPS',affectedRoleIds:['ROLE-OPS']
  }).createsWorkforceDecision,false);

  // A7 — portfolio analytics produce signals, not decisions
  const portfolio=buildExecutivePortfolioSnapshot({
    subjects:[
      {id:'DEP-NS',dependencyIds:['PROVIDER-NS'],authorityIds:['AE-NS'],exposure:100},
      {id:'DEP-OTHER',dependencyIds:['PROVIDER-NS'],authorityIds:['AE-OTHER'],exposure:100}
    ],
    reviewerPools:[{id:'POOL-NS',availableMinutes:600,ownerId:'OPS'}],
    controlDemands:[
      {id:'D1',deploymentId:'DEP-NS',reviewerPoolId:'POOL-NS',demandMinutes:250}
    ],
    benefits:[{id:'BEN-NS',ownerId:'UNIT-1',amount:25000,sourceDeploymentIds:['DEP-NS']}],
    commitments:[{id:'COM-NS',ownerId:'EXEC-1',amount:10000,deploymentIds:['DEP-NS']}],
    thresholds:{concentrationShare:0.5,humanControlUtilization:0.85}
  });
  assert.equal(portfolio.executiveDecision,null);
  assert.equal(portfolio.universalPortfolioScore,null);

  // A8 — five-screen cycle can be decision-review ready without deciding
  const cycle=buildSecondEditionCycleProjection({
    decision:{id:'DEC-NS',resolutionState:'RESOLVED'},
    economics:{caseId:'CASE-NS',resolutionState:'RESOLVED'},
    evidence:{id:'EVD-NS',resolutionState:'RESOLVED'},
    authority:{id:'AE-NS',resolutionState:'RESOLVED'},
    architecture:{id:'ARCH-NS',resolutionState:'RESOLVED'},
    aacm:{id:'AACM-NS',resolutionState:'RESOLVED'},
    humanControl:{id:'HC-NS',resolutionState:'RESOLVED'},
    impact:{id:'IA-NS',resolutionState:'RESOLVED'},
    portfolio:{id:'PORT-NS',resolutionState:'RESOLVED'},
    executivePackage:{id:'PKG-NS',resolutionState:'RESOLVED'}
  });
  assert.equal(cycle.status,'READY_FOR_DECISION_REVIEW');
  assert.equal(buildExecutivePackageGate(cycle).decision,null);

  // A9 — UI and BPMN remain projection/read-only only
  const shell=buildOperatingCycleShellModel({currentView:'mortgage-demo'});
  assert.equal(shell.currentScreenKey,'PROCESS_AI_ANALYSIS');
  assert.equal(shell.authorizationInferred,false);

  const bpmn=normalizeBpmnCycleSnapshot({
    staged:true,reviewStatus:'REVIEWED_COMPLETE',candidateCount:3
  });
  assert.equal(bpmn.readOnlyVisualization,true);
  assert.equal(bpmn.executesWorkflow,false);
  assert.equal(bpmn.createsAuthority,false);
});
