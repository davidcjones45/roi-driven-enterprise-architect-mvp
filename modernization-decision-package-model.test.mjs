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
  economicEvidenceRegister:[{id:'E',source:'synthetic fixture',ownerId:'O',revision:'1',recordedAt:'2026-09-22',status:'VERIFIED'}],
  p1EconomicContext:{baseline:{id:'BASE-APP-1',revision:'1',ownerId:'FINANCE',effectiveFrom:'2026-09-22',currency:'USD',period:'Annual',evidenceRefs:['E']},cases:[{id:'APP-1',baselineId:'BASE-APP-1',baselineRevision:'1',currency:'USD',period:'Annual'}],costItems:[],costAllocations:[],benefitItems:[],benefitAllocations:[]},
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

test('generated P2 package and printable report preserve decision integrity', () => {
  const contract = {id:'OUT', applicationId:'APP-1', alternativeId:'ALT-1', ownerId:'OPS',
    metricId:'elapsed', unit:'hours', target:2, operator:'LTE', observationStart:'2026-11-01',
    observationEnd:'2026-11-30', evidenceRef:'E'};
  const reading = {applicationId:'APP-1', alternativeId:'ALT-1', metricId:'elapsed',
    unit:'hours', value:1, observedAt:'2026-11-15'};
  const gate = {id:'G1', initiativeId:'APP-1', track:'STABILIZATION', state:'APPROVED',
    ownerId:'FIN', authorityId:'AUTH', effectiveAt:'2026-11-20', evidenceRef:'E'};
  const evidence = workspace.economicEvidenceRegister[0];
  function verify({rows=[reading], register=[evidence], decision=gate, outcome=contract,
    accepted=true, approved=true, observed=1, outcomeStatus=accepted?'ACCEPTED':'INCOMPLETE'} = {}) {
    const pkg = decisionPackage({...workspace, outcomeAcceptanceContracts:[outcome],
      outcomeObservations:rows, investmentGateDecisions:[decision], economicEvidenceRegister:register});
    const alt = pkg.applications[0].alternatives[0];
    assert.equal(alt.outcomeAcceptance[0].accepted, accepted);
    assert.equal(alt.outcomeAcceptance[0].observed, observed);
    assert.equal(alt.outcomeAcceptance[0].status, outcomeStatus);
    assert.equal(alt.investmentGates[0].approved, approved);
    const html = renderDecisionPackageHtml(pkg);
    assert.ok(html.includes('Outcome OUT: ' + outcomeStatus + ' (accepted: ' + accepted + ')'));
    assert.ok(html.includes('Investment STABILIZATION / G1: ' +
      (approved?'APPROVED':'INCOMPLETE') + ' (modeled approval: ' + approved + ')'));
  }
  verify();
  const slow = {...reading,value:5};
  verify({rows:[slow], accepted:false, observed:5, outcomeStatus:'TARGET_NOT_MET'});
  verify({rows:[reading, slow], accepted:false, observed:null});
  verify({rows:[slow, reading], accepted:false, observed:null});
  verify({rows:[reading, {...reading}]});
  verify({rows:[slow, {...reading, observedAt:'2026-11-30'}]});
  for (const observedAt of ['2026-11-20garbage','2026-02-30']) {
    verify({rows:[{...reading, observedAt}], accepted:false, observed:null});
  }
  verify({outcome:{...contract, observationEnd:'2026-11-31'}, accepted:false});
  verify({decision:{...gate, effectiveAt:'2026-11-31'}, approved:false});
  for (const register of [[{id:'E',status:'VERIFIED'}], [evidence,{...evidence,status:'DRAFT'}],
    [{...evidence,effectiveTo:'2026-11-14'}], [{...evidence,effectiveFrom:'2026-11-21'}]]) {
    verify({register, accepted:false, approved:false});
  }
  verify({register:[{...evidence,effectiveTo:'2026-11-15'}], approved:false});
  verify({register:[{...evidence,effectiveFrom:'2026-11-20'}], accepted:false});
});
