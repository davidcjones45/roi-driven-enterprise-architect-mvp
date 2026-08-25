import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const html=readFileSync(new URL('./index.html',import.meta.url),'utf8');
const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
const helper=readFileSync(new URL('./presentation-readiness.mjs',import.meta.url),'utf8');
const styles=readFileSync(new URL('./styles.css',import.meta.url),'utf8');

test('presentation readiness shows qualified summaries before detailed federated and mortgage material',()=>{
  for(const label of ['FOFA / OPPORTUNITY &amp; FORM','MCVSM / MEMBER &amp; COLLECTIVE VALUE','FACEM / AUTHORITY, COMMITMENT &amp; EVIDENCE','BACRM / BOUNDED AI &amp; RECOVERY','INSUFFICIENT EVIDENCE; MANUAL EXCEPTION REVIEW CANDIDATE; ABSTAIN—ADVISORY TRACE ONLY']) assert.ok(html.includes(label),`missing ${label}`);
  assert.equal((html.match(/executive-summary/g)||[]).length>=5,true);
  assert.match(html,/View supporting alternatives and scores/);
  assert.match(html,/View calculation trace/);
  assert.match(html,/View regulatory-source register/);
  for(const label of ['View supporting alternatives and scores','View calculation trace','View regulatory-source register']){
    const index=html.indexOf(label);
    const opening=html.lastIndexOf('<details',index);
    assert.ok(opening>=0,`${label} is a native disclosure control`);
    assert.equal(/\bopen\b/.test(html.slice(opening,html.indexOf('>',opening))),false,`${label} defaults to collapsed`);
  }
  assert.match(styles,/advanced-disclosure>summary::after/);
  assert.equal(html.includes('>+<'),false,'no standalone stray plus glyph is rendered');
});

test('presentation readiness uses one calculation source for on-screen and exported authority status',()=>{
  assert.match(app,/authorityDossierSnapshot\(ae,authorityAsOf\)/);
  assert.match(app,/Effective-authority evaluation date/);
  assert.match(app,/Calculated effective-authority state/);
  assert.match(app,/Current permitted operation/);
  assert.match(app,/\$\('#dossier-summary'\)\.innerHTML/);
});

test('ERIR panels distinguish retrieval state instead of treating configuration as success',()=>{
  assert.equal((html.match(/data-erir-status-panel/g)||[]).length,2);
  assert.match(helper,/CONFIGURED \/ NOT ATTEMPTED/);
  assert.match(helper,/ZERO RECORDS RETURNED/);
  assert.match(helper,/PARTIAL RETURN/);
  assert.match(helper,/COMPLETE RETURN/);
  assert.match(helper,/Retrieval verifies only that a read-only record was returned/);
});
