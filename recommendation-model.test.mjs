import test from 'node:test';
import assert from 'node:assert/strict';
import { recommendationErrors, recommendationReadiness } from './recommendation-model.mjs';

const complete = { recommendation:'REDESIGN', executive_summary:'The current proposal needs redesign.', rationale:'Evidence and governance prerequisites remain unresolved.', decision_date:'2026-08-26', consultant:'Consultant', key_evidence:'EVD-1', key_findings:'FND-1', conditions:'Identify accountable owner and revised boundary.', assumptions:'No assumptions resolved.', residual_risks:'Unverified implementation condition.', required_next_steps:'Obtain the missing review evidence.', review_trigger:'Reassess when evidence is supplied.' };

test('recommendation requires a consultant-entered option and decision record rather than selecting one automatically', () => {
  assert.deepEqual(recommendationErrors(complete), []);
  assert.match(recommendationErrors({ ...complete, recommendation:'' }).join(' '), /recommendation is required/);
  assert.match(recommendationErrors({ ...complete, recommendation:'AUTHORIZE', conditions:'' }).join(' '), /conditions are required/);
});

test('readiness exposes unresolved review conditions without blocking a consultant recommendation', () => {
  const readiness = recommendationReadiness({ findings_register:[{ title:'Missing owner', finding_statement:'No owner', supporting_evidence:'EVD-1', owner:'Sponsor', required_action:'Resolve', severity:'Decision-critical', status:'Open', decision_impact:'Decision-blocking', domain:'Governance' }], open_questions_register:[] });
  assert.equal(readiness.status, 'CONDITIONAL — EXPLICIT EXCEPTIONS REQUIRED');
  assert.equal(readiness.decisionBlocking, 1);
  assert.match(readiness.note, /not an automated decision maker/);
});
