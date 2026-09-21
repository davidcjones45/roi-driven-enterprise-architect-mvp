import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const app = readFileSync(new URL('./app.js', import.meta.url), 'utf8');

test('Release 5 gives each synthetic reference case a distinct purpose and route', () => {
  const cases = [
    ['General ROI-EA example', 'data-reference-workspace="roi" data-reference-view="overview"'],
    ['Federated Healthcare method example', 'data-reference-workspace="federated" data-reference-view="federated"'],
    ['Mortgage regulatory-control example', 'data-reference-workspace="mortgage" data-reference-view="mortgage-demo"'],
  ];

  assert.match(html, /REFERENCE-CASE ORIENTATION/);
  for (const [label, route] of cases) {
    assert.ok(html.includes(label), `missing orientation label: ${label}`);
    assert.ok(html.includes(route), `missing orientation route: ${route}`);
  }
  assert.match(html, /does not establish a real-world result, authority, compliance determination, or implementation/);
  assert.ok(
    app.includes("$$('[data-reference-view]').forEach(button=>button.addEventListener('click',()=>{ show(button.dataset.referenceView); }))"),
    'reference-case buttons route through guarded show(view)'
  );
  assert.ok(
    app.includes("const workspace=workspaceForView(view); if(workspace!==activeWorkspace) setWorkspace(workspace,false);") ,
    'show(view) derives and activates the workspace for the selected reference view'
  );
});
