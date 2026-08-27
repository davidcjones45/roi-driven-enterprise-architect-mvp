import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const app = readFileSync(new URL('./app.js', import.meta.url), 'utf8');
const server = readFileSync(new URL('./serve-roi-ea.py', import.meta.url), 'utf8');

test('consulting workspace is opt-in and hidden from public browser-local operation', () => {
  assert.match(html, /id="consulting-workspace-switch" hidden/);
  assert.match(html, /data-workspace="consulting" data-view="engagements" hidden/);
  assert.match(html, /data-workspace="consulting" data-view="discovery" hidden/);
  assert.match(html, /data-workspace="consulting" data-view="engagement-evidence" hidden/);
  assert.match(html, /data-workspace="consulting" data-view="ai-necessity" hidden/);
  assert.match(html, /data-workspace="consulting" data-view="findings-questions" hidden/);
  assert.match(html, /data-workspace="consulting" data-view="recommendation" hidden/);
  assert.match(html, /data-workspace="consulting" data-view="executive-package" hidden/);
  assert.match(html, /data-workspace="consulting" data-view="snapshots" hidden/);
  assert.match(html, /id="engagement-form"/);
  assert.match(html, /id="discovery-form"/);
  assert.match(html, /src="app\.js\?v=fedarm-snapshots-v0\.1"/);
  assert.match(app, /new URLSearchParams\(window\.location\.search\)\.get\('mode'\) === 'consulting'/);
  assert.match(app, /\['localhost','127\.0\.0\.1'\]\.includes\(window\.location\.hostname\)/);
  assert.match(app, /switcher\.hidden=!consultingMode;navigation\.forEach\(link=>link\.hidden=!consultingMode\)/);
});

test('local engagement API is loopback-only and has no delete path', () => {
  assert.match(server, /ThreadingHTTPServer\(\("127\.0\.0\.1", PORT\)/);
  assert.match(server, /def do_DELETE\(self\):\n\s+self\.send_json\(405, \{"error": "Deletion is not available\. Archive an engagement instead\."\}\)/);
  assert.match(server, /"\/api\/engagements\/import"/);
  assert.match(server, /"\/api\/engagements\/"/);
});

test('engagement UI uses only same-origin local API routes and retains a separate ROI-EA reference', () => {
  assert.match(app, /localEngagementRequest\('\/api\/engagements'\)/);
  assert.match(app, /roi_ea_workspace_reference:KEY/);
  assert.match(app, /Deletion is unavailable\. Archive a record instead/);
  assert.match(app, /\/api\/engagements\/import/);
  assert.match(app, /\/export/);
  assert.match(app, /\/discovery/);
  assert.match(html, /Copy selected intake to ROI-EA opportunity/);
});

test('Discovery view rerenders after local engagement retrieval and when selected from navigation', () => {
  assert.match(app, /engagements=result\.engagements\|\|\[\];renderEngagements\(\);renderDiscovery\(\);/);
  assert.match(app, /if\(view==='discovery'\) renderDiscovery\(\);/);
  assert.match(app, /fields\.innerHTML=discoveryFieldMarkup\(normalizeDiscovery\(engagement\.discovery\)\)/);
});

test('each local engagement has a direct structured-discovery route independent of sidebar scrolling', () => {
  assert.match(app, /class="open-discovery secondary"/);
  assert.match(app, /openEngagement\(button\.dataset\.engagementId,'discovery'\)/);
  assert.match(app, /async function openEngagement\(id, destination='engagements'\)/);
});

test('engagement evidence register is local metadata only and preserves qualified review boundaries', () => {
  assert.match(html, /Files are not uploaded or analyzed in this local register/);
  assert.match(app, /Document supply is not validation/);
  assert.match(app, /\/evidence/);
  assert.match(app, /Local evidence metadata appended; qualified review remains separate/);
  assert.match(app, /openEngagement\(button\.dataset\.engagementId,'engagement-evidence'\)/);
});

test('AI necessity gate records bounded review inputs without recommending or authorizing AI', () => {
  assert.match(html, /id="ai-necessity-form"/);
  assert.match(html, /This gate does not recommend, authorize, select, or release AI/);
  assert.match(app, /\/ai-necessity/);
  assert.match(app, /const gate=aiNecessityAssessment\(engagement\.ai_necessity\);/);
  assert.match(app, /openEngagement\(button\.dataset\.engagementId,'ai-necessity'\)/);
});

test('findings and questions remain qualified review inputs rather than conclusions or hidden assumptions', () => {
  assert.match(html, /id="finding-form"/);
  assert.match(html, /id="open-question-form"/);
  assert.match(html, /They do not establish authority, legal applicability, compliance, control effectiveness, an architecture decision, or an implementation recommendation/);
  assert.match(app, /\/findings/);
  assert.match(app, /\/questions/);
  assert.match(app, /openEngagement\(button\.dataset\.engagementId,'findings-questions'\)/);
  assert.match(html, /A question is not an assumption/);
});

test('recommendation is consultant-entered, versioned, and cannot become authority through readiness', () => {
  assert.match(html, /id="recommendation-form"/);
  assert.match(html, /The system will not choose this option/);
  assert.match(app, /recommendationReadiness\(engagement\)/);
  assert.match(app, /\/recommendation/);
  assert.match(app, /open-recommendation/);
  assert.match(app, /does not select a recommendation or grant implementation authority/);
  assert.match(server, /record_recommendation/);
});

test('executive package is a current-state print-ready output and not an engagement snapshot', () => {
  assert.match(html, /id="executive-package"/);
  assert.match(html, /not an R8 snapshot/);
  assert.match(app, /buildExecutiveDecisionPackage/);
  assert.match(app, /openExecutivePackagePrint/);
  assert.match(app, /downloadExecutivePackageHtml/);
  assert.match(app, /open-executive-package/);
});

test('recommendation issuance requests an immutable local snapshot and exposes no snapshot overwrite control', () => {
  assert.match(app, /recommendation-and-snapshot/);
  assert.match(app, /renderSnapshots/);
  assert.match(html, /Engagement snapshots/);
  assert.match(html, /Content SHA-256/);
  assert.doesNotMatch(html, /Overwrite snapshot/);
});
