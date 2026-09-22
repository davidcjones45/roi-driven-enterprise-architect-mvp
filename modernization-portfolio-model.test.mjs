import test from 'node:test';import assert from 'node:assert/strict';
import {normalizeCapacity,capacityAssessment,applicationPortfolioState,portfolioReadiness,portfolioPlan,nextPortfolioActions} from './modernization-portfolio-model.mjs';

const base={applications:[{id:'A',name:'A'}],assessments:[{applicationId:'A',assessmentDate:'2026-09-22',overallConfidence:.8,evidenceCompleteness:.8,candidateAlternativeIds:['X'],leastRegretNextMove:'Review.' ,
businessSignificance:{value:'High',confidence:.8,evidenceRefs:['E']},functionalAdequacy:{value:'High',confidence:.8,evidenceRefs:['E']},technicalHealth:{value:'Low',confidence:.8,evidenceRefs:['E']},dataSuitability:{value:'Medium',confidence:.8,evidenceRefs:['E']},integrationComplexity:{value:'Medium',confidence:.8,evidenceRefs:['E']},securityReadiness:{value:'Medium',confidence:.8,evidenceRefs:['E']},operationalReadiness:{value:'Medium',confidence:.8,evidenceRefs:['E']},organizationalReadiness:{value:'Medium',confidence:.8,evidenceRefs:['E']},economicAttractiveness:{value:'Medium',confidence:.8,evidenceRefs:['E']},transformationComplexity:{value:'Medium',confidence:.8,evidenceRefs:['E']},strategicLifecycle:{value:'Long-life',confidence:.8,evidenceRefs:['E']}}],
alternatives:[{id:'X',applicationId:'A'}],constraints:[],dependencies:[],economicLines:[]};

test('capacity shortfall remains explicit',()=>{const r=capacityAssessment([{type:'Security',availableFte:1,reservedFte:.5}],[{capacityType:'Security',requiredFte:.8}]);assert.equal(r[0].constrained,true);assert.ok(Math.abs(r[0].shortfallFte-.3)<1e-9)});
test('unassessed app is not silently prioritized',()=>{assert.equal(applicationPortfolioState({id:'A'},{applications:[{id:'A'}]}).state,'NOT_ASSESSED')});
test('complete assessed app can become ready to plan',()=>{assert.equal(applicationPortfolioState(base.applications[0],base).state,'READY_TO_PLAN')});
test('low confidence defers for evidence',()=>{const w=structuredClone(base);w.assessments[0].overallConfidence=.4;assert.equal(applicationPortfolioState(w.applications[0],w).state,'DEFERRED_FOR_EVIDENCE')});
test('no viable alternative is explicit',()=>{const w=structuredClone(base);w.assessments[0].candidateAlternativeIds=[];assert.equal(applicationPortfolioState(w.applications[0],w).state,'NO_VIABLE_ALTERNATIVE')});
test('portfolio readiness counts states',()=>{const w=structuredClone(base);w.applications.push({id:'B'});const r=portfolioReadiness(w);assert.equal(r.counts.READY_TO_PLAN,1);assert.equal(r.counts.NOT_ASSESSED,1)});
test('portfolio plan includes candidate wave and capacity views',()=>{const w=structuredClone(base);w.deliveryCapacities=[{type:'Architecture',availableFte:1}];w.deliveryDemands=[{applicationId:'A',alternativeId:'X',capacityType:'Architecture',requiredFte:1.2}];const p=portfolioPlan(w);assert.equal(p.rows.length,1);assert.equal(p.constrainedCapacity.length,1);assert.match(p.authorityState,/no automatic/i)});
test('next actions include evidence and capacity remedies',()=>{const a=nextPortfolioActions({rows:[{applicationId:'A',state:'DEFERRED_FOR_EVIDENCE'}],constrainedCapacity:[{type:'Testing / QA',shortfallFte:.5}]});assert.equal(a.length,2)});

