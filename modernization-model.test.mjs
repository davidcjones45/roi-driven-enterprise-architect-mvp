import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeApplication, normalizeConstraint, normalizeAlternative,
  normalizeModernizationAssessment, assessmentIssues,
  providerRecommendationAsEvidence, eliminatedByHardConstraints,
  modernizationDecisionView, portfolioSummary
} from './modernization-model.mjs';

test('application remains provider neutral',()=>{
  const app=normalizeApplication({name:'Claims',evidenceRefs:'E1;E2'});
  assert.match(app.id,/^APP-/);
  assert.deepEqual(app.evidenceRefs,['E1','E2']);
  assert.equal('provider' in app,false);
});

test('provider recommendation remains advisory evidence',()=>{
  const rec=providerRecommendationAsEvidence({provider:'AWS',applicationId:'APP-1',strategy:'Replatform',confidence:.8});
  assert.equal(rec.status,'Advisory evidence only');
  assert.equal(rec.confidence,.8);
});

test('hard constraint can eliminate but soft constraint cannot',()=>{
  const alt=normalizeAlternative({id:'ALT-1',applicationId:'APP-1',strategyClass:'replatform'});
  const constraints=[
    normalizeConstraint({id:'C1',type:'SOFT',alternativeIds:['ALT-1'],evaluation:'Violated'}),
    normalizeConstraint({id:'C2',type:'HARD',alternativeIds:['ALT-1'],evaluation:'Violated'})
  ];
  const result=eliminatedByHardConstraints(alt,constraints);
  assert.deepEqual(result.violatedConstraintIds,['C2']);
});

test('assessment preserves independent evidence-aware dimensions',()=>{
  const a=normalizeModernizationAssessment({
    applicationId:'APP-1',assessmentDate:'2026-09-21',
    technicalHealth:{value:'Low',confidence:.7,evidenceRefs:['E1']},
    leastRegretNextMove:'Collect dependency evidence.'
  });
  assert.equal(a.technicalHealth.value,'Low');
  assert.equal(a.technicalHealth.confidence,.7);
  assert.equal(a.dataSuitability.value,'Not assessed');
});

test('assessment explicitly reports evidence gaps',()=>{
  const a=normalizeModernizationAssessment({applicationId:'APP-1',assessmentDate:'2026-09-21'});
  const result=assessmentIssues(a,{applications:[{id:'APP-1'}]});
  assert.equal(result.valid,false);
  assert.ok(result.issues.some(x=>x.includes('dataSuitability')));
});

test('decision view preserves multiple viable alternatives and no winner',()=>{
  const alts=[
    normalizeAlternative({id:'A1',applicationId:'APP-1',strategyClass:'rehost'}),
    normalizeAlternative({id:'A2',applicationId:'APP-1',strategyClass:'replatform'})
  ];
  const a=normalizeModernizationAssessment({
    id:'MOD-1',applicationId:'APP-1',assessmentDate:'2026-09-21',
    candidateAlternativeIds:['A1','A2'],leastRegretNextMove:'Validate dependencies.'
  });
  const view=modernizationDecisionView(a,{alternatives:alts,constraints:[]});
  assert.equal(view.viableAlternatives.length,2);
  assert.equal(view.authorityState,'Human review required');
  assert.equal(Object.hasOwn(view,'winner'),false);
});

test('portfolio summary exposes low-confidence assessments',()=>{
  const s=portfolioSummary({
    applications:[{name:'A'}],
    constraints:[{type:'HARD',name:'C'}],
    alternatives:[{applicationId:'APP-A',strategyClass:'retain'}],
    assessments:[{applicationId:'APP-A',assessmentDate:'2026-09-21',overallConfidence:.4}]
  });
  assert.equal(s.applications,1);
  assert.equal(s.lowConfidenceAssessments,1);
});
