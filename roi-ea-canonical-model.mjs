/**
 * ROI-Driven Enterprise Architect — CIF canonical projection foundation.
 *
 * Additive compatibility module. It does not replace FACEM, BACRM,
 * authority-model, FEOA, economics, or consultant-workflow domain records.
 * Canonical projection is descriptive and must not create materially different
 * relationships by implication.
 */

export const CIF_OBJECT_FAMILIES = Object.freeze({
  ACTOR: 'OF-01',
  PURPOSE: 'OF-02',
  OUTCOME: 'OF-03',
  VALUE: 'OF-04',
  CONSEQUENCE: 'OF-05',
  CONTEXT_SYSTEM: 'OF-06',
  CAPABILITY: 'OF-07',
  RESOURCE: 'OF-08',
  DEPENDENCY: 'OF-09',
  TRUST_STATE: 'OF-10',
  RELIANCE: 'OF-11',
  EPISTEMIC: 'OF-12',
  SEMANTIC_MAPPING: 'OF-13',
  RULE_OBLIGATION: 'OF-14',
  AUTHORITY_DELEGATION: 'OF-15',
  DECISION: 'OF-16',
  COMMITMENT: 'OF-17',
  ACTION: 'OF-18',
  HANDOFF: 'OF-19',
  ACCEPTANCE: 'OF-20',
  CONTROL_INTERVENTION_RECOURSE: 'OF-21',
  LIFECYCLE: 'OF-22'
});

/**
 * Frozen CIF v0.3 Canonical Relationship Grammar v0.2.
 * Causal roles are kept separate below; they are not relationship types.
 */
export const CIF_RELATIONSHIPS = Object.freeze([
  // Institutional / normative
  'POSSESSES_AUTHORITY','DELEGATES_TO','IS_PERMITTED_TO','RESPONSIBLE_FOR',
  'ACCOUNTABLE_FOR','MAKES_COMMITMENT','IS_MEMBER_OF','CONSENTS_TO',
  'MAKES_DECISION','ASSUMES','GRANTS_EXCEPTION_TO',

  // Rule semantics
  'APPLIES_TO','REQUIRES','PROHIBITS','PERMITS',

  // Epistemic / semantic
  'ASSERTS','SUPPORTED_BY','DERIVED_FROM','EVALUATES','CONTRADICTS',
  'RELIES_ON','INFERS','RECOMMENDS','MAPS_TO','TRANSFORMS_TO',
  'SUPERSEDES','CORRECTS','HAS_TRUST_STATE_FOR',

  // Operational
  'PERFORMS','USES','HAS_ACCESS_TO','POSSESSES','AUTHENTICATES_AS',
  'DEPENDS_ON','REQUESTS','OFFERS','TRANSMITS','RECEIVES','VALIDATES',
  'ACCEPTS','COMPLETES','IMPLEMENTS_CONTROL','OPERATES_CONTROL',
  'INTERVENES_IN','INVOKES_RECOURSE',

  // Purpose / value
  'SERVES_PURPOSE','SEEKS_OUTCOME','REALIZES_VALUE_FROM','ATTRIBUTES_VALUE_TO',

  // Causal
  'CONTRIBUTES_CAUSALLY_TO',

  // Temporal / lifecycle
  'PRECEDES','BECOMES_EFFECTIVE_AT','EXPIRES_AT','SUSPENDS','REACTIVATES',
  'RETIRES','RECOVERS_FROM'
]);

export const CIF_CAUSAL_ROLES = Object.freeze([
  'DIRECT','CONTRIBUTING','ENABLING','NECESSARY_CONDITION',
  'SUFFICIENT_CONDITION','AMPLIFYING','MITIGATING','PREVENTIVE'
]);

/**
 * Forbidden single-hop implications where both source and target are members of
 * the frozen CIF relationship grammar.
 */
export const FORBIDDEN_RELATIONSHIP_ENTAILMENTS = Object.freeze([
  ['HAS_ACCESS_TO','IS_PERMITTED_TO'],
  ['AUTHENTICATES_AS','IS_PERMITTED_TO'],
  ['IS_PERMITTED_TO','POSSESSES_AUTHORITY'],
  ['POSSESSES_AUTHORITY','ACCOUNTABLE_FOR'],
  ['RESPONSIBLE_FOR','ACCOUNTABLE_FOR'],
  ['PERFORMS','RESPONSIBLE_FOR'],
  ['PERFORMS','ACCOUNTABLE_FOR'],
  ['DEPENDS_ON','IS_MEMBER_OF'],
  ['REQUESTS','MAKES_COMMITMENT'],
  ['OFFERS','ACCEPTS'],
  ['TRANSMITS','RECEIVES'],
  ['RECEIVES','VALIDATES'],
  ['VALIDATES','ACCEPTS'],
  ['ACCEPTS','PERFORMS'],
  ['PERFORMS','COMPLETES'],
  ['PRECEDES','CONTRIBUTES_CAUSALLY_TO'],
  ['DEPENDS_ON','CONTRIBUTES_CAUSALLY_TO'],
  ['CORRECTS','SUPERSEDES'],
  ['RECOVERS_FROM','REACTIVATES'],
  ['IS_MEMBER_OF','CONSENTS_TO'],
  ['IS_PERMITTED_TO','CONSENTS_TO'],
  ['ACCEPTS','CONSENTS_TO'],
  ['POSSESSES_AUTHORITY','CONSENTS_TO']
]);

/**
 * Semantic/object-state non-entailments are not relationship-grammar edges.
 */
export const SEMANTIC_NON_ENTAILMENTS = Object.freeze([
  ['CAPABILITY','AUTHORITY'],
  ['ACCESS','PERMISSION'],
  ['AUTHENTICATION','AUTHORIZATION'],
  ['EVIDENCE','FACT'],
  ['FACT','INFERENCE'],
  ['INFERENCE','RECOMMENDATION'],
  ['RECOMMENDATION','DECISION'],
  ['CONFIDENCE','AUTHORITY'],
  ['POSSESSION','RELIANCE'],
  ['RELIANCE','INHERITANCE'],
  ['TRUST','AUTHORITY'],
  ['DEPENDENCY','MEMBERSHIP'],
  ['REQUEST','COMMITMENT'],
  ['OFFER','ACCEPTANCE'],
  ['TRANSMISSION','RECEIPT'],
  ['RECEIPT','VALIDATION'],
  ['VALIDATION','ACCEPTANCE'],
  ['ACCEPTANCE','EXECUTION'],
  ['EXECUTION','COMPLETION'],
  ['COMPLETION','OUTCOME'],
  ['OUTCOME','VALUE'],
  ['EXECUTION','ACCOUNTABILITY'],
  ['AUTHORITY','ACCOUNTABILITY'],
  ['RESPONSIBILITY','ACCOUNTABILITY'],
  ['COMMITMENT','ACCOUNTABILITY'],
  ['RESPONSIBILITY','AUTHORITY'],
  ['RESPONSIBILITY','COMMITMENT'],
  ['RESPONSIBILITY','PERFORMANCE'],
  ['SEQUENCE','CAUSATION'],
  ['CORRELATION','CAUSATION'],
  ['DEPENDENCY','CAUSATION'],
  ['RESPONSIBILITY','CAUSATION'],
  ['ACCOUNTABILITY','CAUSATION'],
  ['CAUSAL_CONTRIBUTION','LEGAL_LIABILITY'],
  ['CORRECTION','HISTORICAL_ERASURE'],
  ['CORRECTION','SUPERSESSION'],
  ['CHANGED_VALIDITY','CORRECTION'],
  ['SHARED_EVIDENCE','SHARED_DECISION'],
  ['SAME_SOURCE_VALUE','SAME_SEMANTIC_MEANING'],
  ['TECHNICAL_CONTINUITY','SEMANTIC_CONTINUITY'],
  ['TECHNICAL_RECOVERY','AUTHORIZED_RESUMPTION'],
  ['PARTICIPATION','CONSENT'],
  ['PERMISSION','CONSENT'],
  ['ACCEPTANCE','CONSENT'],
  ['AUTHORITY','CONSENT'],
  ['MEMBERSHIP','CONSENT'],
  ['PRIOR_USE','CONSENT'],
  ['SILENCE','CONSENT'],

  // ROI-EA / AACM specialization guards
  ['CLASSIFICATION','RISK_ASSESSMENT'],
  ['CLASSIFICATION','AUTHORIZATION'],
  ['CLASSIFICATION','SAFETY_VALIDATION'],
  ['CLASSIFICATION','VALUE_JUDGMENT'],
  ['SWARM_COMPONENT_CLASSIFICATION','SWARM_SYSTEM_CLASSIFICATION']
]);

const text = value => String(value ?? '').trim();
const list = value => Array.isArray(value) ? value : value == null ? [] : [value];

export function normalizeCanonicalObjectRef(record = {}) {
  const id = text(record.canonicalId || record.id);
  const family = text(record.family);
  const domainType = text(record.domainType);
  const domainId = text(record.domainId);
  const errors = [];
  if (!id) errors.push('canonicalId is required.');
  if (!Object.values(CIF_OBJECT_FAMILIES).includes(family)) errors.push('family is not a recognized CIF object family.');
  if (!domainType) errors.push('domainType is required.');
  if (!domainId) errors.push('domainId is required.');
  return {
    canonicalId: id,
    family,
    domainType,
    domainId,
    version: text(record.version),
    effectiveFrom: text(record.effectiveFrom),
    effectiveTo: text(record.effectiveTo),
    status: text(record.status || 'active'),
    sourceModule: text(record.sourceModule),
    errors
  };
}

export function normalizeCanonicalRelationship(record = {}) {
  const relationshipType = text(record.relationshipType);
  const errors = [];
  if (!text(record.id)) errors.push('relationship id is required.');
  if (!text(record.sourceId)) errors.push('sourceId is required.');
  if (!text(record.targetId)) errors.push('targetId is required.');
  if (!CIF_RELATIONSHIPS.includes(relationshipType)) errors.push('relationshipType is not in the CIF relationship grammar.');
  return {
    id: text(record.id),
    sourceId: text(record.sourceId),
    sourceFamily: text(record.sourceFamily),
    relationshipType,
    targetId: text(record.targetId),
    targetFamily: text(record.targetFamily),
    effectiveFrom: text(record.effectiveFrom),
    effectiveTo: text(record.effectiveTo),
    evidenceIds: [...new Set(list(record.evidenceIds).map(text).filter(Boolean))],
    status: text(record.status || 'active'),
    errors
  };
}

export function isForbiddenEntailment(sourceRelationship, proposedRelationship) {
  return FORBIDDEN_RELATIONSHIP_ENTAILMENTS.some(
    ([source, target]) => source === sourceRelationship && target === proposedRelationship
  );
}

export function isForbiddenSemanticEntailment(sourceConcept, proposedConcept) {
  const source = text(sourceConcept).toUpperCase();
  const target = text(proposedConcept).toUpperCase();
  return SEMANTIC_NON_ENTAILMENTS.some(
    ([from, to]) => from === source && to === target
  );
}

export function validateDerivedRelationship({
  sourceRelationship = '',
  proposedRelationship = '',
  derivationBasis = [],
  explicitAssertion = false
} = {}) {
  const forbidden = isForbiddenEntailment(sourceRelationship, proposedRelationship);
  const basis = list(derivationBasis).map(text).filter(Boolean);
  if (forbidden && !explicitAssertion) {
    return { valid:false, status:'FORBIDDEN_ENTAILMENT', issues:[`${sourceRelationship} does not entail ${proposedRelationship}.`] };
  }
  if (forbidden && explicitAssertion && basis.length === 0) {
    return { valid:false, status:'INSUFFICIENT_BASIS', issues:[`Explicit ${proposedRelationship} requires an independent basis.`] };
  }
  return { valid:true, status:'PASS', issues:[] };
}

export function validateSemanticEntailment({
  sourceConcept = '',
  proposedConcept = '',
  derivationBasis = [],
  explicitAssertion = false
} = {}) {
  const source = text(sourceConcept).toUpperCase();
  const target = text(proposedConcept).toUpperCase();
  const forbidden = isForbiddenSemanticEntailment(source, target);
  const basis = list(derivationBasis).map(text).filter(Boolean);
  if (forbidden && !explicitAssertion) {
    return { valid:false, status:'FORBIDDEN_SEMANTIC_ENTAILMENT', issues:[`${source} does not entail ${target}.`] };
  }
  if (forbidden && explicitAssertion && basis.length === 0) {
    return { valid:false, status:'INSUFFICIENT_BASIS', issues:[`Explicit ${target} requires an independent basis.`] };
  }
  return { valid:true, status:'PASS', issues:[] };
}

export function canonicalProjection({ canonicalRef = {}, relationships = [], domainRecord = null } = {}) {
  const ref = normalizeCanonicalObjectRef(canonicalRef);
  const rels = relationships.map(normalizeCanonicalRelationship);
  const issues = [...ref.errors, ...rels.flatMap(item => item.errors)];
  return { ref, relationships:rels, domainRecord, status:issues.length ? 'INCOMPLETE' : 'PASS', issues };
}
