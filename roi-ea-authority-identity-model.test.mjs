import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizePrincipal,
  normalizeMachineIdentity,
  machineIdentityEffectiveState,
  normalizeTechnicalPermission,
  technicalPermissionEffectiveState,
  compareTechnicalPermissionToAuthority,
  validateDelegatedActionContext,
  delegatedActionAuditRecord
} from './roi-ea-authority-identity-model.mjs';

const authority = {
  id:'AE-ROUTE',
  effectiveDate:'2026-10-01',
  reviewDate:'2026-12-31',
  status:'Active',
  actions:[{id:'ACT-READ',label:'Read approved records'},{id:'ACT-RANK',label:'Rank eligible options'}],
  resources:[{id:'RES-CASE',label:'Approved case record'}],
  relationships:[],
  evidenceRequirements:[],
  decisionHistory:[]
};

const principal = {
  id:'PRINCIPAL-OPS',
  type:'ORGANIZATION',
  name:'Operations'
};

const identity = {
  id:'MID-ROUTE',
  type:'WORKLOAD',
  actorId:'AGT-ROUTE',
  ownerId:'ROLE-IDENTITY-OWNER',
  deploymentIds:['DEP-ROUTE-1'],
  credentialRefs:['CRED-1'],
  effectiveFrom:'2026-10-01T00:00:00Z'
};

const delegation = {
  id:'DLG-ROUTE',
  delegatorId:'PRINCIPAL-OPS',
  delegateId:'AGT-ROUTE',
  sourceAuthorityId:'AE-ROUTE',
  permittedActions:['ACT-READ','ACT-RANK'],
  prohibitedActions:[],
  effectiveFrom:'2026-10-01T00:00:00Z'
};

const permission = {
  id:'PER-ROUTE',
  grantorSubjectId:'PRINCIPAL-OPS',
  holderParticipantId:'AGT-ROUTE',
  purpose:'Review support',
  permittedDataActions:['ACT-READ','ACT-RANK'],
  effectiveFrom:'2026-10-01T00:00:00Z'
};

const technical = {
  id:'TP-ROUTE',
  machineIdentityId:'MID-ROUTE',
  actionIds:['ACT-READ','ACT-RANK'],
  resourceIds:['RES-CASE'],
  effectiveFrom:'2026-10-01T00:00:00Z'
};

const context = {
  id:'CTX-1',
  principalId:'PRINCIPAL-OPS',
  actorId:'AGT-ROUTE',
  machineIdentityId:'MID-ROUTE',
  delegationId:'DLG-ROUTE',
  authorityId:'AE-ROUTE',
  permissionId:'PER-ROUTE',
  technicalPermissionId:'TP-ROUTE',
  actionId:'ACT-RANK',
  resourceIds:['RES-CASE'],
  asOfTime:'2026-10-15T00:00:00Z'
};

test('principal and machine identity remain distinct governed records', () => {
  const p=normalizePrincipal(principal);
  const m=normalizeMachineIdentity(identity);
  assert.notEqual(p.id,m.id);
  assert.equal(m.actorId,'AGT-ROUTE');
});

test('authentication/effective machine identity does not itself authorize action', () => {
  assert.equal(machineIdentityEffectiveState(identity,'2026-10-15T00:00:00Z'),'EFFECTIVE');
  const result=validateDelegatedActionContext({
    context:{...context,authorityId:'MISSING'},
    principal,machineIdentity:identity,delegation,authorityEnvelope:authority,permission,technicalPermission:technical
  });
  assert.equal(result.valid,false);
  assert.equal(result.authenticationCreatesAuthorization,false);
  assert.equal(result.createsAuthority,false);
});

test('aligned principal, delegation, authority, permission, machine identity and technical permission passes', () => {
  const result=validateDelegatedActionContext({
    context,principal,machineIdentity:identity,delegation,
    authorityEnvelope:authority,permission,technicalPermission:technical
  });
  assert.equal(result.status,'PASS');
  assert.equal(result.machineIdentityIsPrincipal,false);
  assert.equal(result.technicalPermissionCreatesAuthority,false);
  assert.equal(result.accountabilityTransferred,false);
});

test('technical permission broader than authority is flagged but does not expand authority', () => {
  const broader={...technical,actionIds:['ACT-READ','ACT-RANK','ACT-PAY']};
  const comparison=compareTechnicalPermissionToAuthority({technicalPermission:broader,authorityEnvelope:authority});
  assert.deepEqual(comparison.excessActionIds,['ACT-PAY']);
  assert.equal(comparison.authorityExpandedByTechnicalPermission,false);
});

test('authority broader than technical permission is an implementation shortfall, not an authority reduction', () => {
  const narrower={...technical,actionIds:['ACT-READ']};
  const comparison=compareTechnicalPermissionToAuthority({technicalPermission:narrower,authorityEnvelope:authority});
  assert.deepEqual(comparison.unavailableGovernedActionIds,['ACT-RANK']);
  assert.equal(comparison.authorityReducedByTechnicalPermission,false);
});

test('revoked machine identity is not effective', () => {
  const revoked={...identity,revokedAt:'2026-10-10T00:00:00Z'};
  assert.equal(machineIdentityEffectiveState(revoked,'2026-10-15T00:00:00Z'),'REVOKED');
});

test('revoked technical permission is not effective and creates no authority', () => {
  const revoked={...technical,revokedAt:'2026-10-10T00:00:00Z'};
  assert.equal(technicalPermissionEffectiveState(revoked,'2026-10-15T00:00:00Z'),'REVOKED');
  assert.equal(normalizeTechnicalPermission(revoked).createsAuthority,false);
});

test('suspended authority blocks action even while credentials and permissions remain effective', () => {
  const suspended={
    ...authority,
    decisionHistory:[{
      id:'DEC-SUS',
      decisionType:'Suspend',
      decisionAuthority:'OPS',
      effectiveDate:'2026-10-10',
      resultingState:'Suspended'
    }]
  };
  const result=validateDelegatedActionContext({
    context,principal,machineIdentity:identity,delegation,
    authorityEnvelope:suspended,permission,technicalPermission:technical
  });
  assert.equal(result.valid,false);
  assert.equal(result.authorityState,'Suspended');
  assert.equal(result.machineIdentityState,'EFFECTIVE');
  assert.equal(result.technicalPermissionState,'EFFECTIVE');
});

test('expired authority review blocks governed action without revoking technical reach', () => {
  const expired={...authority,reviewDate:'2026-10-10'};
  const result=validateDelegatedActionContext({
    context,principal,machineIdentity:identity,delegation,
    authorityEnvelope:expired,permission,technicalPermission:technical
  });
  assert.equal(result.valid,false);
  assert.equal(result.authorityState,'Review required');
  assert.equal(result.technicalPermissionState,'EFFECTIVE');
});

test('delegation cannot identify principal as the executing machine actor', () => {
  const badIdentity={...identity,actorId:'PRINCIPAL-OPS'};
  const badDelegation={...delegation,delegateId:'PRINCIPAL-OPS'};
  const badContext={...context,actorId:'PRINCIPAL-OPS'};
  const result=validateDelegatedActionContext({
    context:badContext,principal,machineIdentity:badIdentity,delegation:badDelegation,
    authorityEnvelope:authority,permission,technicalPermission:technical
  });
  assert.equal(result.valid,false);
  assert.equal(result.machineIdentityIsPrincipal,true);
  assert.equal(result.issues.some(x=>x.includes('principal cannot be the executing machine actor')),true);
});

test('audit record attributes execution to machine actor without impersonating principal', () => {
  const validation=validateDelegatedActionContext({
    context,principal,machineIdentity:identity,delegation,
    authorityEnvelope:authority,permission,technicalPermission:technical
  });
  const audit=delegatedActionAuditRecord(validation,{
    authorityId:'AE-ROUTE',
    permissionId:'PER-ROUTE',
    technicalPermissionId:'TP-ROUTE',
    actionId:'ACT-RANK',
    resourceIds:['RES-CASE'],
    occurredAt:'2026-10-15T12:00:00Z',
    resultState:'Completed'
  });
  assert.equal(audit.principalId,'PRINCIPAL-OPS');
  assert.equal(audit.actorId,'AGT-ROUTE');
  assert.equal(audit.machineIdentityId,'MID-ROUTE');
  assert.equal(audit.principalPerformedAction,false);
  assert.equal(audit.machineActorPerformedAction,true);
  assert.equal(audit.createsAccountability,false);
});
