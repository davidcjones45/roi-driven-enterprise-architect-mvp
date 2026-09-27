import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('installed app bridge accepts dependency finding promotion event',()=>{
  const src=fs.readFileSync(new URL('./app.js',import.meta.url),'utf8');
  assert.match(src,/roi-ea-dependency-finding-promote/);
  assert.match(src,/Dependency finding added to the local Consulting Findings register/);
  assert.match(src,/local consulting engagement/);
});
