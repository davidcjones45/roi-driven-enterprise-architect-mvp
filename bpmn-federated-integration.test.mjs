import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const [app, html] = await Promise.all([
  readFile(new URL('./app.js', import.meta.url), 'utf8'),
  readFile(new URL('./index.html', import.meta.url), 'utf8'),
]);

const occurrences = (source, pattern) => (source.match(pattern) || []).length;

test('federated and mortgage BPMN workspaces coexist in the integrated shell', () => {
  assert.equal(occurrences(html, /data-view="federated"/g), 1);
  assert.equal(occurrences(html, /data-view="mortgage-demo"/g), 1);
  assert.equal(occurrences(html, /<section id="federated"/g), 1);
  assert.equal(occurrences(html, /<section id="mortgage-demo"/g), 1);
  assert.equal(occurrences(html, /data-federated-panel=/g), 5);
  assert.equal(occurrences(html, /id="analyze-mortgage-bpmn"/g), 1);
  assert.equal(occurrences(html, /id="stage-reference-bpmn"/g), 1);
});

test('combined application initializes each workspace once', () => {
  assert.equal(occurrences(app, /const titles\s*=/g), 1);
  assert.equal(occurrences(app, /wireFederated\(\);/g), 1);
  assert.equal(occurrences(app, /wireMortgageDemo\(\);/g), 1);
  assert.match(app, /wireFederated\(\);[^\n]*wireMortgageDemo\(\);[^\n]*renderAll\(\);/);
});

test('resolved integration files contain no merge markers', () => {
  for (const source of [app, html]) {
    assert.doesNotMatch(source, /^(<<<<<<<|=======|>>>>>>>)/m);
  }
});
