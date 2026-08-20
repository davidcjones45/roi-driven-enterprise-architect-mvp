import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeAuthority, appendDecision, effectiveAuthorityState, erirImpact, getAuthorityPortfolio, getAuthorityExceptions, getActiveAuthorityEvidenceExceptions } from './authority-model.mjs';

const root = new URL('.', import.meta.url);
const html = fs.readFileSync(new URL('index.html', root), 'utf8');
const app = fs.readFileSync(new URL('app.js', root), 'utf8');
const architecture = fs.readFileSync(new URL('AI_AUTHORITY_EVIDENCE_ARCHITECTURE.md', root), 'utf8');
const base = {id:'AE-1',aiSystem:'Preparation assistant',businessCapability:'Scheduling',authorityOwner:'Maya',status:'Active - controlled pilot',effectiveDate:'2026-10-20',reviewDate:'2026-12-18',permittedActions:'Read records; Draft summary',resourceScope:'Approved records',inventoryRefs:'Scheduling Hub; Missing API',erirControlId:'CTL-1',erirEvidenceId:'EVD-1',evidenceArtifactIds:'EVD-1',evidenceRequirement:'Security review',acceptanceCriterion:'Qualified reviewer accepts current review',evidenceAssessmentState:'not assessed',evidenceValidFrom:'2026-10-20',evidenceValidUntil:'2026-12-18',decision:'Authorize',decisionDate:'2026-10-20'};
const authority = normalizeAuthority(base,{inventory:[{name:'Scheduling Hub'}],knownErirIds:['CTL-1','EVD-1']});

// Stable identities, typed links, and explicit unresolved references.
assert.equal(authority.aiSystemId,'AIS-PREPARATION-ASSISTANT');
assert.equal(authority.actions[0].id,'ACT-READ-RECORDS');
assert.equal(authority.relationships.some(x=>x.relationshipType==='permits_action'),true);
assert.equal(authority.relationships.find(x=>x.rationale==='Missing API').resolutionState,'unresolved');
assert.equal(authority.relationships.find(x=>x.targetId==='EVD-1').relationshipType,'supported_by_evidence');

// Existing evidence is not sufficient until an assessment is accepted and valid.
assert.equal(effectiveAuthorityState(authority,'2026-08-13').state,'Not yet effective');
assert.equal(effectiveAuthorityState(authority,'2026-10-21').state,'Evidence unresolved');
const accepted = structuredClone(authority); accepted.evidenceRequirements[0].assessmentState='accepted';
assert.equal(effectiveAuthorityState(accepted,'2026-10-21').state,'Review required'); // unresolved inventory remains explicit
accepted.relationships.forEach(x=>x.resolutionState='resolved');
assert.equal(effectiveAuthorityState(accepted,'2026-10-21').state,'Effective — controlled authority');
assert.equal(effectiveAuthorityState(accepted,'2026-12-19').state,'Evidence unresolved');

// Lifecycle history is append-only and changes calculated state deterministically.
const suspended=appendDecision(accepted,{decision:'Suspend',decisionAuthority:'Maya',decisionDate:'2026-11-01',rationale:'Guardrail event',resultingState:'Suspended'});
assert.equal(suspended.decisionHistory.length,1);
assert.equal(effectiveAuthorityState(suspended,'2026-11-02').state,'Suspended');
const revoked=appendDecision(suspended,{decision:'Revoke',decisionAuthority:'Maya',decisionDate:'2026-11-10',rationale:'Stop',resultingState:'Revoked'});
assert.equal(revoked.decisionHistory.length,2);
assert.equal(effectiveAuthorityState(revoked,'2026-11-11').state,'Revoked');

// Direct and transitive ERIR impact identify review needs, not automatic noncompliance.
assert.equal(erirImpact([accepted],'CTL-1',{}).at(0).impact,'Directly linked');
const transitive = structuredClone(accepted); transitive.relationships=transitive.relationships.filter(x=>x.targetId!=='CTL-1' && x.targetId!=='EVD-1'); transitive.relationships.push({targetId:'EVD-9',relationshipType:'supported_by_evidence',resolutionState:'resolved'});
const impacted=erirImpact([transitive],'SRC-9',{'SRC-9':['OBL-9'],'OBL-9':['CTL-9'],'CTL-9':['EVD-9']});
assert.equal(impacted.at(0).impact,'Transitively affected');
assert.match(impacted.at(0).reviewMessage,/Review required/);

// A portfolio is a local collection: each normalized record remains independent.
const current = structuredClone(accepted); current.id='AE-CURRENT'; current.effectiveDate='2026-08-01'; current.reviewDate='2026-12-31'; current.evidenceRequirements[0].validFrom='2026-08-01'; current.evidenceRequirements[0].validUntil='2026-12-31';
const approaching = structuredClone(current); approaching.id='AE-APPROACHING'; approaching.evidenceRequirements[0].validUntil='2026-09-05';
const missing = structuredClone(current); missing.id='AE-MISSING'; missing.evidenceRequirements[0].assessmentState='missing'; missing.evidenceRequirements[0].artifactReferences=[];
const notAssessed = structuredClone(current); notAssessed.id='AE-NOT-ASSESSED'; notAssessed.evidenceRequirements[0].assessmentState='not assessed';
const rejected = structuredClone(current); rejected.id='AE-REJECTED'; rejected.evidenceRequirements[0].assessmentState='rejected';
const expired = structuredClone(current); expired.id='AE-EXPIRED-EVIDENCE'; expired.evidenceRequirements[0].validUntil='2026-08-01';
const superseded = structuredClone(current); superseded.id='AE-SUPERSEDED'; superseded.evidenceRequirements[0].assessmentState='superseded';
const unresolved = structuredClone(current); unresolved.id='AE-UNRESOLVED'; unresolved.relationships.find(x=>x.targetId==='EVD-1').resolutionState='unresolved';
const authorityReviewSoon = structuredClone(current); authorityReviewSoon.id='AE-REVIEW-SOON'; authorityReviewSoon.reviewDate='2026-09-01';
const collection=[current,approaching,missing,notAssessed,rejected,expired,superseded,unresolved,authorityReviewSoon];
assert.equal(new Set(collection.map(x=>x.id)).size,collection.length);
assert.equal(effectiveAuthorityState(current,'2026-08-13').state,'Effective — controlled authority');
assert.match(getAuthorityExceptions([missing],'2026-08-13').at(0).evidenceExceptions.join(' '),/missing/);
assert.match(getAuthorityExceptions([notAssessed],'2026-08-13').at(0).evidenceExceptions.join(' '),/not assessed/);
assert.match(getAuthorityExceptions([rejected],'2026-08-13').at(0).evidenceExceptions.join(' '),/rejected/);
assert.match(getAuthorityExceptions([expired],'2026-08-13').at(0).evidenceExceptions.join(' '),/expired/);
assert.match(getAuthorityExceptions([superseded],'2026-08-13').at(0).evidenceExceptions.join(' '),/superseded/);
assert.match(getAuthorityExceptions([unresolved],'2026-08-13').at(0).evidenceExceptions.join(' '),/unresolved/);
assert.match(getAuthorityExceptions([approaching],'2026-08-13').at(0).evidenceExceptions.join(' '),/within 30 days/);
assert.match(getAuthorityExceptions([authorityReviewSoon],'2026-08-13').at(0).evidenceExceptions.join(' '),/Authority Envelope requires review within 30 days/);
assert.deepEqual(getActiveAuthorityEvidenceExceptions(collection,'2026-08-13').map(x=>x.authority.id).sort(),['AE-APPROACHING','AE-REVIEW-SOON']);
assert.equal(getAuthorityPortfolio([current],'2026-08-13').at(0).calculated.state,'Effective — controlled authority');
assert.equal(getAuthorityPortfolio([current],'2027-01-01').at(0).calculated.state,'Evidence unresolved');
assert.equal(getAuthorityPortfolio([current],'2026-07-31').at(0).calculated.state,'Not yet effective');
// Legacy records are normalized without changing the retained human-readable fields.
assert.equal(normalizeAuthority({aiSystem:'Legacy assistant',businessCapability:'Legacy capability'}).aiSystem,'Legacy assistant');

for (const field of ['aiSystemId','actionIds','resourceIds','evidenceRequirement','acceptanceCriterion','evidenceAssessmentState']) assert.ok(html.includes(`name="${field}"`));
for (const expected of ['effectiveAuthorityState','erirImpact','getAuthorityPortfolio','authorityEnvelopes','rawAuthorityRecords','authority-record-selector']) assert.ok(app.includes(expected));
for (const expected of ['ERIR remains authoritative','No ERIR schema change is required']) assert.ok(architecture.includes(expected));
console.log('Queryable Authority & Evidence vertical-slice checks passed.');
