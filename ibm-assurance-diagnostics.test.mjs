import test from 'node:test';
import assert from 'node:assert/strict';
import {assessHumanIntervention,assessExitFeasibility,assessValueLeakage} from './ibm-assurance-diagnostics.mjs';

test('human oversight fails closed without halt authority',()=>{
 const r=assessHumanIntervention({reviewerId:'r',authorityRef:'a',evidenceRef:'e',haltMechanism:'pause',escalationOwner:'o',reviewBeforeExecution:true,evidenceAccessible:true,canHalt:false});
 assert.equal(r.ready,false); assert.match(r.issues.join(' '),/cannot halt/);
});
test('human oversight is reviewable only with complete asserted controls',()=>{
 const r=assessHumanIntervention({reviewerId:'r',authorityRef:'a',evidenceRef:'e',haltMechanism:'pause',escalationOwner:'o',reviewBeforeExecution:true,evidenceAccessible:true,canHalt:true});
 assert.equal(r.ready,true); assert.equal(r.status,'REVIEWABLE');
});
test('exit feasibility rejects missing contractual rights',()=>{
 const r=assessExitFeasibility({dependencyId:'d',ownerId:'o',contractEvidenceRef:'c',portabilityEvidenceRef:'p',rollbackEvidenceRef:'r',switchingDays:20,exitCost:100,substituteValidated:true,exitRightsConfirmed:false});
 assert.equal(r.supported,false);
});
test('exit feasibility rejects negative costs',()=>{
 assert.equal(assessExitFeasibility({exitCost:-1}).supported,false);
});
test('financial leakage reduces net estimated benefit without cash recognition',()=>{
 const r=assessValueLeakage({grossBenefit:1000,adoptionRate:0.6,incrementalRunCost:100,transitionCost:50,baselineRef:'b',attributionRef:'a'});
 assert.equal(r.valid,true); assert.equal(r.adoptedBenefit,600); assert.equal(r.leakage,550); assert.equal(r.netBenefit,450); assert.equal(r.status,'ESTIMATE_ONLY');
});
test('financial leakage rejects invalid adoption and missing provenance',()=>{
 const r=assessValueLeakage({grossBenefit:1000,adoptionRate:1.2,incrementalRunCost:0,transitionCost:0});
 assert.equal(r.valid,false); assert.equal(r.netBenefit,null);
});
