import test from 'node:test';
import assert from 'node:assert/strict';
import { ENGAGEMENT_STATUSES, engagementReadiness, engagementSummary, engagementValidationErrors } from './engagement-model.mjs';

const complete = {
  client_name: 'North Star Community Bank', initiative_name: 'Mortgage review diagnostic',
  engagement_title: 'North Star diagnostic', executive_sponsor: 'Executive sponsor',
  business_owner: 'Business owner', consultant: 'Named consultant',
  decision_question: 'What is the appropriate recommendation?', scope: 'Decision-scoped review.',
  out_of_scope: 'No implementation.', start_date: '2026-08-26', target_decision_date: '2026-09-30',
  industry: 'Community banking', jurisdictions: 'United States', status: 'Discovery'
};

test('engagement foundation requires every decision-scoped field without treating unknown as zero', () => {
  const errors = engagementValidationErrors({ ...complete, jurisdictions: '' });
  assert.deepEqual(errors, ['jurisdictions is required.']);
  assert.equal(engagementReadiness({ ...complete, jurisdictions: '' }).complete, false);
});

test('engagement foundation recognizes only the controlled lifecycle states', () => {
  assert.ok(ENGAGEMENT_STATUSES.includes('Decision Issued'));
  assert.deepEqual(engagementValidationErrors({ ...complete, status: 'Approved' }), ['status is not recognized.']);
});

test('engagement summary keeps evidence gaps, findings, and questions distinct from readiness', () => {
  const summary = engagementSummary({ ...complete, engagement_id: 'ENG-001', evidence_gap_count: 2, finding_count: 3, open_question_count: 1 });
  assert.equal(summary.readiness, 'FOUNDATION COMPLETE');
  assert.equal(summary.evidence_gaps, 2);
  assert.equal(summary.findings, 3);
  assert.equal(summary.open_questions, 1);
  assert.equal(summary.recommendation, 'NOT YET RECORDED');
});

test('engagement summary reports a recorded consultant recommendation without treating it as readiness', () => {
  const summary = engagementSummary({ ...complete, recommendation: { recommendation: 'DEFER' } });
  assert.equal(summary.recommendation, 'DEFER');
  assert.equal(summary.readiness, 'FOUNDATION COMPLETE');
});
