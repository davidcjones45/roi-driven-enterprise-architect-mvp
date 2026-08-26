import test from 'node:test';
import assert from 'node:assert/strict';
import { DISCOVERY_SECTIONS, discoveryCompleteness, discoveryValidationErrors, normalizeDiscovery } from './discovery-model.mjs';

test('discovery normalizes every controlled field to explicit Unknown rather than zero, false, or absent', () => {
  const discovery = normalizeDiscovery({ business_problem: { problem_statement: { value: 'Review delays service.', state: 'Client assertion', source: 'Interview' } } });
  assert.equal(discovery.business_problem.problem_statement.state, 'Client assertion');
  assert.equal(discovery.business_problem.annual_cost.state, 'Unknown');
  assert.equal(discoveryCompleteness(discovery).total, DISCOVERY_SECTIONS.flatMap(section => section.fields).length);
});

test('an entered discovery statement needs an explicit source or reviewer reference', () => {
  const errors = discoveryValidationErrors({ business_problem: { problem_statement: { value: 'Review delays service.', state: 'Verified fact', source: '' } } });
  assert.deepEqual(errors, ['Business problem: Problem statement needs a source or reviewer reference.']);
});

test('discovery completeness is a capture indicator and does not treat unknown as complete', () => {
  const discovery = normalizeDiscovery();
  discovery.business_problem.problem_statement = { value: 'Unknown pending interview', state: 'Unknown', source: 'Discovery plan' };
  const summary = discoveryCompleteness(discovery);
  assert.equal(summary.recorded, 1);
  assert.equal(summary.complete, false);
});
