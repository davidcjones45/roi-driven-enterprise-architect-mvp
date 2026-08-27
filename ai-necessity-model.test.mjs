import test from 'node:test';
import assert from 'node:assert/strict';
import { aiNecessityAssessment } from './ai-necessity-model.mjs';

test('AI Necessity Gate holds while the non-AI baseline and human disposition conditions are unresolved', () => {
  const assessment = aiNecessityAssessment({ assessed_task: 'Route incomplete requests', non_ai_viable: 'Unknown' });
  assert.equal(assessment.outcome, 'HOLD — AI NECESSITY UNRESOLVED');
  assert.ok(assessment.missing.includes('non-AI baseline'));
  assert.ok(assessment.missing.includes('accountable disposition owner'));
});

test('AI Necessity Gate does not compare AI when the non-AI baseline is not viable', () => {
  assert.equal(aiNecessityAssessment({ non_ai_viable: 'No' }).outcome, 'HOLD — NON-AI BASELINE NOT VIABLE');
});

test('AI Necessity Gate reaches only conditionally assessable human review', () => {
  const assessment = aiNecessityAssessment({ assessed_task: 'Detect missing attachments', non_ai_baseline: 'Coordinator checks a work queue', non_ai_viable: 'Yes', proposed_bounded_support: 'Flag potentially incomplete records for review', excluded_consequential_actions: 'No approval, denial, communication, commitment, or authority decision', accountable_disposition_owner: 'Operations manager', assumptions_and_unknowns: 'Queue volume and false-positive rate need measurement' });
  assert.equal(assessment.outcome, 'CONDITIONALLY ASSESSABLE — HUMAN REVIEW REQUIRED');
  assert.match(assessment.rationale, /does not establish need, value, authority, safety, or authorization/);
});
