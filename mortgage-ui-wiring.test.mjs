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
    'Restore built-in fixture',
    'id="execute-mortgage-integration"',
    'ROI-EA → ERIR → FACEM → BACRM',
    'id="download-mortgage-trace"'
    ,'id="analyze-mortgage-bpmn"'
    ,'id="mortgage-bpmn-input"'
    ,'Download reference BPMN'
    ,'without executing the workflow'
    ,'id="bpmn-standards-review"'
    ,'id="commit-bpmn-review"'
    ,'id="bpmn-diagram-canvas"'
    ,'Read-only source visualization'
    ,'id="bpmn-assessment-purpose"'
    ,'id="bpmn-customer-scope"'
    ,'id="bpmn-intake-state"'
    ,'id="bpmn-handoff-state"'
    ,'id="bpmn-handoff-candidates"'
    ,'id="bpmn-obligation-control-state"'
    ,'id="bpmn-obligation-control-candidates"'
    ,'Gate C — qualified obligation/control assessment'
    ,'Gate B — qualified handoff assessment'
  ]) assert.ok(html.includes(expected),expected);
  for(const expected of [
    "from './mortgage-fixture.mjs'",
    "from './mortgage-model.mjs'",
    "from './mortgage-import.mjs'",
    "from './mortgage-integration.mjs'",
    "from './mortgage-bpmn.mjs'",
    "from './bpmn-review-ui.mjs'",
    'renderMortgageDemo',
    'renderMortgageIntegration',
    'wireMortgageDemo'
  ]) assert.ok(app.includes(expected),expected);
  assert.ok((await read('bpmn-review-ui.mjs')).includes("from './bpmn-assessment-intake.mjs'"));
  assert.ok((await read('bpmn-review-ui.mjs')).includes("from './bpmn-assessment-handoff.mjs'"));
  assert.ok((await read('bpmn-review-ui.mjs')).includes("from './bpmn-assessment-obligation-control.mjs'"));
});

test('mortgage demo contains no editable case-entry controls or decision actions',async()=>{
  const html=await read('index.html');
  const section=html.split('<section id="mortgage-demo"')[1]?.split('</section>')[0]??'';
  assert.ok(section,'mortgage demo section');
  assert.equal(/<(textarea|select)\b/i.test(section),false);
  const inputs=[...section.matchAll(/<input\b([^>]*)>/gi)].map(match=>match[1]);
  assert.deepEqual(inputs.map(attributes=>attributes.match(/type="([^"]+)"/i)?.[1]),['file','file','file','text','text','text','text','checkbox']);
  assert.equal(/>\s*(approve|deny|price|waive)\s*</i.test(section),false);
});

test('legacy BPMN surface remains analytical while G4 adds explicit human review and commit',async()=>{
  const [html,app]=await Promise.all([read('index.html'),read('app.js')]);
  const section=html.split('<section id="mortgage-demo"')[1]?.split('</section>')[0]??'';
  for(const expected of ['is analytical','does not establish BPMN conformance','Prospective support point','Authority','Disposition']) assert.ok(section.includes(expected),expected);
  for(const expected of ['importMortgageBpmn','analyzeBoundedAiOpportunities','renderMortgageBpmn']) assert.ok(app.includes(expected),expected);
  assert.ok(section.includes('Parsing, structural validation, candidate review, and canonical commit are separate events.'));
  assert.ok(section.includes('I explicitly confirm this bounded canonical commit'));
  assert.equal(/id="(?:execute|deploy|approve)-mortgage-bpmn"/i.test(section),false);
});

test('G4 BPMN review UI renders imported labels as text and never injects source HTML',async()=>{
  const ui=await read('bpmn-review-ui.mjs');
  for(const expected of ['textContent','replaceChildren','reviewBpmnCandidate','commitAcceptedBpmnCandidates','exportBpmnImportReport','buildBpmnDiagramView','createElementNS']) assert.ok(ui.includes(expected),expected);
  assert.equal(/innerHTML\s*=/u.test(ui),false);
  assert.equal(/insertAdjacentHTML/u.test(ui),false);
});

test('BPMN diagram viewer retains its calculated native dimensions for readable scrolling',async()=>{
  const [ui,css]=await Promise.all([read('bpmn-review-ui.mjs'),read('styles.css')]);
  assert.match(ui,/viewBox: `0 0 \$\{diagram\.width\} \$\{diagram\.height\}`, width: diagram\.width, height: diagram\.height/u);
  assert.match(css,/\.bpmn-diagram-canvas\{[^}]*overflow:auto/u);
});

test('the canonical render lifecycle initializes the mortgage demonstrator exactly once',async()=>{
  const app=await read('app.js');
  assert.equal((app.match(/function renderAll\(\)/g)||[]).length,1,'duplicate renderAll declarations can suppress mortgage initialization');
  assert.match(app,/function renderAll\(\)\{[^}]*renderMortgageDemo\(\)/,'canonical renderAll must initialize the mortgage demonstrator');
});

test('upload UI enforces byte limits before browser file materialization',async()=>{
  const app=await read('app.js');
  const review=await read('bpmn-review-ui.mjs');
  assert.match(app,/file\.size>MAX_MORTGAGE_WORKBOOK_BYTES[\s\S]{0,240}file\.arrayBuffer\(\)/u);
  assert.match(app,/file\.size>MAX_MORTGAGE_BPMN_BYTES[\s\S]{0,240}file\.text\(\)/u);
  assert.match(review,/file\.size > BPMN_IMPORT_LIMITS\.maxBytes[\s\S]{0,300}file\.arrayBuffer\(\)/u);
});
