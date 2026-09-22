import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = name => readFileSync(new URL(`./${name}`, import.meta.url), 'utf8');
const EVENT = 'roi-ea-modernization-data-changed';

test('base modernization workspace listens for cross-module data changes', () => {
  const source = read('modernization-workspace-ui.mjs');
  assert.ok(source.includes(`window.addEventListener('${EVENT}'`));
  assert.match(source, /if\(event\.detail\?\.key===KEY\) render\(section\)/);
});

for (const file of [
  'aws-modernization-adapter-ui.mjs',
  'modernization-dependency-ui.mjs',
  'modernization-economics-ui.mjs',
  'modernization-portfolio-ui.mjs',
  'multicloud-modernization-ui.mjs'
]) {
  test(`${file} publishes modernization data changes`, () => {
    const source = read(file);
    assert.ok(source.includes(EVENT));
    assert.match(source, /dispatchEvent\(new CustomEvent/);
  });
}

test('multicloud candidate creation writes adapter-produced candidate alternatives', () => {
  const ui = read('multicloud-modernization-ui.mjs');
  const adapter = read('multicloud-modernization-adapter.mjs');
  assert.match(ui, /providerCandidateAlternative\(rec\|\|\{\}\)/);
  assert.match(ui, /d\.alternatives\.push\(alt\)/);
  assert.match(adapter, /decisionStatus:'Candidate \/ provider evidence'/);
});

