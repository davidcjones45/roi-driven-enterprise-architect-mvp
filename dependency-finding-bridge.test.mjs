import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('installed app bridge accepts dependency finding promotion event',()=>{
  const src=fs.readFileSync(new URL('./app.js',import.meta.url),'utf8');
  assert.match(src,/roi-ea-dependency-finding-promote/);
  assert.match(src,/Dependency finding added to the local Consulting Findings register/);
  assert.match(src,/local consulting engagement/);
});


test('installed app bridge accepts dependency analysis evidence promotion event',()=>{
  const src=fs.readFileSync(new URL('./app.js',import.meta.url),'utf8');
  assert.match(src,/roi-ea-dependency-evidence-promote/);
  assert.match(src,/Dependency analysis added to the local Consulting evidence register/);
  assert.match(src,/engagementEvidenceErrors/);
});


test('installed dependency evidence bridge appends returned evidence record to active engagement',()=>{
  const src=fs.readFileSync(new URL('./app.js',import.meta.url),'utf8');
  assert.match(src,/record\.engagement_id===engagement\.engagement_id/);
  assert.match(src,/evidence_register:\[\.\.\.\(record\.evidence_register\|\|\[\]\),saved\]/);
});
