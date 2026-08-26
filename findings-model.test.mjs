import test from 'node:test';
import assert from 'node:assert/strict';
import { findingErrors, findingsSummary, openQuestionErrors } from './findings-model.mjs';

const finding = { title: 'Evidence gap affects comparison', domain: 'Evidence', finding_statement: 'The stated baseline lacks a reviewed source.', severity: 'High', status: 'Open', supporting_evidence: 'EVD-001', decision_impact: 'Decision-blocking', owner: 'Operations lead', required_action: 'Obtain a reviewed baseline.' };
const question = { question: 'Which baseline measure is accepted for this decision?', domain: 'Economics', owner: 'Finance lead', evidence_needed: 'Reviewed time study', decision_impact: 'Decision-blocking', status: 'Open' };

test('findings require explicit evidence, owner, and action without treating a finding as a recommendation', () => {
  assert.deepEqual(findingErrors({ ...finding, supporting_evidence: '' }), ['supporting_evidence is required.']);
  assert.deepEqual(findingErrors({ ...finding, status: 'Resolved' }), ['resolution is required when a finding is resolved.']);
});

test('open questions remain separate from assumptions and require evidence needed', () => {
  assert.deepEqual(openQuestionErrors({ ...question, evidence_needed: '' }), ['evidence_needed is required.']);
  assert.deepEqual(openQuestionErrors({ ...question, status: 'Unable to resolve' }), ['resolution is required for a closed question state.']);
});

test('summary makes unresolved decision-blocking items visible without blocking all progress', () => {
  const summary = findingsSummary([finding], [question]);
  assert.deepEqual(summary, { findings: 1, questions: 1, decisionBlocking: 2, highUnresolved: 1, unresolvedQuestions: 1 });
});
