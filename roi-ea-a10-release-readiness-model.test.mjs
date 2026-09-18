import assert from 'node:assert/strict';
import test from 'node:test';
import {
  RELEASE_GATE_IDS,
  TRACEABILITY_SUMMARY_POST_A9,
  evaluateTraceabilityGate,
  evaluateControlledReleaseReadiness,
  applyReleaseDecision
} from './roi-ea-a10-release-readiness-model.mjs';

test('A10 release gate covers the nine explicit release-evidence domains',()=>{
  assert.equal(RELEASE_GATE_IDS.length,9);
  assert.deepEqual(RELEASE_GATE_IDS,[
    'SOURCE_BASELINE','TRACEABILITY','FULL_REGRESSION','NORTH_STAR_END_TO_END',
    'ACCESSIBILITY_REVIEW','BROWSER_SMOKE','MIGRATION_RECOVERY',
    'EXECUTIVE_DOSSIER','BPMN_READ_ONLY_BOUNDARY'
  ]);
});

test('post-A9 traceability summary preserves known limitations rather than claiming perfection',()=>{
  assert.equal(TRACEABILITY_SUMMARY_POST_A9.requirements,36);
  assert.equal(TRACEABILITY_SUMMARY_POST_A9.strong,30);
  assert.equal(TRACEABILITY_SUMMARY_POST_A9.partialStrong,5);
  assert.equal(TRACEABILITY_SUMMARY_POST_A9.gaps,1);
  assert.deepEqual(TRACEABILITY_SUMMARY_POST_A9.knownGapIds,['T36']);
});

test('traceability remains incomplete until known gap has explicit bounded disposition',()=>{
  const result=evaluateTraceabilityGate();
  assert.equal(result.status,'INCOMPLETE');
  assert.deepEqual(result.undispositionedKnownGapIds,['T36']);
});

test('known non-P0 gap can be dispositioned without creating implementation or risk acceptance',()=>{
  const result=evaluateTraceabilityGate({acceptedKnownGapIds:['T36']});
  assert.equal(result.status,'PASS');
  assert.equal(result.gapAcceptanceCreatesImplementationApproval,false);
  assert.equal(result.gapAcceptanceCreatesRiskAcceptance,false);
});

test('release readiness remains not ready while runtime evidence gates are not run',()=>{
  const result=evaluateControlledReleaseReadiness({
    traceability:{acceptedKnownGapIds:['T36']}
  });
  assert.equal(result.status,'NOT_READY');
  assert.equal(result.autoRelease,false);
  assert.equal(result.releaseDecision,null);
});

test('all passing evidence gates produce readiness for a decision, not an automatic release',()=>{
  const gateEvidence=RELEASE_GATE_IDS
    .filter(id=>id!=='TRACEABILITY')
    .map(id=>({id,state:'PASS',evidenceIds:[`EVD-${id}`],reviewerId:'REV-1'}));
  const result=evaluateControlledReleaseReadiness({
    gateEvidence,
    traceability:{acceptedKnownGapIds:['T36'],evidenceIds:['EVD-TRACE']}
  });
  assert.equal(result.status,'READY_FOR_CONTROLLED_RELEASE_DECISION');
  assert.equal(result.evidenceReady,true);
  assert.equal(result.releaseAuthorized,false);
  assert.equal(result.productionUseAuthorized,false);
  assert.equal(result.riskAccepted,false);
  assert.equal(result.autoRelease,false);
});

test('a failed gate blocks controlled release readiness',()=>{
  const gateEvidence=RELEASE_GATE_IDS
    .filter(id=>id!=='TRACEABILITY')
    .map(id=>({id,state:id==='BROWSER_SMOKE'?'FAIL':'PASS'}));
  const result=evaluateControlledReleaseReadiness({
    gateEvidence,
    traceability:{acceptedKnownGapIds:['T36']}
  });
  assert.equal(result.status,'BLOCKED');
  assert.deepEqual(result.failedGateIds,['BROWSER_SMOKE']);
});

test('accountable release decision is separate from evidence readiness',()=>{
  const gateEvidence=RELEASE_GATE_IDS
    .filter(id=>id!=='TRACEABILITY')
    .map(id=>({id,state:'PASS'}));
  const readiness=evaluateControlledReleaseReadiness({
    gateEvidence,
    traceability:{acceptedKnownGapIds:['T36']}
  });

  assert.equal(applyReleaseDecision(readiness,{}).status,'AWAITING_ACCOUNTABLE_RELEASE_DECISION');

  const result=applyReleaseDecision(readiness,{
    id:'REL-DEC-1',
    disposition:'APPROVE_CONTROLLED_RELEASE',
    decisionOwnerId:'OWNER-1',
    authorityId:'AUTH-REL',
    effectiveTime:'2026-09-18T06:30:00Z',
    productionUseAuthorized:false,
    riskAccepted:false
  });
  assert.equal(result.status,'CONTROLLED_RELEASE_APPROVED');
  assert.equal(result.controlledReleaseApproved,true);
  assert.equal(result.productionUseAuthorized,false);
  assert.equal(result.autoRelease,false);
});
