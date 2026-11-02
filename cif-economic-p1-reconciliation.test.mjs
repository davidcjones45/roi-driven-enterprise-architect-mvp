import test from 'node:test';
import assert from 'node:assert/strict';
import {economicsCompleteness} from './modernization-economics-model.mjs';
import {validateCommonBaseline,reconcileAttributions,validateCashBenefitRecognition,assessP1Economics} from './cif-economic-p1-reconciliation.mjs';
const base={id:'BASE-1',revision:'r1',ownerId:'FIN-1',effectiveFrom:'2026-11-01',currency:'USD',period:'Annual',evidenceRefs:['E1']};
const cases=[{id:'S',baselineId:'BASE-1',baselineRevision:'r1',currency:'USD',period:'Annual'}];
const costs=[{id:'HOSTING',amount:1000,currency:'USD',period:'Annual'}];
const alloc=[{itemId:'HOSTING',initiativeId:'S',track:'STABILIZATION',share:.6,method:'usage',evidenceRef:'E2'},{itemId:'HOSTING',initiativeId:'R',track:'CORE_REMEDIATION',share:.4,method:'usage',evidenceRef:'E2'}];
const benefit={id:'SAVE-1',amount:300,currency:'USD',period:'Annual',category:'CASHABLE',baselineRef:'BASE-1',financeValidationId:'FIN-2',evidenceRef:'E3',realizationState:'REALIZED'};
const balloc=[{itemId:'SAVE-1',initiativeId:'S',track:'STABILIZATION',share:1,method:'direct',evidenceRef:'E3'}];

test('T18 shared expenditure allocated once with auditable shares',()=>{
  const good=reconcileAttributions(costs,alloc);
  assert.equal(good.valid,true);
  assert.equal(good.attributed.reduce((n,x)=>n+x.attributedAmount,0),1000);
  assert.equal(reconcileAttributions(costs,[...alloc,{...alloc[0],initiativeId:'X',share:.6}]).valid,false);
  assert.equal(reconcileAttributions(costs,[alloc[0],alloc[0]]).valid,false);
});
test('T19 overlapping benefits cannot be recognized twice',()=>{
  assert.equal(reconcileAttributions([benefit],balloc).valid,true);
  assert.equal(reconcileAttributions([benefit],[...balloc,{...balloc[0],initiativeId:'R',track:'CORE_REMEDIATION'}]).valid,false);
  assert.equal(validateCashBenefitRecognition([benefit,benefit]).valid,false);
});
test('T20 capacity not converted to cash; realized cash needs finance evidence',()=>{
  const capacity={...benefit,id:'CAP-1',category:'CAPACITY',amount:100};
  assert.equal(validateCashBenefitRecognition([capacity]).recognizedCashAmount,0);
  assert.equal(validateCashBenefitRecognition([{...benefit,financeValidationId:''}]).valid,false);
  assert.equal(validateCashBenefitRecognition([benefit]).recognizedCashAmount,300);
});
test('T21 inconsistent revisions and periods block readiness',()=>{
  assert.equal(validateCommonBaseline(base,cases).valid,true);
  assert.equal(validateCommonBaseline(base,[{...cases[0],baselineRevision:'r2'}]).valid,false);
  assert.equal(validateCommonBaseline(base,[{...cases[0],period:'Monthly'}]).valid,false);
  const r=assessP1Economics({baseline:base,cases,costItems:costs,costAllocations:alloc,benefitItems:[benefit],benefitAllocations:balloc});
  assert.equal(r.decisionReady,true);
  assert.equal(assessP1Economics({baseline:base,cases:[{...cases[0],baselineId:'OTHER'}],costItems:costs,costAllocations:alloc,benefitItems:[benefit],benefitAllocations:balloc}).decisionReady,false);
});

test('T21 existing comparison readiness is gated when P1 context is provided',()=>{
 const lines=[{applicationId:'A',lineType:'CURRENT_RUN_COST',amount:1000,confidence:.8,source:'S'},{applicationId:'A',alternativeId:'X',lineType:'TRANSITION_COST',amount:500,confidence:.8,source:'S'},{applicationId:'A',alternativeId:'X',lineType:'TARGET_RUN_COST',amount:700,confidence:.8,source:'S'}];
 assert.equal(economicsCompleteness('A','X',lines).decisionReadyForEconomicComparison,true);
 const p1={baseline:base,cases,costItems:costs,costAllocations:alloc,benefitItems:[benefit],benefitAllocations:balloc};
 assert.equal(economicsCompleteness('A','X',lines,p1).decisionReadyForEconomicComparison,true);
 assert.equal(economicsCompleteness('A','X',lines,{...p1,cases:[{...cases[0],baselineRevision:'r2'}]}).decisionReadyForEconomicComparison,false);
});
