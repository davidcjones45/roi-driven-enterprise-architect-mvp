/**
 * ROI-Driven Enterprise Architect — A4 Authority & Identity foundation.
 *
 * Separates institutional principal, machine actor, technical machine identity,
 * governed authority, FACEM permission, and technical permission. Technical
 * reachability/authentication never creates permission or authority.
 */

import { effectiveAuthorityState } from './authority-model.mjs';
import {
  normalizeDelegation,
  validateDelegationAgainstAuthority,
  normalizePermission,
  permissionEffectiveState
} from './federated-facem-model.mjs';

const text = value => String(value ?? '').trim();
const list = value => Array.isArray(value) ? value : value == null ? [] : [value];
const unique = value => [...new Set(list(value).map(text).filter(Boolean))];
const iso = value => {
  const raw = text(value);
  if (!raw || Number.isNaN(Date.parse(raw))) return '';
  return new Date(raw).toISOString();
};
const atOrBefore = (value, asOf) => Boolean(iso(value) && iso(asOf) && iso(value) <= iso(asOf));

export const PRINCIPAL_TYPES = Object.freeze([
  'HUMAN','ORGANIZATION','ROLE','GOVERNING_BODY'
]);

export const MACHINE_IDENTITY_TYPES = Object.freeze([
  'WORKLOAD','SERVICE_ACCOUNT','MANAGED_IDENTITY','API_CLIENT','OTHER'
]);

export function normalizePrincipal(record = {}) {
  const type = text(record.type).toUpperCase();
  const errors = [];
  if (!text(record.id)) errors.push('principal id is required.');
  if (!PRINCIPAL_TYPES.includes(type)) errors.push('principal type is not recognized.');
  return {
    id:text(record.id),
    type,
    name:text(record.name),
    organizationId:text(record.organizationId),
    authorityEnvelopeIds:unique(record.authorityEnvelopeIds),
    accountabilityRefs:unique(record.accountabilityRefs),
    responsibilityRefs:unique(record.responsibilityRefs),
    status:text(record.status || 'Active'),
    errors
  };
}

export function normalizeMachineIdentity(record = {}) {
  const type = text(record.type).toUpperCase();
  const errors = [];
  if (!text(record.id)) errors.push('machine identity id is required.');
  if (!MACHINE_IDENTITY_TYPES.includes(type)) errors.push('machine identity type is not recognized.');
  if (!text(record.actorId)) errors.push('actorId is required.');
  if (!text(record.ownerId)) errors.push('machine identity ownerId is required.');
  if (!iso(record.effectiveFrom)) errors.push('effectiveFrom is required and must be valid.');
  return {
    id:text(record.id),
    type,
    actorId:text(record.actorId),
    ownerId:text(record.ownerId),
    deploymentIds:unique(record.deploymentIds),
    credentialRefs:unique(record.credentialRefs),
    authenticatorRefs:unique(record.authenticatorRefs),
    effectiveFrom:iso(record.effectiveFrom),
    effectiveTo:iso(record.effectiveTo),
    revokedAt:iso(record.revokedAt),
    status:text(record.status || 'Active'),
    errors
  };
}

export function machineIdentityEffectiveState(record = {}, asOfTime = '') {
  const item = normalizeMachineIdentity(record);
  if (item.errors.length || !iso(asOfTime)) return 'UNRESOLVED';
  if (item.revokedAt && atOrBefore(item.revokedAt,asOfTime)) return 'REVOKED';
  if (!atOrBefore(item.effectiveFrom,asOfTime)) return 'NOT_YET_EFFECTIVE';
  if (item.effectiveTo && iso(asOfTime) > item.effectiveTo) return 'EXPIRED';
  return 'EFFECTIVE';
}

/**
 * Technical permission is an implementation-side record describing what a
 * credential/runtime can technically do. It is not the institutional authority
 * or FACEM Permission itself.
 */
export function normalizeTechnicalPermission(record = {}) {
  const errors = [];
  if (!text(record.id)) errors.push('technical permission id is required.');
  if (!text(record.machineIdentityId)) errors.push('machineIdentityId is required.');
  if (!iso(record.effectiveFrom)) errors.push('effectiveFrom is required and must be valid.');
  return {
    id:text(record.id),
    machineIdentityId:text(record.machineIdentityId),
    actionIds:unique(record.actionIds),
    resourceIds:unique(record.resourceIds),
    toolIds:unique(record.toolIds),
    purpose:text(record.purpose),
    effectiveFrom:iso(record.effectiveFrom),
    effectiveTo:iso(record.effectiveTo),
    revokedAt:iso(record.revokedAt),
    sourceSystem:text(record.sourceSystem),
    evidenceIds:unique(record.evidenceIds),
    status:text(record.status || 'Active'),
    createsAuthority:false,
    errors
  };
}

export function technicalPermissionEffectiveState(record = {}, asOfTime = '') {
  const item = normalizeTechnicalPermission(record);
  if (item.errors.length || !iso(asOfTime)) return 'UNRESOLVED';
  if (item.revokedAt && atOrBefore(item.revokedAt,asOfTime)) return 'REVOKED';
  if (!atOrBefore(item.effectiveFrom,asOfTime)) return 'NOT_YET_EFFECTIVE';
  if (item.effectiveTo && iso(asOfTime) > item.effectiveTo) return 'EXPIRED';
  return 'EFFECTIVE';
}

const idsFromAuthorityActions = authority =>
  unique([...(authority?.actions || []).map(x => x.id || x.label), ...list(authority?.permittedActions)]);

const idsFromAuthorityResources = authority =>
  unique([...(authority?.resources || []).map(x => x.id || x.label), ...list(authority?.resourceIds)]);

/**
 * Compare technical reach with governed Authority Envelope scope.
 * Excess technical permission is a discrepancy; it never enlarges authority.
 * Missing technical permission is an implementation shortfall; it never narrows
 * institutional authority automatically.
 */
export function compareTechnicalPermissionToAuthority({
  technicalPermission = {},
  authorityEnvelope = {}
} = {}) {
  const technical = normalizeTechnicalPermission(technicalPermission);
  const governedActions = new Set(idsFromAuthorityActions(authorityEnvelope));
  const governedResources = new Set(idsFromAuthorityResources(authorityEnvelope));
  const technicalActions = new Set(technical.actionIds);
  const technicalResources = new Set(technical.resourceIds);

  const excessActionIds = [...technicalActions].filter(id => !governedActions.has(id));
  const excessResourceIds = [...technicalResources].filter(id => !governedResources.has(id));
  const unavailableGovernedActionIds = [...governedActions].filter(id => !technicalActions.has(id));
  const unavailableGovernedResourceIds = [...governedResources].filter(id => !technicalResources.has(id));

  return {
    excessActionIds,
    excessResourceIds,
    unavailableGovernedActionIds,
    unavailableGovernedResourceIds,
    aligned:excessActionIds.length === 0 && excessResourceIds.length === 0 &&
      unavailableGovernedActionIds.length === 0 && unavailableGovernedResourceIds.length === 0,
    technicalPermissionCreatesAuthority:false,
    authorityExpandedByTechnicalPermission:false,
    authorityReducedByTechnicalPermission:false
  };
}

export function normalizeDelegatedActionContext(record = {}) {
  const errors = [];
  if (!text(record.id)) errors.push('context id is required.');
  if (!text(record.principalId)) errors.push('principalId is required.');
  if (!text(record.actorId)) errors.push('actorId is required.');
  if (!text(record.machineIdentityId)) errors.push('machineIdentityId is required.');
  if (!text(record.delegationId)) errors.push('delegationId is required.');
  if (!text(record.authorityId)) errors.push('authorityId is required.');
  if (!text(record.permissionId)) errors.push('permissionId is required.');
  if (!text(record.technicalPermissionId)) errors.push('technicalPermissionId is required.');
  if (!text(record.actionId)) errors.push('actionId is required.');
  if (!iso(record.asOfTime)) errors.push('asOfTime is required and must be valid.');
  return {
    id:text(record.id),
    principalId:text(record.principalId),
    actorId:text(record.actorId),
    machineIdentityId:text(record.machineIdentityId),
    delegationId:text(record.delegationId),
    authorityId:text(record.authorityId),
    permissionId:text(record.permissionId),
    technicalPermissionId:text(record.technicalPermissionId),
    actionId:text(record.actionId),
    resourceIds:unique(record.resourceIds),
    asOfTime:iso(record.asOfTime),
    errors
  };
}

/**
 * Validate the complete delegated-action chain without collapsing identities.
 */
export function validateDelegatedActionContext({
  context = {},
  principal = {},
  machineIdentity = {},
  delegation = {},
  authorityEnvelope = {},
  permission = {},
  technicalPermission = {}
} = {}) {
  const ctx = normalizeDelegatedActionContext(context);
  const p = normalizePrincipal(principal);
  const mi = normalizeMachineIdentity(machineIdentity);
  const dlg = normalizeDelegation(delegation);
  const perm = normalizePermission(permission);
  const tp = normalizeTechnicalPermission(technicalPermission);
  const issues = [...ctx.errors,...p.errors,...mi.errors,...tp.errors];

  if (ctx.principalId && p.id !== ctx.principalId) issues.push('principalId does not match supplied principal.');
  if (ctx.actorId && mi.actorId !== ctx.actorId) issues.push('machine identity actorId does not match execution actor.');
  if (ctx.machineIdentityId && mi.id !== ctx.machineIdentityId) issues.push('machineIdentityId does not match supplied machine identity.');
  if (ctx.delegationId && dlg.id !== ctx.delegationId) issues.push('delegationId does not match supplied delegation.');
  if (ctx.authorityId && authorityEnvelope?.id !== ctx.authorityId) issues.push('authorityId does not match supplied Authority Envelope.');
  if (ctx.permissionId && perm.id !== ctx.permissionId) issues.push('permissionId does not match supplied permission.');
  if (ctx.technicalPermissionId && tp.id !== ctx.technicalPermissionId) issues.push('technicalPermissionId does not match supplied technical permission.');

  // The institutional principal and acting machine identity/actor are intentionally separate.
  const principalActorCollision = Boolean(
    p.id && (p.id === mi.id || p.id === mi.actorId)
  );
  if (p.id && mi.id && p.id === mi.id) {
    issues.push('principal and machine identity must remain distinct records.');
  }
  if (p.id && mi.actorId && p.id === mi.actorId) {
    issues.push('principal cannot be the executing machine actor in a delegated machine-action context.');
  }

  // FACEM delegation must explicitly connect the institutional principal to the machine actor.
  if (dlg.delegatorId !== p.id) issues.push('delegation delegatorId must identify the principal.');
  if (dlg.delegateId !== mi.actorId) issues.push('delegation delegateId must identify the machine actor.');
  if (dlg.sourceAuthorityId !== authorityEnvelope?.id) issues.push('delegation must reference the supplied source Authority Envelope.');

  const delegationCheck = validateDelegationAgainstAuthority(dlg,authorityEnvelope,ctx.asOfTime);
  issues.push(...delegationCheck.issues);

  const authorityState = authorityEnvelope ? effectiveAuthorityState(authorityEnvelope,ctx.asOfTime.slice(0,10)).state : 'UNRESOLVED';
  const permissionState = permissionEffectiveState(perm,ctx.asOfTime);
  const machineIdentityState = machineIdentityEffectiveState(mi,ctx.asOfTime);
  const technicalPermissionState = technicalPermissionEffectiveState(tp,ctx.asOfTime);

  if (authorityState !== 'Effective — controlled authority') issues.push(`authority is not effective: ${authorityState}.`);
  if (permissionState !== 'EFFECTIVE') issues.push(`FACEM permission is not effective: ${permissionState}.`);
  if (machineIdentityState !== 'EFFECTIVE') issues.push(`machine identity is not effective: ${machineIdentityState}.`);
  if (technicalPermissionState !== 'EFFECTIVE') issues.push(`technical permission is not effective: ${technicalPermissionState}.`);

  if (!dlg.permittedActions.includes(ctx.actionId)) issues.push('delegation does not permit the requested action.');
  if (!idsFromAuthorityActions(authorityEnvelope).includes(ctx.actionId)) issues.push('Authority Envelope does not permit the requested action.');
  if (!tp.actionIds.includes(ctx.actionId)) issues.push('technical permission does not permit the requested action.');

  const facemPermittedActions = new Set(perm.permittedDataActions || []);
  if (facemPermittedActions.size && !facemPermittedActions.has(ctx.actionId)) {
    issues.push('FACEM permission does not permit the requested action.');
  }

  const requestedResources = new Set(ctx.resourceIds);
  const governedResources = new Set(idsFromAuthorityResources(authorityEnvelope));
  const technicalResources = new Set(tp.resourceIds);
  for (const resourceId of requestedResources) {
    if (!governedResources.has(resourceId)) issues.push(`Authority Envelope does not cover resource ${resourceId}.`);
    if (!technicalResources.has(resourceId)) issues.push(`Technical permission does not cover resource ${resourceId}.`);
  }

  const discrepancy = compareTechnicalPermissionToAuthority({ technicalPermission:tp, authorityEnvelope });

  return {
    valid:issues.length === 0,
    status:issues.length ? 'INCOMPLETE' : 'PASS',
    issues,
    principal:p,
    actorId:ctx.actorId,
    machineIdentity:mi,
    delegation:dlg,
    authorityState,
    permissionState,
    machineIdentityState,
    technicalPermissionState,
    discrepancy,

    // Explicit non-entailment boundaries.
    authenticationCreatesAuthorization:false,
    technicalPermissionCreatesAuthority:false,
    machineIdentityIsPrincipal:principalActorCollision,
    accountabilityTransferred:dlg.accountabilityTransferred === true,
    createsAuthority:false
  };
}

/**
 * Immutable audit projection for a delegated machine action. This projection
 * keeps principal and actor distinct and never rewrites the action as though the
 * principal personally executed it.
 */
export function delegatedActionAuditRecord(validation = {}, execution = {}) {
  return {
    principalId:validation.principal?.id || '',
    actorId:validation.actorId || '',
    machineIdentityId:validation.machineIdentity?.id || '',
    delegationId:validation.delegation?.id || '',
    authorityId:text(execution.authorityId || ''),
    permissionId:text(execution.permissionId || ''),
    technicalPermissionId:text(execution.technicalPermissionId || ''),
    actionId:text(execution.actionId || ''),
    resourceIds:unique(execution.resourceIds),
    occurredAt:iso(execution.occurredAt),
    resultState:text(execution.resultState),
    principalPerformedAction:false,
    machineActorPerformedAction:true,
    createsAccountability:false,
    createsAuthority:false
  };
}
