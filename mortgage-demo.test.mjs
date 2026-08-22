import assert from 'node:assert/strict';
import test from 'node:test';
import { MORTGAGE_FIXTURE } from './mortgage-fixture.mjs';
import { evaluateMortgageCase, validateMortgageFixture } from './mortgage-model.mjs';

test('sanitized fixture excludes protected-class fields and protected audit sheet',()=>{
  const result=validateMortgageFixture(MORTGAGE_FIXTURE);
  assert.equal(result.valid,true,result.errors.join('; '));
  const serialized=JSON.stringify(MORTGAGE_FIXTURE);
  for(const forbidden of ['"age"','"race"','"ethnicity"','"sex"','Protected Audit Data']) assert.equal(serialized.includes(forbidden),false,`Fixture projection includes ${forbidden}`);
  assert.equal(MORTGAGE_FIXTURE.importedSheets.includes('Protected Audit'),false);
});

test('deterministic focal calculations reproduce the approved fixture',()=>{
  const result=evaluateMortgageCase(MORTGAGE_FIXTURE);
  assert.equal(result.valid,true);
  assert.equal(result.metrics.grossMonthlyIncome,7833.33);
  assert.equal(result.metrics.totalMonthlyObligations,3500);
  assert.ok(Math.abs(result.metrics.totalDti-0.44680851)<0.00000001);
  assert.ok(Math.abs(result.metrics.combinedLtv-0.94193548)<0.00000001);
  assert.ok(Math.abs(result.metrics.reserveMonths-1.54471545)<0.00000001);
  assert.ok(Math.abs(result.metrics.baseOnlyDti-0.48837209)<0.00000001);
});

test('missing evidence forces explicit abstention and no decision',()=>{
  const result=evaluateMortgageCase(MORTGAGE_FIXTURE);
  assert.equal(result.evidenceState,'INSUFFICIENT EVIDENCE');
  assert.equal(result.aiActionState,'ABSTAIN—ADVISORY TRACE ONLY');
  assert.equal(result.decisionState,'NOT MADE');
  assert.equal(result.authorityState,'NO CREDIT OR ACTION AUTHORITY');
  assert.deepEqual(result.evidenceGaps.map(g=>g.evidenceId),['DOC-MTG-004','DOC-MTG-008']);
});

test('policy comparison identifies exception-review bands without approval',()=>{
  const result=evaluateMortgageCase(MORTGAGE_FIXTURE);
  assert.equal(result.financialReviewRoute,'MANUAL EXCEPTION REVIEW CANDIDATE');
  assert.equal(result.policyTrace.find(x=>x.metric==='Total DTI').band,'exception');
  assert.equal(result.policyTrace.find(x=>x.metric==='Post-closing reserves').band,'exception');
  assert.equal(result.decisionState,'NOT MADE');
});

test('reviewed/current configuration mismatch adds a reassessment gap',()=>{
  const result=evaluateMortgageCase(MORTGAGE_FIXTURE,{currentConfigurationId:'CFG-MERCA-002'});
  assert.equal(result.capability.configurationMatch,false);
  assert.equal(result.evidenceGaps.some(g=>g.id==='GAP-MTG-003'),true);
  assert.equal(result.aiActionState,'ABSTAIN—ADVISORY TRACE ONLY');
});

test('schema validator rejects a protected field introduced into the projection',()=>{
  const altered=structuredClone(MORTGAGE_FIXTURE);
  altered.caseInputs.push({id:'BAD-001',field:'race',value:'Synthetic protected value'});
  const result=validateMortgageFixture(altered);
  assert.equal(result.valid,false);
  assert.match(result.errors.join(' '),/Sensitive applicant fields are prohibited/);
});
