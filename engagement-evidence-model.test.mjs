import test from 'node:test';
import assert from 'node:assert/strict';
import { engagementEvidenceErrors, evidenceSummary, normalizeEngagementEvidence } from './engagement-evidence-model.mjs';

test('engagement evidence preserves explicit unknown and never treats supply as validation', () => {
  const record = normalizeEngagementEvidence({ title: 'Workflow note', evidence_type: 'Process document', source_reference: 'Client file list', relevance: 'Current workflow context', review_state: 'Supplied' });
  assert.equal(record.classification, 'Unknown');
  assert.equal(record.review_state, 'Supplied');
});

test('engagement evidence requires source, relevance, and qualified review support when claimed', () => {
  assert.deepEqual(engagementEvidenceErrors({ title: 'Claim', evidence_type: 'Other', classification: 'Verified fact', source_reference: '', relevance: '', review_state: 'Reviewed with limitation' }), [
    'Source or document reference is required.', 'Relevance is required.', 'A reviewed record with limitation needs its limitation or gap stated.', 'A verified fact needs a named reviewer or accountable source.'
  ]);
});

test('evidence summary keeps review-required, unknown, and superseded states separate', () => {
  const summary = evidenceSummary([
    { review_state: 'Qualified review required', classification: 'Unknown' },
    { review_state: 'Superseded', classification: 'Client assertion' },
  ]);
  assert.deepEqual(summary, { total: 2, reviewRequired: 1, unknown: 1, superseded: 1 });
});
