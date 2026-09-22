import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('M4 economics review alternative change recalculates results', () => {
  const source = readFileSync(new URL('./modernization-economics-ui.mjs', import.meta.url), 'utf8');
  assert.match(
    source,
    /querySelector\('#econ-filter-alt'\)\.addEventListener\('change',\(\)=>results\(p\)\)/
  );
});

test('index has no mojibake copyright marker', () => {
  const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
  const bad = String.fromCharCode(0x00C2) + String.fromCharCode(0x00A9);
  const good = String.fromCharCode(0x00A9);
  assert.equal(html.includes(bad), false);
  assert.equal(html.includes(good + ' 2026 David C. Jones.'), true);
});
