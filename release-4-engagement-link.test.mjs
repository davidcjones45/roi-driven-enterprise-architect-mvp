import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('Release 4 provides a visible, safe AI at Human Scale engagement link without changing demo boundaries', async () => {
  const html = await readFile(new URL('./index.html', import.meta.url), 'utf8');
  assert.match(html, /class="engagement-link" href="https:\/\/www\.aiathumanscale\.com"/);
  assert.match(html, /target="_blank" rel="noopener noreferrer"/);
  assert.match(html, /Design-partner engagement information/);
  assert.match(html, /Stored in this browser only/);
});
