import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync(new URL('./index.html',import.meta.url),'utf8');

test('index loads continuity assurance after dependency graph and before app bootstrap',()=>{
  const dependency=html.indexOf('dependency-graph-ui.mjs');
  const continuity=html.indexOf('continuity-assurance-ui.mjs');
  const app=html.indexOf('app.js?v=');
  assert.ok(dependency>=0);
  assert.ok(continuity>dependency);
  assert.ok(app>continuity);
});
