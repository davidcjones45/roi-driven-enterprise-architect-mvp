import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeAuthority } from './authority-model.mjs';
import { authorityDossierSnapshot, erirRetrievalStatus } from './presentation-readiness.mjs';

const authority=normalizeAuthority({id:'AE-TEST',status:'Active - controlled pilot',decision:'Authorize',decisionDate:'2026-10-20',effectiveDate:'2026-10-20',reviewDate:'2026-12-18',permittedActions:'Read approved records.',evidenceAssessmentState:'not assessed',evidenceValidFrom:'2026-10-20',evidenceValidUntil:'2026-12-18'});

test('presentation dossier separates stored authority label from calculated as-of authority', () => {
  const pre=authorityDossierSnapshot(authority,'2026-10-15');
  assert.equal(pre.storedLifecycleLabel,'Active - controlled pilot');
  assert.equal(pre.effectiveState,'Not yet effective');
  assert.equal(pre.evidenceAssessmentState,'not assessed');
  assert.equal(pre.permittedOperation,'No current operating authority under this envelope.');
  assert.equal(authorityDossierSnapshot({...authority,status:'Suspended'},'2026-10-20').effectiveState,'Suspended');
  const accepted={...authority,evidenceRequirements:[{...authority.evidenceRequirements[0],assessmentState:'accepted'}]};
  assert.equal(authorityDossierSnapshot({...accepted,reviewDate:'2026-10-19'},'2026-10-21').effectiveState,'Review required');
  assert.equal(authorityDossierSnapshot({...accepted,evidenceRequirements:[{...accepted.evidenceRequirements[0],assessmentState:'not assessed'}]},'2026-10-20').effectiveState,'Evidence unresolved');
});

test('ERIR status makes configuration, retrieval, and partial results distinct', () => {
  assert.equal(erirRetrievalStatus().state,'NOT CONFIGURED');
  assert.equal(erirRetrievalStatus({configured:true}).state,'CONFIGURED / NOT ATTEMPTED');
  assert.equal(erirRetrievalStatus({configured:true,attempted:true,error:'offline'}).state,'UNAVAILABLE');
  assert.equal(erirRetrievalStatus({configured:true,attempted:true,requestedIds:['A']}).state,'ZERO RECORDS RETURNED');
  assert.equal(erirRetrievalStatus({configured:true,attempted:true,requestedIds:['A','B'],returnedIds:['A'],missingIds:['B']}).state,'PARTIAL RETURN');
  assert.equal(erirRetrievalStatus({configured:true,attempted:true,requestedIds:['A'],returnedIds:['A']}).state,'COMPLETE RETURN');
});
