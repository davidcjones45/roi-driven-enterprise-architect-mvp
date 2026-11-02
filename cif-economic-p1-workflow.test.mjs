import test from 'node:test';
import assert from 'node:assert/strict';
import { economicDecisionReadiness } from './cif-economic-p1-workflow.mjs';
import { decisionPackage } from './modernization-decision-package-model.mjs';
const economicLines=[
 {applicationId:'A',lineType:'CURRENT_RUN_COST',amount:1000,confidence:.8,source:'S'},
 {applicationId:'A',alternativeId:'X',lineType:'TRANSITION_COST',amount:500,confidence:.8,source:'S'},
 {applicationId:'A',alternativeId:'X',lineType:'TARGET_RUN_COST',amount:700,confidence:.8,source:'S'}
];
const economicEvidenceRegister=[{id:'E',source:'synthetic fixture',ownerId:'O',revision:'1',recordedAt:'2026-11-01',status:'VERIFIED'}];
const p1EconomicContext={baseline:{id:'B',revision:'1',ownerId:'O',effectiveFrom:'2026-11-01',currency:'USD',period:'Annual',evidenceRefs:['E']},cases:[{id:'A',baselineId:'B',baselineRevision:'1',currency:'USD',period:'Annual'}],costItems:[],costAllocations:[],benefitItems:[],benefitAllocations:[]};
test('workflow requires a P1 context to authorize economic comparison',()=>{
 assert.equal(economicDecisionReadiness({economicLines},'A','X').decisionReadyForEconomicComparison,false);
 assert.equal(economicDecisionReadiness({economicLines,p1EconomicContext,economicEvidenceRegister},'A','X').decisionReadyForEconomicComparison,true);
 assert.equal(economicDecisionReadiness({economicLines,economicEvidenceRegister,p1EconomicContext:{...p1EconomicContext,cases:[{...p1EconomicContext.cases[0],baselineRevision:'2'}]}},'A','X').decisionReadyForEconomicComparison,false);
});
test('decision-package path routes through P1 readiness gate',()=>{
 const workspace={applications:[{id:'A',name:'A'}],alternatives:[{id:'X',applicationId:'A',name:'X'}],economicLines};
 const blocked=decisionPackage(workspace);
 const row=blocked.applications?.[0]?.alternatives?.[0];
 assert.ok(row,'decision package must include candidate alternative');
 assert.equal(row.economics.comparisonReady,false);
 const allowed=decisionPackage({...workspace,p1EconomicContext,economicEvidenceRegister});
 assert.equal(allowed.applications[0].alternatives[0].economics.comparisonReady,true);
});
