import assert from 'node:assert/strict';
import test from 'node:test';
import {
  deriveThreeAxisState,
  routeMaterialChange,
  evaluateResumption
} from './roi-ea-lifecycle-state-model.mjs';

const events = [
  { id:'INV-1', subjectId:'INIT-1', axis:'investment', state:'COMMITTED', effectiveTime:'2026-10-01T00:00:00Z' },
  { id:'EXE-1', subjectId:'INIT-1', axis:'execution', state:'OPERATIONAL', effectiveTime:'2026-10-02T00:00:00Z' },
  { id:'AUT-1', subjectId:'INIT-1', axis:'authority', state:'ACTIVE', effectiveTime:'2026-10-03T00:00:00Z' },
  { id:'AUT-2', subjectId:'INIT-1', axis:'authority', state:'SUSPENDED', effectiveTime:'2026-10-10T00:00:00Z' }
];

test('investment, execution, and authority states remain independent', () => {
  const state = deriveThreeAxisState(events,'INIT-1','2026-10-11T00:00:00Z');
  assert.equal(state.investment.state,'COMMITTED');
  assert.equal(state.execution.state,'OPERATIONAL');
  assert.equal(state.authority.state,'SUSPENDED');
});

test('conflicting same-effective-time states remain unresolved', () => {
  const conflict = [...events,
    { id:'AUT-3', subjectId:'INIT-1', axis:'authority', state:'ACTIVE', effectiveTime:'2026-10-10T00:00:00Z' }
  ];
  const state = deriveThreeAxisState(conflict,'INIT-1','2026-10-11T00:00:00Z');
  assert.equal(state.authority.state,'UNRESOLVED');
  assert.equal(state.authority.issues.length,1);
});

test('material change reopens only explicitly identified boundaries', () => {
  const routed = routeMaterialChange({
    id:'CHG-1',
    subjectId:'AICAP-1',
    changeType:'TOOL_ACCESS',
    effectiveTime:'2026-10-12T00:00:00Z',
    explicitlyAffectedBoundaryIds:['AACM-AICAP-1','AE-AICAP-1']
  });
  assert.equal(routed.status,'REASSESSMENT_REQUIRED');
  assert.deepEqual(routed.reopenBoundaryIds,['AACM-AICAP-1','AE-AICAP-1']);
  assert.equal(routed.aacmReclassificationCandidate,true);
  assert.equal(routed.propagationInferred,false);
});

test('technical recovery never auto-resumes authority', () => {
  const noDecision = evaluateResumption({
    technicalRecoveryEstablished:true,
    authorityState:'SUSPENDED'
  });
  assert.equal(noDecision.status,'READY_FOR_RESUMPTION_DECISION');
  assert.equal(noDecision.authorizedResumption,false);
  assert.equal(noDecision.autoResumed,false);

  const authorized = evaluateResumption({
    technicalRecoveryEstablished:true,
    authorityState:'SUSPENDED',
    resumptionDecision:{
      disposition:'REACTIVATE',
      decisionOwnerId:'OWNER-1',
      authorityId:'AE-1',
      effectiveTime:'2026-10-13T00:00:00Z'
    }
  });
  assert.equal(authorized.status,'AUTHORIZED_RESUMPTION');
  assert.equal(authorized.authorizedResumption,true);
  assert.equal(authorized.autoResumed,false);
});

test('revoked authority cannot be resumed by a recovery decision', () => {
  const result = evaluateResumption({
    technicalRecoveryEstablished:true,
    authorityState:'REVOKED',
    resumptionDecision:{
      disposition:'REACTIVATE',
      decisionOwnerId:'OWNER-1',
      authorityId:'AE-1',
      effectiveTime:'2026-10-13T00:00:00Z'
    }
  });
  assert.equal(result.authorizedResumption,false);
  assert.equal(result.status,'RESUMPTION_NOT_AUTHORIZED');
});
