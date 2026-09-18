import assert from 'node:assert/strict';
import test from 'node:test';
import {
  analyzeDependencyConcentration,
  analyzeAuthorityConcentration,
  analyzeHumanControlBottlenecks,
  analyzeBenefitConcentration,
  analyzeCommitmentConcentration,
  derivePortfolioSignals,
  buildExecutivePortfolioSnapshot,
  makeExecutiveSignal
} from './roi-ea-portfolio-executive-analytics-model.mjs';

const subjects=[
  {id:'DEP-1',dependencyIds:['VENDOR-X'],authorityIds:['AUTH-A'],exposure:100},
  {id:'DEP-2',dependencyIds:['VENDOR-X'],authorityIds:['AUTH-A'],exposure:200},
  {id:'DEP-3',dependencyIds:['VENDOR-Y'],authorityIds:['AUTH-B'],exposure:700}
];

test('dependency concentration is descriptive and does not accept risk', () => {
  const result=analyzeDependencyConcentration({subjects});
  assert.equal(result.highest.id,'VENDOR-X');
  assert.equal(result.highest.subjectCount,2);
  assert.equal(result.highest.share,2/3);
  assert.equal(result.createsRiskAcceptance,false);
  assert.equal(result.createsMaterialityConclusion,false);
  assert.equal(result.createsAuthorization,false);
});

test('exposure-weighted concentration uses stated exposure instead of subject count', () => {
  const result=analyzeDependencyConcentration({subjects,exposureWeighted:true});
  assert.equal(result.highest.id,'VENDOR-Y');
  assert.equal(result.highest.share,0.7);
});

test('authority concentration remains separate from authorization', () => {
  const result=analyzeAuthorityConcentration({subjects});
  assert.equal(result.highest.id,'AUTH-A');
  assert.equal(result.highest.share,2/3);
  assert.equal(result.createsAuthorization,false);
});

test('human-control analysis detects shared reviewer-pool overcommitment across deployments', () => {
  const result=analyzeHumanControlBottlenecks({
    reviewerPools:[
      {id:'POOL-1',availableMinutes:600,ownerId:'OPS'}
    ],
    demands:[
      {id:'D1',deploymentId:'DEP-1',reviewerPoolId:'POOL-1',demandMinutes:350},
      {id:'D2',deploymentId:'DEP-2',reviewerPoolId:'POOL-1',demandMinutes:400,critical:true}
    ]
  });
  assert.equal(result.bottlenecks.length,1);
  assert.equal(result.byPool[0].demandMinutes,750);
  assert.equal(result.byPool[0].marginMinutes,-150);
  assert.equal(result.portfolioControlCapacityEstablished,false);
  assert.equal(result.reviewerPresenceAloneSufficient,false);
});

test('human-control analysis reports unknown reviewer pool references', () => {
  const result=analyzeHumanControlBottlenecks({
    reviewerPools:[],
    demands:[{id:'D1',deploymentId:'DEP-1',reviewerPoolId:'MISSING',demandMinutes:10}]
  });
  assert.equal(result.status,'INCOMPLETE');
  assert.equal(result.issues.some(x=>x.includes('unknown reviewer pool')),true);
});

test('benefit concentration is visible without creating a funding decision', () => {
  const result=analyzeBenefitConcentration({
    benefits:[
      {id:'B1',ownerId:'UNIT-A',amount:80,sourceDeploymentIds:['DEP-1']},
      {id:'B2',ownerId:'UNIT-A',amount:20,sourceDeploymentIds:['DEP-2']},
      {id:'B3',ownerId:'UNIT-B',amount:100,sourceDeploymentIds:['DEP-3']}
    ]
  });
  assert.equal(result.highest.share,0.5);
  assert.equal(result.createsFundingDecision,false);
  assert.equal(result.createsPortfolioPriority,false);
});

test('commitment concentration does not create authorization or an investment decision', () => {
  const result=analyzeCommitmentConcentration({
    commitments:[
      {id:'C1',ownerId:'EXEC-A',authorityId:'AUTH-A',amount:300,deploymentIds:['DEP-1']},
      {id:'C2',ownerId:'EXEC-A',authorityId:'AUTH-A',amount:200,deploymentIds:['DEP-2']},
      {id:'C3',ownerId:'EXEC-B',authorityId:'AUTH-B',amount:500,deploymentIds:['DEP-3']}
    ]
  });
  assert.equal(result.highest.share,0.5);
  assert.equal(result.createsAuthorization,false);
  assert.equal(result.createsInvestmentDecision,false);
});

test('executive signal is a review cue and contains no recommendation or decision', () => {
  const signal=makeExecutiveSignal({
    id:'SIG-1',
    signalType:'PORTFOLIO_REVIEW',
    severity:'ATTENTION',
    subjectIds:['DEP-1'],
    observation:'Portfolio review required.'
  });
  assert.equal(signal.status,'OPEN');
  assert.equal(signal.recommendation,null);
  assert.equal(signal.decision,null);
  assert.equal(signal.authorization,null);
  assert.equal(signal.universalPortfolioScore,null);
});

test('portfolio signals surface concentration and bottlenecks without selecting an action', () => {
  const dependency=analyzeDependencyConcentration({subjects});
  const authority=analyzeAuthorityConcentration({subjects});
  const humanControl=analyzeHumanControlBottlenecks({
    reviewerPools:[{id:'POOL-1',availableMinutes:600,ownerId:'OPS'}],
    demands:[
      {id:'D1',deploymentId:'DEP-1',reviewerPoolId:'POOL-1',demandMinutes:350},
      {id:'D2',deploymentId:'DEP-2',reviewerPoolId:'POOL-1',demandMinutes:400}
    ]
  });
  const signals=derivePortfolioSignals({
    dependencyConcentration:dependency,
    authorityConcentration:authority,
    humanControl,
    thresholds:{concentrationShare:0.6,humanControlUtilization:0.85}
  });
  assert.equal(signals.signalCount,3);
  assert.equal(signals.recommendedPortfolioAction,null);
  assert.equal(signals.selectedPriority,null);
  assert.equal(signals.createsAuthorization,false);
  assert.equal(signals.universalPortfolioScore,null);
});

test('executive snapshot preserves analytical dimensions instead of collapsing them to one score', () => {
  const snapshot=buildExecutivePortfolioSnapshot({
    subjects,
    reviewerPools:[{id:'POOL-1',availableMinutes:600,ownerId:'OPS'}],
    controlDemands:[
      {id:'D1',deploymentId:'DEP-1',reviewerPoolId:'POOL-1',demandMinutes:350},
      {id:'D2',deploymentId:'DEP-2',reviewerPoolId:'POOL-1',demandMinutes:400}
    ],
    benefits:[
      {id:'B1',ownerId:'UNIT-A',amount:100,sourceDeploymentIds:['DEP-1']},
      {id:'B2',ownerId:'UNIT-B',amount:100,sourceDeploymentIds:['DEP-2']}
    ],
    commitments:[
      {id:'C1',ownerId:'EXEC-A',amount:100,deploymentIds:['DEP-1']},
      {id:'C2',ownerId:'EXEC-B',amount:100,deploymentIds:['DEP-2']}
    ],
    thresholds:{concentrationShare:0.6,humanControlUtilization:0.85}
  });
  assert.equal(snapshot.status,'PASS');
  assert.equal(snapshot.executiveDecision,null);
  assert.equal(snapshot.universalPortfolioScore,null);
  assert.equal(snapshot.dependency.highest.id,'VENDOR-X');
  assert.equal(snapshot.humanControl.bottlenecks.length,1);
});
