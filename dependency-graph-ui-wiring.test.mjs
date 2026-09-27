import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('dependency graph UI uses existing modernization local-storage workspace',()=>{
  const src=fs.readFileSync(new URL('./dependency-graph-ui.mjs',import.meta.url),'utf8');
  assert.match(src,/roi-ea-application-modernization-m1-v0\.1/);
  assert.match(src,/parseAndValidateBpmn/);
  assert.match(src,/microsoftGraphOrgToDependencyGraph/);
  assert.match(src,/Continuity Anchor/);
  assert.match(src,/Essential Action/);
});
