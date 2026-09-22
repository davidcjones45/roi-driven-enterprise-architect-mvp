import test from 'node:test';import assert from 'node:assert/strict';
import {normalizeEconomicLine,economicLineIssues,economicsForAlternative,investmentMetrics,seedEconomicsFromAlternatives,sensitivityCases,economicsCompleteness} from './modernization-economics-model.mjs';
test('missing values remain missing',()=>{const x=normalizeEconomicLine({applicationId:'A',source:'S'});assert.equal(x.amount,null);assert.equal(x.confidence,null)});
test('requires provenance',()=>{const r=economicLineIssues({applicationId:'A',amount:100,confidence:.8});assert.equal(r.valid,false);assert.ok(r.issues.some(x=>x.includes('evidence')))});
test('calculates economics',()=>{const e=economicsForAlternative('A','X',[
{applicationId:'A',lineType:'CURRENT_RUN_COST',amount:1000,confidence:.8,source:'S'},
{applicationId:'A',alternativeId:'X',lineType:'TARGET_RUN_COST',amount:600,confidence:.8,source:'S'},
{applicationId:'A',alternativeId:'X',lineType:'QUANTIFIED_BENEFIT',amount:100,confidence:.6,source:'S'},
{applicationId:'A',alternativeId:'X',lineType:'RISK_ADJUSTMENT',amount:50,confidence:.6,source:'S'}]);assert.equal(e.annualRunCostAvoidance,400);assert.equal(e.riskAdjustedAnnualBenefit,450)});
test('payback and npv',()=>{const m=investmentMetrics({transitionCost:1000,riskAdjustedAnnualBenefit:500},{horizonYears:3,discountRate:0});assert.equal(m.simplePaybackYears,2);assert.equal(m.npv,500);assert.equal(m.roi,.5)});
test('no invented payback',()=>{const m=investmentMetrics({transitionCost:1000,riskAdjustedAnnualBenefit:-100},{horizonYears:5,discountRate:.08});assert.equal(m.simplePaybackYears,null);assert.equal(m.paybackYear,null)});
test('seeds M1 costs as assumptions',()=>{const x=seedEconomicsFromAlternatives('A',[{id:'X',applicationId:'A',name:'R',oneTimeCost:800,annualRunCost:500,confidence:.7}],[]);assert.equal(x.length,2);assert.ok(x.every(v=>v.assumptionRefs.length))});
test('sensitivity leaves base unchanged',()=>{const e={transitionCost:1000,riskAdjustedAnnualBenefit:400};const c=sensitivityCases(e,{horizonYears:5,discountRate:0});assert.equal(e.transitionCost,1000);assert.ok(c[0].metrics.npv<c[1].metrics.npv)});
test('readiness requires baseline transition target',()=>{const l=[
{applicationId:'A',lineType:'CURRENT_RUN_COST',amount:1000,confidence:.8,source:'S'},
{applicationId:'A',alternativeId:'X',lineType:'TRANSITION_COST',amount:500,confidence:.8,source:'S'},
{applicationId:'A',alternativeId:'X',lineType:'TARGET_RUN_COST',amount:700,confidence:.8,source:'S'}];assert.equal(economicsCompleteness('A','X',l).decisionReadyForEconomicComparison,true)});
