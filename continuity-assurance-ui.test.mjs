import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const src=fs.readFileSync(new URL('./continuity-assurance-ui.mjs',import.meta.url),'utf8');

test('continuity assurance UI reuses the existing modernization browser-local workspace',()=>{
  assert.match(src,/roi-ea-application-modernization-m1-v0\.1/);
  assert.match(src,/migrateContinuityAssuranceWorkspace/);
  assert.match(src,/Continuity assurance/);
});

test('continuity assurance UI exposes core continuity and nonhierarchical analytical views',()=>{
  assert.match(src,/Core continuity view/);
  assert.match(src,/Designed \/ Observed \/ Assured/);
  assert.match(src,/Dependency accumulation lens/);
  assert.match(src,/Constraining dependency validation/);
});

test('Reliance Claim Essential Action selector uses dependency-architecture Essential Actions and has an explicit empty state',()=>{
  assert.match(src,/data\.essentialActions/);
  assert.match(src,/Select Essential Action/);
  assert.match(src,/No Essential Actions recorded/);
  assert.match(src,/Manage Essential Actions/);
  assert.match(src,/data-mod-tab="dependency-graph"/);
});

test('continuity assurance UI exposes outcome, reassessment, successor, and optional human-centered views',()=>{
  assert.match(src,/Intervention \/ consequence \/ outcome \/ residual exposure/);
  assert.match(src,/Reassessment queue/);
  assert.match(src,/Successor Assurance/);
  assert.match(src,/Optional Human Agency \/ Graduation/);
  assert.match(src,/Human\+AI Interaction Divergence/);
});

test('continuity UI exports an application-local CIF candidate handoff without canonicalization',()=>{
  assert.match(src,/ROI-EA APPLICATION-LOCAL \/ CIF v0\.4\.1-ALIGNED/);
  assert.doesNotMatch(src,/CIF-S-009 \/ CIF-AP-002/);
  assert.match(src,/continuityAssuranceCifHandoff/);
  assert.match(src,/continuity-assurance-cif-handoff-v0\.1\.json/);
  assert.match(src,/continuityAssuranceSummary\(data,\{asOf\}\)/);
  assert.match(src,/evaluateRelianceClaim\(c,data,\{asOf\}\)/);
});
