import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = path => fs.readFileSync(new URL(path,import.meta.url),'utf8');

test('A9 shell integration is wired into app.js',()=>{
  const source=read('./app.js');
  assert.match(source,/createOperatingCycleShellController/);
  assert.match(source,/operatingCycleShell\?\.setView\(view\)/);
  assert.match(source,/onStateChange:\s*\(snapshot\)\s*=>\s*operatingCycleShell\?\.setBpmnSnapshot\(snapshot\)/);
});

test('A9 five-screen strip and BPMN context exist in index.html',()=>{
  const source=read('./index.html');
  assert.match(source,/id="operating-cycle-strip"/);
  assert.match(source,/id="operating-cycle-status"/);
  assert.match(source,/id="bpmn-cycle-context"/);
  assert.match(source,/data-cycle-screen="PROCESS_AI_ANALYSIS"/);
  assert.match(source,/roi-ea-operating-cycle\.css/);
});

test('BPMN controller publishes bounded read-only cycle state without creating authority',()=>{
  const source=read('./bpmn-review-ui.mjs');
  assert.match(source,/bpmnReviewCycleSnapshot/);
  assert.match(source,/readOnlyVisualization:true/);
  assert.match(source,/executesWorkflow:false/);
  assert.match(source,/createsAuthority:false/);
  assert.match(source,/onStateChange/);
});
