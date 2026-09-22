import test from 'node:test';
import assert from 'node:assert/strict';
import { decisionPackage, renderDecisionPackageHtml } from './modernization-decision-package-model.mjs';

const workspace={
  applications:[{id:'APP-1',name:'Claims',businessCriticality:'High',strategicImportance:'High'}],
  assessments:[{
    applicationId:'APP-1',assessmentDate:'2026-09-22',overallConfidence:.8,evidenceCompleteness:.8,
    candidateAlternativeIds:['ALT-1'],leastRegretNextMove:'Validate dependencies.',reviewStatus:'Draft',
    businessSignificance:{value:'High',confidence:.8,evidenceRefs:['E']},
    functionalAdequacy:{value:'High',confidence:.8,evidenceRefs:['E']},
    technicalHealth:{value:'Low',confidence:.8,evidenceRefs:['E']},
    dataSuitability:{value:'Medium',confidence:.8,evidenceRefs:['E']},
    integrationComplexity:{value:'Medium',confidence:.8,evidenceRefs:['E']},
    securityReadiness:{value:'Medium',confidence:.8,evidenceRefs:['E']},
    operationalReadiness:{value:'Medium',confidence:.8,evidenceRefs:['E']},
    organizationalReadiness:{value:'Medium',confidence:.8,evidenceRefs:['E']},
    economicAttractiveness:{value:'Medium',confidence:.8,evidenceRefs:['E']},
    transformationComplexity:{value:'Medium',confidence:.8,evidenceRefs:['E']},
    strategicLifecycle:{value:'Long-life',confidence:.8,evidenceRefs:['E']}
  }],
  alternatives:[{id:'ALT-1',applicationId:'APP-1',name:'Replatform',provider:'Provider neutral',strategyClass:'replatform',confidence:.7,evidenceCompleteness:.6}],
  providerAssessments:[{id:'P1',provider:'AWS',applicationId:'APP-1',strategy:'Replatform',status:'Advisory evidence only',confidence:.7}],
  constraints:[],
  dependencies:[],
  economicLines:[
    {applicationId:'APP-1',lineType:'CURRENT_RUN_COST',amount:1000,confidence:.8,source:'S'},
    {applicationId:'APP-1',alternativeId:'ALT-1',lineType:'TRANSITION_COST',amount:500,confidence:.8,source:'S'},
    {applicationId:'APP-1',alternativeId:'ALT-1',lineType:'TARGET_RUN_COST',amount:700,confidence:.8,source:'S'}
  ],
  economicSettings:{horizonYears:5,discountRate:0},
  deliveryCapacities:[],
  deliveryDemands:[]
};

test('decision package preserves provider evidence and authority boundary',()=>{
  const pkg=decisionPackage(workspace,{preparedAt:'2026-09-22'});
  assert.deepEqual(pkg.providerSummary.providers,['AWS']);
  assert.match(pkg.executiveSummary.authorityBoundary,/does not authorize/i);
  assert.equal(pkg.applications[0].providerEvidence[0].status,'Advisory evidence only');
});

test('decision package includes economics only when traceable',()=>{
  const pkg=decisionPackage(workspace);
  const econ=pkg.applications[0].alternatives[0].economics;
  assert.equal(econ.comparisonReady,true);
  assert.equal(econ.transitionCost,500);
  assert.equal(econ.targetAnnualCost,700);
});

test('decision package contains least-regret next move and service blueprint',()=>{
  const pkg=decisionPackage(workspace);
  assert.equal(pkg.applications[0].assessment.leastRegretNextMove,'Validate dependencies.');
  assert.equal(pkg.serviceDeliveryBlueprint.length,6);
});

test('rendered HTML does not claim authorization or automatic provider selection',()=>{
  const html=renderDecisionPackageHtml(decisionPackage(workspace));
  assert.match(html,/Decision-support package only/);
  assert.match(html,/Provider recommendations are advisory evidence/);
  assert.doesNotMatch(html,/recommended provider:/i);
});
