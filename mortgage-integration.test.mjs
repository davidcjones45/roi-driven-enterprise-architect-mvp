import assert from 'node:assert/strict';
import test from 'node:test';
import { MORTGAGE_FIXTURE } from './mortgage-fixture.mjs';
import { executeMortgageIntegration, recordMortgageErirUnavailable, recordMortgageErirVerification } from './mortgage-integration.mjs';

test('mortgage case executes through four bounded layers without a credit decision', () => {
  const execution=executeMortgageIntegration(MORTGAGE_FIXTURE);
  assert.equal(execution.valid,true);
  assert.deepEqual(execution.stages.map(stage=>stage.layer),['ROI-EA','ERIR','FACEM','BACRM']);
  assert.equal(execution.roiEa.outputs.metrics.totalDti,0.44680851);
  assert.equal(execution.erir.applicabilityState,'UNRESOLVED—QUALIFIED REVIEW REQUIRED');
  assert.equal(execution.facem.states.authority,'NONE—NO CREDIT OR ACTION AUTHORITY');
  assert.equal(execution.facem.states.commitment,'NONE');
  assert.equal(execution.bacrm.status,'ABSTAIN—ADVISORY TRACE ONLY');
  assert.equal(execution.decisionState,'NOT MADE');
  assert.equal(execution.fairnessClaim,'NOT ESTABLISHED');
  assert.equal(execution.complianceClaim,'NOT ESTABLISHED');
});

test('human disposition remains a pending, fully bounded record', () => {
  const disposition=executeMortgageIntegration(MORTGAGE_FIXTURE).humanDisposition;
  assert.equal(disposition.application_id,'APP-MTG-001');
  assert.equal(disposition.human_disposition,'PENDING QUALIFIED HUMAN DISPOSITION');
  assert.equal(disposition.actor,null);
  assert.equal(disposition.authority_evidence,null);
  assert.equal(disposition.effective_time,null);
  assert.equal(disposition.successor_state,'AWAITING EVIDENCE AND REVIEW');
});

test('federation and bounded-AI value increments remain separate and unquantified', () => {
  const economics=executeMortgageIntegration(MORTGAGE_FIXTURE).economics;
  assert.equal(economics.federationIncrement_C2_minus_C1.state,'NOT QUANTIFIED');
  assert.equal(economics.boundedAiIncrement_C3_minus_C2.state,'NOT QUANTIFIED');
  assert.notEqual(economics.federationIncrement_C2_minus_C1.reason,economics.boundedAiIncrement_C3_minus_C2.reason);
});

test('ERIR repository return is retrieval evidence, not applicability', () => {
  const execution=executeMortgageIntegration(MORTGAGE_FIXTURE);
  const sourceId=execution.erir.sourceIds[0];
  const verified=recordMortgageErirVerification(execution,{records:[{id:sourceId}],missing_ids:[]});
  assert.equal(verified.erir.repositoryVerification.state,'PARTIAL SOURCE IDS RETURNED');
  assert.deepEqual(verified.erir.repositoryVerification.returnedIds,[sourceId]);
  assert.equal(verified.erir.applicabilityState,'UNRESOLVED—QUALIFIED REVIEW REQUIRED');
  assert.match(verified.erir.repositoryVerification.message,/does not establish applicability/);
});

test('ERIR service failure preserves the local execution and unresolved state', () => {
  const execution=recordMortgageErirUnavailable(executeMortgageIntegration(MORTGAGE_FIXTURE),'Synthetic outage');
  assert.equal(execution.valid,true);
  assert.equal(execution.erir.repositoryVerification.state,'UNAVAILABLE');
  assert.equal(execution.erir.repositoryVerification.message,'Synthetic outage');
  assert.equal(execution.decisionState,'NOT MADE');
});

test('configuration drift suspends BACRM without changing prior evidence', () => {
  const execution=executeMortgageIntegration(MORTGAGE_FIXTURE,{currentConfigurationId:'CFG-MERCA-002'});
  assert.equal(execution.bacrm.configurationMatch,false);
  assert.equal(execution.bacrm.status,'SUSPENDED—CONFIGURATION REASSESSMENT REQUIRED');
  assert.match(execution.finalState,/CAPABILITY SUSPENDED/);
  assert.equal(execution.decisionState,'NOT MADE');
});

test('integrated execution contains no protected applicant data', () => {
  const serialized=JSON.stringify(executeMortgageIntegration(MORTGAGE_FIXTURE));
  for(const forbidden of ['"race"','"ethnicity"','"sex"','"gender"','"age"']) assert.equal(serialized.includes(forbidden),false,forbidden);
});
