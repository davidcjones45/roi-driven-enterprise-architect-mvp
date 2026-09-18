/**
 * ROI-Driven Enterprise Architect — Agentic Deployment + AACM specialization.
 *
 * Source basis: CIF-S-003 Autonomous Agent Classification Matrix specialization.
 * AACM classifies a deployed agentic system as a vector of independently
 * meaningful characteristics. It is not a single autonomy score and does not
 * authorize action, accept risk, validate safety, or determine value.
 */

import { routeMaterialChange } from './roi-ea-lifecycle-state-model.mjs';

export const AACM_DIMENSIONS = Object.freeze([
  { id:1,  key:'operationalCapability',    label:'Operational capability' },
  { id:2,  key:'decisionAutonomy',         label:'Decision autonomy' },
  { id:3,  key:'initiative',               label:'Initiative' },
  { id:4,  key:'authorityScope',           label:'Authority scope' },
  { id:5,  key:'delegationDepth',          label:'Delegation depth' },
  { id:6,  key:'environmentOfEffect',      label:'Environment of effect' },
  { id:7,  key:'persistence',              label:'Persistence' },
  { id:8,  key:'adaptability',             label:'Adaptability' },
  { id:9,  key:'composition',              label:'Composition' },
  { id:10, key:'humanOversight',           label:'Human oversight' },
  { id:11, key:'consequenceMagnitude',      label:'Consequence magnitude' },
  { id:12, key:'reversibility',             label:'Reversibility' },
  { id:13, key:'observability',              label:'Observability' },
  { id:14, key:'dependencyCriticality',      label:'Dependency criticality' },
  { id:15, key:'recoveryResumptionMode',     label:'Recovery/resumption mode' }
]);

export const AACM_SWARM_DIMENSIONS = Object.freeze([
  { id:16, key:'roleScope',               label:'Role scope' },
  { id:17, key:'coordinationTopology',    label:'Coordination topology' },
  { id:18, key:'sharedStateModel',        label:'Shared-state model' },
  { id:19, key:'collectiveSynthesisRule', label:'Collective synthesis rule' }
]);

/**
 * These values are examples from the CIF specialization, not exhaustive enums.
 */
export const AACM_SWARM_EXAMPLES = Object.freeze({
  roleScope:[
    'Generalist','Domain specialist','Cross-domain synthesizer',
    'Risk challenger','Preference advocate','Continuity coordinator'
  ],
  coordinationTopology:[
    'Independent','Peer coordinated','Hierarchical','Orchestrated',
    'Deliberative','Adversarial/red-team','Federated'
  ],
  sharedStateModel:[
    'No shared state','Read-only shared context','Shared evidence store',
    'Shared working memory','Persistent shared memory','Selectively partitioned memory'
  ],
  collectiveSynthesisRule:[
    'Consensus','Weighted synthesis','Domain-authority synthesis',
    'Constraint-first','Human-resolved conflict','Multi-objective/Pareto synthesis'
  ]
});

const text = value => String(value ?? '').trim();
const list = value => Array.isArray(value) ? value : value == null ? [] : [value];
const unique = value => [...new Set(list(value).map(text).filter(Boolean))];
const iso = value => {
  const raw = text(value);
  if (!raw || Number.isNaN(Date.parse(raw))) return '';
  return new Date(raw).toISOString();
};

export function normalizeAgenticDeployment(record = {}) {
  const errors = [];
  const id = text(record.id);
  if (!id) errors.push('deployment id is required.');
  if (!text(record.purpose)) errors.push('deployment purpose is required.');
  if (!text(record.aiCapabilityId)) errors.push('aiCapabilityId is required.');
  if (!text(record.operatingEnvironment)) errors.push('operatingEnvironment is required.');
  if (!iso(record.effectiveFrom)) errors.push('effectiveFrom is required and must be valid.');

  const availableCapabilities = list(record.availableCapabilities).map(item => typeof item === 'string'
    ? { id:text(item), available:true, evidenceIds:[] }
    : {
        id:text(item?.id),
        label:text(item?.label),
        available:item?.available === true,
        evidenceIds:unique(item?.evidenceIds)
      }
  );

  return {
    id,
    aiCapabilityId:text(record.aiCapabilityId),
    modelOrServiceRef:text(record.modelOrServiceRef),
    version:text(record.version),
    configurationRef:text(record.configurationRef),
    purpose:text(record.purpose),
    operatingEnvironment:text(record.operatingEnvironment),
    toolIds:unique(record.toolIds),
    credentialIds:unique(record.credentialIds),
    dataScope:text(record.dataScope),
    populationScope:text(record.populationScope),
    authorityEnvelopeIds:unique(record.authorityEnvelopeIds),
    permissionIds:unique(record.permissionIds),
    dependencyIds:unique(record.dependencyIds),
    humanControlIds:unique(record.humanControlIds),
    fallbackId:text(record.fallbackId),
    componentDeploymentIds:unique(record.componentDeploymentIds),
    availableCapabilities,
    evidenceIds:unique(record.evidenceIds),
    effectiveFrom:iso(record.effectiveFrom),
    effectiveTo:iso(record.effectiveTo),
    status:text(record.status || 'Draft'),
    errors
  };
}

export function validateAgenticDeployment(record = {}) {
  const deployment = normalizeAgenticDeployment(record);
  const duplicateCapabilities = deployment.availableCapabilities
    .filter((item,index,all) => item.id && all.findIndex(other => other.id === item.id) !== index)
    .map(item => item.id);
  const issues = [...deployment.errors];
  if (deployment.availableCapabilities.some(item => !item.id)) issues.push('Every available capability requires an id.');
  if (duplicateCapabilities.length) issues.push('Duplicate available capability ids are not allowed.');
  return {
    deployment,
    valid:issues.length === 0,
    status:issues.length ? 'INCOMPLETE' : 'PASS',
    issues
  };
}

export function normalizeDimensionAssessment(raw = {}) {
  const value = text(raw.value);
  const status = text(raw.status || (value ? 'RESOLVED' : 'UNRESOLVED')).toUpperCase();
  return {
    value,
    status:['RESOLVED','UNRESOLVED','NOT_APPLICABLE'].includes(status) ? status : 'UNRESOLVED',
    rationale:text(raw.rationale),
    evidenceIds:unique(raw.evidenceIds),
    reviewerId:text(raw.reviewerId)
  };
}

function normalizedDimensions(rawDimensions = {}, definitions = []) {
  return Object.fromEntries(definitions.map(def => [
    def.key,
    normalizeDimensionAssessment(rawDimensions?.[def.key] || {})
  ]));
}

function dimensionIssues(dimensions, definitions) {
  const issues = [];
  for (const def of definitions) {
    const item = dimensions[def.key];
    if (item.status === 'UNRESOLVED') issues.push(`${def.label} is unresolved.`);
    if (item.status === 'RESOLVED' && !item.value) issues.push(`${def.label} requires a value when resolved.`);
    if (item.status === 'RESOLVED' && !item.evidenceIds.length) issues.push(`${def.label} requires evidence when resolved.`);
  }
  return issues;
}

export function normalizeAACMClassification(record = {}) {
  return {
    id:text(record.id),
    deploymentId:text(record.deploymentId),
    dimensions:normalizedDimensions(record.dimensions,AACM_DIMENSIONS),
    highestEffectiveCapabilityId:text(record.highestEffectiveCapabilityId),
    highestEffectiveCapabilityBasis:text(record.highestEffectiveCapabilityBasis),
    evidenceIds:unique(record.evidenceIds),
    reviewerId:text(record.reviewerId),
    effectiveFrom:iso(record.effectiveFrom),
    effectiveTo:iso(record.effectiveTo),
    reassessmentTriggerRefs:unique(record.reassessmentTriggerRefs),
    status:text(record.status || 'Draft')
  };
}

export function validateHighestEffectiveCapability(classification = {}, deployment = {}) {
  const normalized = normalizeAACMClassification(classification);
  const dep = normalizeAgenticDeployment(deployment);
  const available = dep.availableCapabilities.filter(item => item.available === true);
  const selected = available.find(item => item.id === normalized.highestEffectiveCapabilityId) || null;
  const issues = [];
  if (!normalized.highestEffectiveCapabilityId) issues.push('highestEffectiveCapabilityId is required.');
  else if (!selected) issues.push('highestEffectiveCapabilityId must reference a consequential capability actually available in this deployment.');
  if (!normalized.highestEffectiveCapabilityBasis) issues.push('highestEffectiveCapabilityBasis is required.');
  return { valid:issues.length === 0, selectedCapability:selected, issues };
}

export function validateAACMClassification(record = {}, deploymentRecord = {}) {
  const classification = normalizeAACMClassification(record);
  const deploymentCheck = validateAgenticDeployment(deploymentRecord);
  const issues = [];
  if (!classification.id) issues.push('classification id is required.');
  if (!classification.deploymentId) issues.push('deploymentId is required.');
  if (deploymentCheck.deployment.id && classification.deploymentId &&
      deploymentCheck.deployment.id !== classification.deploymentId) {
    issues.push('classification deploymentId does not match the supplied deployment.');
  }
  if (!classification.reviewerId) issues.push('reviewerId is required.');
  if (!classification.effectiveFrom) issues.push('effectiveFrom is required and must be valid.');
  issues.push(...dimensionIssues(classification.dimensions,AACM_DIMENSIONS));
  issues.push(...validateHighestEffectiveCapability(classification,deploymentCheck.deployment).issues);

  return {
    classification,
    deployment:deploymentCheck.deployment,
    valid:deploymentCheck.valid && issues.length === 0,
    status:deploymentCheck.valid && issues.length === 0 ? 'PASS' : 'INCOMPLETE',
    issues:[...deploymentCheck.issues,...issues],

    // Explicit decision boundaries.
    createsAuthorization:false,
    riskAssessment:null,
    safetyValidation:null,
    valueJudgment:null,
    aggregateAutonomyScore:null
  };
}

export function normalizeSwarmClassification(record = {}) {
  return {
    id:text(record.id),
    systemId:text(record.systemId),
    componentDeploymentIds:unique(record.componentDeploymentIds),
    componentClassificationIds:unique(record.componentClassificationIds),
    dimensions:normalizedDimensions(record.dimensions,AACM_SWARM_DIMENSIONS),
    reviewerId:text(record.reviewerId),
    effectiveFrom:iso(record.effectiveFrom),
    effectiveTo:iso(record.effectiveTo),
    evidenceIds:unique(record.evidenceIds),
    reassessmentTriggerRefs:unique(record.reassessmentTriggerRefs),
    status:text(record.status || 'Draft')
  };
}

export function validateSwarmClassification(record = {}) {
  const swarm = normalizeSwarmClassification(record);
  const issues = [];
  if (!swarm.id) issues.push('swarm classification id is required.');
  if (!swarm.systemId) issues.push('systemId is required.');
  if (!swarm.componentDeploymentIds.length) issues.push('At least one componentDeploymentId is required.');
  if (!swarm.reviewerId) issues.push('reviewerId is required.');
  if (!swarm.effectiveFrom) issues.push('effectiveFrom is required and must be valid.');
  issues.push(...dimensionIssues(swarm.dimensions,AACM_SWARM_DIMENSIONS));

  return {
    swarm,
    valid:issues.length === 0,
    status:issues.length === 0 ? 'PASS' : 'INCOMPLETE',
    issues,
    inferredFromComponents:false,
    createsAuthorization:false,
    aggregateAutonomyScore:null
  };
}

/**
 * A material change can require classification review, but never creates a new
 * classification automatically.
 */
export function assessAACMReclassification({ classification = {}, change = {} } = {}) {
  const normalized = normalizeAACMClassification(classification);
  const routed = routeMaterialChange(change);
  const explicitlyAffected = routed.reopenBoundaryIds?.includes(normalized.id) === true;
  const triggerReferenced = normalized.reassessmentTriggerRefs.includes(routed.change?.id);
  const required = routed.status === 'REASSESSMENT_REQUIRED' &&
    (routed.aacmReclassificationCandidate || explicitlyAffected || triggerReferenced);

  return {
    classificationId:normalized.id,
    changeId:routed.change?.id || '',
    reclassificationRequired:required,
    automaticReclassification:false,
    route:routed,
    status:routed.status === 'INCOMPLETE' ? 'INCOMPLETE' : required ? 'RECLASSIFICATION_REQUIRED' : 'NO_RECLASSIFICATION_REQUIRED'
  };
}
