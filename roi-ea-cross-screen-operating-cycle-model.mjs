/**
 * ROI-Driven Enterprise Architect — A8 Cross-Screen Operating Cycle foundation.
 *
 * Provides a five-screen logical operating cycle over the A1-A7 domain models.
 * It is deliberately an orchestration/projection layer: it does not replace
 * source records, create authority, infer decisions, or collapse unresolved
 * evidence into a recommendation.
 */

const text = value => String(value ?? '').trim();
const list = value => Array.isArray(value) ? value : value == null ? [] : [value];
const unique = value => [...new Set(list(value).map(text).filter(Boolean))];

export const OPERATING_CYCLE_SCREENS = Object.freeze([
  { key:'DECISION_OVERVIEW', label:'Decision Overview' },
  { key:'BUSINESS_CASE_EVIDENCE', label:'Business Case & Evidence' },
  { key:'ARCHITECTURE_AUTHORITY', label:'Architecture & Authority' },
  { key:'PROCESS_AI_ANALYSIS', label:'Process & AI Analysis' },
  { key:'DECISION_EXECUTIVE_PACKAGE', label:'Decision & Executive Package' }
]);

export const ARTIFACT_RESOLUTION_STATES = Object.freeze([
  'RESOLVED','UNRESOLVED','BLOCKED','NOT_APPLICABLE'
]);

export const CROSS_SCREEN_RELATIONSHIPS = Object.freeze([
  'SUPPORTED_BY',
  'DERIVED_FROM',
  'MAPS_TO',
  'DEPENDS_ON',
  'EVALUATES',
  'RECOMMENDS',
  'IMPLEMENTS_CONTROL',
  'OPERATES_CONTROL',
  'HAS_TRUST_STATE_FOR',
  'REALIZES_VALUE_FROM'
]);

const screenKeys = new Set(OPERATING_CYCLE_SCREENS.map(x=>x.key));

export function normalizeCycleArtifact(record = {}) {
  const resolutionState = text(record.resolutionState || 'UNRESOLVED').toUpperCase();
  const errors = [];
  if (!text(record.id)) errors.push('artifact id is required.');
  if (!screenKeys.has(text(record.screenKey))) errors.push('screenKey is not recognized.');
  if (!text(record.artifactType)) errors.push('artifactType is required.');
  if (!ARTIFACT_RESOLUTION_STATES.includes(resolutionState)) errors.push('resolutionState is not recognized.');

  return {
    id:text(record.id),
    screenKey:text(record.screenKey),
    artifactType:text(record.artifactType),
    sourceModule:text(record.sourceModule),
    sourceRecordId:text(record.sourceRecordId || record.id),
    resolutionState,
    required:record.required !== false,
    evidenceIds:unique(record.evidenceIds),
    ownerId:text(record.ownerId),
    asOfTime:text(record.asOfTime),
    notes:text(record.notes),
    errors
  };
}

export function normalizeCrossScreenLink(record = {}) {
  const relationshipType = text(record.relationshipType).toUpperCase();
  const errors = [];
  if (!text(record.id)) errors.push('link id is required.');
  if (!text(record.sourceArtifactId)) errors.push('sourceArtifactId is required.');
  if (!text(record.targetArtifactId)) errors.push('targetArtifactId is required.');
  if (!CROSS_SCREEN_RELATIONSHIPS.includes(relationshipType)) errors.push('relationshipType is not recognized.');
  if (text(record.sourceArtifactId) && text(record.sourceArtifactId) === text(record.targetArtifactId)) {
    errors.push('cross-screen link cannot point an artifact to itself.');
  }

  return {
    id:text(record.id),
    sourceArtifactId:text(record.sourceArtifactId),
    targetArtifactId:text(record.targetArtifactId),
    relationshipType,
    evidenceIds:unique(record.evidenceIds),
    explicitAssertion:record.explicitAssertion === true,
    errors
  };
}

/**
 * Known semantic boundaries that must never be inferred merely because
 * two artifacts appear in the same operating cycle.
 */
export const FORBIDDEN_CYCLE_ENTAILMENTS = Object.freeze([
  ['EVIDENCE','DECISION'],
  ['CLASSIFICATION','AUTHORIZATION'],
  ['TECHNICAL_PERMISSION','AUTHORITY'],
  ['IMPACT_ASSESSMENT','INVESTMENT_DECISION'],
  ['EXECUTIVE_SIGNAL','RECOMMENDATION'],
  ['RECOVERY','AUTHORIZED_RESUMPTION'],
  ['OUTCOME','VALUE'],
  ['PERMISSION','AUTHORITY']
]);

export function validateCycleEntailment({
  sourceConcept = '',
  proposedConcept = '',
  explicitAssertion = false,
  derivationBasis = []
} = {}) {
  const source = text(sourceConcept).toUpperCase();
  const target = text(proposedConcept).toUpperCase();
  const forbidden = FORBIDDEN_CYCLE_ENTAILMENTS.some(([s,t])=>s===source&&t===target);
  const basis = unique(derivationBasis);

  if (forbidden && !explicitAssertion) {
    return {
      valid:false,
      status:'FORBIDDEN_ENTAILMENT',
      issues:[`${source} does not entail ${target}.`]
    };
  }
  if (forbidden && explicitAssertion && basis.length === 0) {
    return {
      valid:false,
      status:'INSUFFICIENT_BASIS',
      issues:[`Explicit ${target} requires an independent basis.`]
    };
  }
  return { valid:true, status:'PASS', issues:[] };
}

export function deriveScreenReadiness({
  screenKey = '',
  artifacts = []
} = {}) {
  const normalized = artifacts.map(normalizeCycleArtifact)
    .filter(item=>item.screenKey===screenKey);

  const issues = normalized.flatMap(item=>item.errors);
  const required = normalized.filter(item=>item.required);
  const blocked = required.filter(item=>item.resolutionState==='BLOCKED');
  const unresolved = required.filter(item=>item.resolutionState==='UNRESOLVED');
  const resolved = required.filter(item=>['RESOLVED','NOT_APPLICABLE'].includes(item.resolutionState));

  const status = issues.length
    ? 'INCOMPLETE'
    : blocked.length
      ? 'BLOCKED'
      : unresolved.length
        ? 'NOT_READY'
        : required.length === 0
          ? 'NO_REQUIRED_ARTIFACTS'
          : 'READY_FOR_REVIEW';

  return {
    screenKey,
    status,
    requiredArtifactIds:required.map(x=>x.id),
    resolvedArtifactIds:resolved.map(x=>x.id),
    unresolvedArtifactIds:unresolved.map(x=>x.id),
    blockedArtifactIds:blocked.map(x=>x.id),
    issues,

    // Readiness is not authorization or approval.
    navigationLocked:false,
    createsDecision:false,
    createsAuthorization:false,
    createsApproval:false
  };
}

export function buildOperatingCycle({
  artifacts = [],
  links = []
} = {}) {
  const normalizedArtifacts = artifacts.map(normalizeCycleArtifact);
  const normalizedLinks = links.map(normalizeCrossScreenLink);
  const artifactIds = new Set(normalizedArtifacts.map(x=>x.id));
  const issues = [
    ...normalizedArtifacts.flatMap(x=>x.errors),
    ...normalizedLinks.flatMap(x=>x.errors)
  ];

  for (const link of normalizedLinks) {
    if (link.sourceArtifactId && !artifactIds.has(link.sourceArtifactId)) {
      issues.push(`link ${link.id} references unknown source artifact ${link.sourceArtifactId}.`);
    }
    if (link.targetArtifactId && !artifactIds.has(link.targetArtifactId)) {
      issues.push(`link ${link.id} references unknown target artifact ${link.targetArtifactId}.`);
    }
  }

  const screens = Object.fromEntries(
    OPERATING_CYCLE_SCREENS.map(screen=>[
      screen.key,
      deriveScreenReadiness({screenKey:screen.key,artifacts:normalizedArtifacts})
    ])
  );

  const unresolvedArtifactIds = normalizedArtifacts
    .filter(x=>x.required && x.resolutionState==='UNRESOLVED')
    .map(x=>x.id);
  const blockedArtifactIds = normalizedArtifacts
    .filter(x=>x.required && x.resolutionState==='BLOCKED')
    .map(x=>x.id);

  return {
    screens,
    artifacts:normalizedArtifacts,
    links:normalizedLinks,
    unresolvedArtifactIds,
    blockedArtifactIds,
    status:issues.length
      ? 'INCOMPLETE'
      : blockedArtifactIds.length
        ? 'BLOCKED'
        : unresolvedArtifactIds.length
          ? 'ACTIVE_WITH_GAPS'
          : 'READY_FOR_DECISION_REVIEW',
    issues,

    // Cycle state is descriptive and review-oriented.
    currentScreenNotInferred:true,
    autoDecision:false,
    autoAuthorization:false,
    autoRecommendation:false
  };
}

/**
 * Build the final executive-package gate from the cycle without inventing a
 * decision. All unresolved/blocked items remain visible.
 */
export function buildExecutivePackageGate(cycle = {}) {
  const screens = cycle.screens || {};
  const requiredScreens = OPERATING_CYCLE_SCREENS
    .filter(x=>x.key!=='DECISION_EXECUTIVE_PACKAGE')
    .map(x=>screens[x.key])
    .filter(Boolean);

  const notReadyScreens = requiredScreens
    .filter(x=>x.status!=='READY_FOR_REVIEW')
    .map(x=>x.screenKey);

  const unresolvedArtifactIds = unique(cycle.unresolvedArtifactIds);
  const blockedArtifactIds = unique(cycle.blockedArtifactIds);
  const ready = notReadyScreens.length===0 &&
    unresolvedArtifactIds.length===0 &&
    blockedArtifactIds.length===0 &&
    !(cycle.issues || []).length;

  return {
    readyForExecutiveDecisionReview:ready,
    notReadyScreens,
    unresolvedArtifactIds,
    blockedArtifactIds,
    packageStatus:ready ? 'READY_FOR_EXECUTIVE_DECISION_REVIEW' : 'NOT_READY',
    decision:null,
    recommendation:null,
    authorization:null,
    implementationApproval:null
  };
}

/**
 * Material change routing is deliberately bounded. Only explicitly affected
 * artifacts are reopened here. The function does not rewrite source records.
 */
export function applyMaterialChangeToCycle({
  cycle = {},
  change = {}
} = {}) {
  const changeId = text(change.id);
  const affectedArtifactIds = unique(change.affectedArtifactIds);
  const artifacts = (cycle.artifacts || []).map(normalizeCycleArtifact);
  const knownIds = new Set(artifacts.map(x=>x.id));
  const issues = [];

  if (!changeId) issues.push('change id is required.');
  for (const id of affectedArtifactIds) {
    if (!knownIds.has(id)) issues.push(`material change references unknown artifact ${id}.`);
  }

  const reopenedArtifacts = artifacts.map(item =>
    affectedArtifactIds.includes(item.id)
      ? {...item,resolutionState:'UNRESOLVED',notes:`Reopened by material change ${changeId}.`}
      : item
  );

  const next = buildOperatingCycle({
    artifacts:reopenedArtifacts,
    links:cycle.links || []
  });

  return {
    changeId,
    affectedArtifactIds,
    cycle:next,
    status:issues.length ? 'INCOMPLETE' : 'REASSESSMENT_REQUIRED',
    issues,
    sourceRecordsModified:false,
    propagationInferred:false,
    automaticDecisionChange:false
  };
}

/**
 * Convenience projection for the principal Second Edition domains.
 * Callers supply artifact states from their source modules; this function
 * assigns them to the five logical screens without copying the source objects.
 */
export function buildSecondEditionCycleProjection(input = {}) {
  const artifacts = [
    {
      id:'ART-DECISION-QUESTION',
      screenKey:'DECISION_OVERVIEW',
      artifactType:'DECISION_QUESTION',
      sourceModule:text(input.decision?.sourceModule || 'consequential-decision-model.mjs'),
      sourceRecordId:text(input.decision?.id),
      resolutionState:text(input.decision?.resolutionState || 'UNRESOLVED'),
      evidenceIds:input.decision?.evidenceIds
    },
    {
      id:'ART-BUSINESS-CASE',
      screenKey:'BUSINESS_CASE_EVIDENCE',
      artifactType:'DELEGATION_ECONOMICS',
      sourceModule:'roi-ea-economics-human-control-model.mjs',
      sourceRecordId:text(input.economics?.id || input.economics?.caseId),
      resolutionState:text(input.economics?.resolutionState || 'UNRESOLVED'),
      evidenceIds:input.economics?.evidenceIds
    },
    {
      id:'ART-EVIDENCE',
      screenKey:'BUSINESS_CASE_EVIDENCE',
      artifactType:'EVIDENCE',
      sourceModule:text(input.evidence?.sourceModule || 'engagement-evidence-model.mjs'),
      sourceRecordId:text(input.evidence?.id),
      resolutionState:text(input.evidence?.resolutionState || 'UNRESOLVED'),
      evidenceIds:input.evidence?.evidenceIds
    },
    {
      id:'ART-AUTHORITY',
      screenKey:'ARCHITECTURE_AUTHORITY',
      artifactType:'AUTHORITY',
      sourceModule:'roi-ea-authority-identity-model.mjs',
      sourceRecordId:text(input.authority?.id),
      resolutionState:text(input.authority?.resolutionState || 'UNRESOLVED'),
      evidenceIds:input.authority?.evidenceIds
    },
    {
      id:'ART-ARCHITECTURE',
      screenKey:'ARCHITECTURE_AUTHORITY',
      artifactType:'ARCHITECTURE',
      sourceModule:text(input.architecture?.sourceModule || 'feoa-model.mjs'),
      sourceRecordId:text(input.architecture?.id),
      resolutionState:text(input.architecture?.resolutionState || 'UNRESOLVED'),
      evidenceIds:input.architecture?.evidenceIds
    },
    {
      id:'ART-AACM',
      screenKey:'PROCESS_AI_ANALYSIS',
      artifactType:'CLASSIFICATION',
      sourceModule:'roi-ea-agentic-deployment-aacm.mjs',
      sourceRecordId:text(input.aacm?.id),
      resolutionState:text(input.aacm?.resolutionState || 'UNRESOLVED'),
      evidenceIds:input.aacm?.evidenceIds
    },
    {
      id:'ART-HUMAN-CONTROL',
      screenKey:'PROCESS_AI_ANALYSIS',
      artifactType:'HUMAN_CONTROL',
      sourceModule:'roi-ea-economics-human-control-model.mjs',
      sourceRecordId:text(input.humanControl?.id),
      resolutionState:text(input.humanControl?.resolutionState || 'UNRESOLVED'),
      evidenceIds:input.humanControl?.evidenceIds
    },
    {
      id:'ART-IMPACT',
      screenKey:'PROCESS_AI_ANALYSIS',
      artifactType:'IMPACT_ASSESSMENT',
      sourceModule:'roi-ea-impact-controls-trust-workforce-model.mjs',
      sourceRecordId:text(input.impact?.id),
      resolutionState:text(input.impact?.resolutionState || 'UNRESOLVED'),
      evidenceIds:input.impact?.evidenceIds
    },
    {
      id:'ART-PORTFOLIO',
      screenKey:'DECISION_EXECUTIVE_PACKAGE',
      artifactType:'PORTFOLIO_ANALYTICS',
      sourceModule:'roi-ea-portfolio-executive-analytics-model.mjs',
      sourceRecordId:text(input.portfolio?.id),
      resolutionState:text(input.portfolio?.resolutionState || 'UNRESOLVED'),
      evidenceIds:input.portfolio?.evidenceIds,
      required:input.portfolio?.required !== false
    },
    {
      id:'ART-EXECUTIVE-PACKAGE',
      screenKey:'DECISION_EXECUTIVE_PACKAGE',
      artifactType:'EXECUTIVE_PACKAGE',
      sourceModule:text(input.executivePackage?.sourceModule || 'engagement-report.mjs'),
      sourceRecordId:text(input.executivePackage?.id),
      resolutionState:text(input.executivePackage?.resolutionState || 'UNRESOLVED'),
      evidenceIds:input.executivePackage?.evidenceIds
    }
  ];

  const links = [
    {id:'XL-1',sourceArtifactId:'ART-EVIDENCE',targetArtifactId:'ART-BUSINESS-CASE',relationshipType:'SUPPORTED_BY'},
    {id:'XL-2',sourceArtifactId:'ART-BUSINESS-CASE',targetArtifactId:'ART-ARCHITECTURE',relationshipType:'MAPS_TO'},
    {id:'XL-3',sourceArtifactId:'ART-AUTHORITY',targetArtifactId:'ART-AACM',relationshipType:'DEPENDS_ON'},
    {id:'XL-4',sourceArtifactId:'ART-AACM',targetArtifactId:'ART-HUMAN-CONTROL',relationshipType:'EVALUATES'},
    {id:'XL-5',sourceArtifactId:'ART-IMPACT',targetArtifactId:'ART-EXECUTIVE-PACKAGE',relationshipType:'SUPPORTED_BY'},
    {id:'XL-6',sourceArtifactId:'ART-PORTFOLIO',targetArtifactId:'ART-EXECUTIVE-PACKAGE',relationshipType:'SUPPORTED_BY'}
  ];

  return buildOperatingCycle({artifacts,links});
}
