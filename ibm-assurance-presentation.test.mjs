import test from 'node:test';
import assert from 'node:assert/strict';
import {advisoryEconomicSnapshot,advisoryEconomicHtml} from './ibm-assurance-presentation.mjs';
test('missing scenario is labeled not assessed',()=>{
 const r=advisoryEconomicSnapshot({},'app','alt');
 assert.equal(r.status,'NOT_ASSESSED');assert.equal(r.netBenefit,null);assert.equal(r.canonicalComparisonReady,false);
});
test('advisory scenario is visible but canonical economics remains blocked',()=>{
 const w={ibmAssuranceScenarios:[{applicationId:'app',alternativeId:'alt',valueLeakage:{grossBenefit:100,adoptionRate:.5,incrementalRunCost:10,transitionCost:5,baselineRef:'b',attributionRef:'a'}}]};
 const r=advisoryEconomicSnapshot(w,'app','alt');
 assert.equal(r.netBenefit,35);assert.equal(r.canonicalComparisonReady,false);
 assert.match(advisoryEconomicHtml(r),/USER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED/);
});
test('duplicate scenario fails closed',()=>{
 const w={ibmAssuranceScenarios:[{applicationId:'a',alternativeId:'b'},{applicationId:'a',alternativeId:'b'}]};
 assert.equal(advisoryEconomicSnapshot(w,'a','b').status,'AMBIGUOUS');
});
test('html escapes status',()=>{
 assert.doesNotMatch(advisoryEconomicHtml({status:'<script>alert(1)</script>'}),/<script>/);
});
