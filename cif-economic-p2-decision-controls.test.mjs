import test from 'node:test';import assert from 'node:assert/strict';
import {resolveEvidenceReferences} from './cif-evidence-resolution.mjs';
import {evaluateOutcomeAcceptance,evaluateInvestmentGate} from './cif-economic-p2-decision-controls.mjs';
const evidence=[{id:'E',source:'synthetic',ownerId:'O',revision:'1',recordedAt:'2026-11-01',status:'VERIFIED'}];
test('evidence must resolve uniquely with provenance, verification and time',()=>{
 assert.equal(resolveEvidenceReferences(['E'],evidence).valid,true);
 assert.equal(resolveEvidenceReferences(['MISSING'],evidence).valid,false);
 assert.equal(resolveEvidenceReferences(['E'],[{...evidence[0],status:'NOT_ASSESSED'}]).valid,false);
 assert.equal(resolveEvidenceReferences(['E'],[...evidence,...evidence]).valid,false);
 assert.equal(resolveEvidenceReferences(['E'],[{...evidence[0],effectiveTo:'2026-10-01'}],{asOf:'2026-11-01'}).valid,false);
});
const contract={id:'OUT-1',applicationId:'APP',alternativeId:'ALT',ownerId:'OPS',metricId:'P95',unit:'ms',target:200,operator:'LTE',observationStart:'2026-11-01',observationEnd:'2026-11-30',evidenceRef:'E'};
const observed=[{metricId:'P95',applicationId:'APP',alternativeId:'ALT',observedAt:'2026-11-15',value:180,unit:'ms'}];
test('T22 outcome acceptance requires evidence, right metric, right window, and threshold',()=>{
 assert.equal(evaluateOutcomeAcceptance(contract,observed,evidence).accepted,true);
 assert.equal(evaluateOutcomeAcceptance(contract,[{...observed[0],value:250}],evidence).accepted,false);
 assert.equal(evaluateOutcomeAcceptance(contract,[{...observed[0],observedAt:'2026-12-01'}],evidence).accepted,false);
 assert.equal(evaluateOutcomeAcceptance(contract,observed,[]).accepted,false);
});
const decision={id:'G1',initiativeId:'A',track:'STABILIZATION',authorityId:'AUTH',ownerId:'FIN',effectiveAt:'2026-11-02',evidenceRef:'E',state:'APPROVED'};
test('T23 independently governed investment gates, no implied cross-track approval',()=>{
 assert.equal(evaluateInvestmentGate(decision,[decision],evidence).approved,true);
 const commercial={...decision,id:'G2',track:'COMMERCIAL_EXPANSION',state:'PENDING'};
 assert.equal(evaluateInvestmentGate(commercial,[decision,commercial],evidence).approved,false);
 assert.equal(evaluateInvestmentGate({...decision,id:'G3',evidenceRef:'X'},[decision],evidence).approved,false);
 assert.equal(evaluateInvestmentGate(decision,[decision,{...decision,id:'G4'}],evidence).approved,false);
});
