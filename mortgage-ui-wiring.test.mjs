import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read=(name)=>readFile(new URL(`./${name}`,import.meta.url),'utf8');

test('mortgage reference demo is exposed as a read-only governed surface',async()=>{
  const [html,app]=await Promise.all([read('index.html'),read('app.js')]);
  for(const expected of [
    'id="mortgage-demo"',
    'Mortgage reference demo',
    'without making a credit decision',
    'Protected-class audit data and age are excluded',
    'id="rerun-mortgage-demo"',
    'id="mortgage-workbook-input"',
    'Download controlled template',
    'Restore built-in fixture'
  ]) assert.ok(html.includes(expected),expected);
  for(const expected of [
    "from './mortgage-fixture.mjs'",
    "from './mortgage-model.mjs'",
    "from './mortgage-import.mjs'",
    'renderMortgageDemo',
    'wireMortgageDemo'
  ]) assert.ok(app.includes(expected),expected);
});

test('mortgage demo contains no editable case-entry controls or decision actions',async()=>{
  const html=await read('index.html');
  const section=html.split('<section id="mortgage-demo"')[1]?.split('</section>')[0]??'';
  assert.ok(section,'mortgage demo section');
  assert.equal(/<(textarea|select)\b/i.test(section),false);
  const inputs=[...section.matchAll(/<input\b([^>]*)>/gi)].map(match=>match[1]);
  assert.deepEqual(inputs.map(attributes=>attributes.match(/type="([^"]+)"/i)?.[1]),['file']);
  assert.equal(/>\s*(approve|deny|price|waive)\s*</i.test(section),false);
});

test('the canonical render lifecycle initializes the mortgage demonstrator exactly once',async()=>{
  const app=await read('app.js');
  assert.equal((app.match(/function renderAll\(\)/g)||[]).length,1,'duplicate renderAll declarations can suppress mortgage initialization');
  assert.match(app,/function renderAll\(\)\{[^}]*renderMortgageDemo\(\)/,'canonical renderAll must initialize the mortgage demonstrator');
});
