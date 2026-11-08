import test from 'node:test';
import assert from 'node:assert/strict';
import {assessAuthorityAssurance,assessEconomicAssurance} from './ibm-assurance-workflow.mjs';
test('missing intervention and exit remain not assessed without changing authority',()=>{
 const authority={effectiveDate:'2026-01-01',status:'Active',relationships:[],evidenceRequirements:[]};
 const r=assessAuthorityAssurance(authority,'2026-11-08');
 assert.equal(r.canonical.state,'Effective — controlled authority');
 assert.equal(r.humanIntervention.ready,false);
 assert.equal(r.exitFeasibility.supported,false);
 assert.equal(r.advisoryOnly,true);
});
test('failed human halt does not change canonical authority',()=>{
 const authority={effectiveDate:'2026-01-01',status:'Active',relationships:[],evidenceRequirements:[]};
 const r=assessAuthorityAssurance(authority,'2026-11-08',{reviewerId:'r',authorityRef:'a',evidenceRef:'e',haltMechanism:'pause',escalationOwner:'o',canHalt:false,reviewBeforeExecution:true,evidenceAccessible:true});
 assert.equal(r.humanIntervention.ready,false);
 assert.equal(r.canonical.state,'Effective — controlled authority');
});
test('value leakage does not override fail-closed economic decision readiness',()=>{
 const workspace={economicLines:[],p1EconomicContext:null};
 const before=JSON.stringify(workspace);
 const r=assessEconomicAssurance(workspace,'APP','ALT',{grossBenefit:1000,adoptionRate:0.5,incrementalRunCost:100,transitionCost:50,baselineRef:'B',attributionRef:'A'});
 assert.equal(r.canonical.decisionReadyForEconomicComparison,false);
 assert.equal(r.valueLeakage.netBenefit,350);
 assert.equal(JSON.stringify(workspace),before);
});
test('missing leakage is not interpreted as zero leakage',()=>{
 const r=assessEconomicAssurance({},'APP','ALT');
 assert.equal(r.valueLeakage.status,'NOT_ASSESSED');
 assert.equal(r.valueLeakage.netBenefit,null);
});
