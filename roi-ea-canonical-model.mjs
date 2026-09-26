import { CIF_RELATIONSHIPS, CIF_RELATIONSHIP_REPRESENTATION_MODES, CIF_RELATIONSHIP_DEFINITIONS, relationshipFindings } from './roi-ea-cif-registry.mjs';
export { CIF_RELATIONSHIPS, CIF_RELATIONSHIP_REPRESENTATION_MODES, CIF_RELATIONSHIP_DEFINITIONS } from './roi-ea-cif-registry.mjs';
import { objectSemanticFindings } from './roi-ea-cif-semantics.mjs';
/**
 * ROI-Driven Enterprise Architect — CIF v0.4.1 canonical projection foundation.
 *
 * Additive compatibility module. It does not replace FACEM, BACRM,
 * authority-model, FEOA, economics, or consultant-workflow domain records.
 * Canonical projection is descriptive and must not create materially different
 * relationships by implication.
 */
export const CIF_FRAMEWORK_VERSION = '0.4.1';
export const CIF_RELATIONSHIP_GRAMMAR_VERSION = '0.4.1';

export const CIF_OBJECT_FAMILIES = Object.freeze({
  ACTOR:'OF-01', PURPOSE:'OF-02', OUTCOME:'OF-03', VALUE:'OF-04',
  CONSEQUENCE:'OF-05', CONTEXT_SYSTEM:'OF-06', CAPABILITY:'OF-07',
  RESOURCE:'OF-08', DEPENDENCY:'OF-09', TRUST_STATE:'OF-10', RELIANCE:'OF-11',
  EPISTEMIC:'OF-12', SEMANTIC_MAPPING:'OF-13', RULE_OBLIGATION:'OF-14',
  AUTHORITY_DELEGATION:'OF-15', DECISION:'OF-16', COMMITMENT:'OF-17',
  ACTION:'OF-18', HANDOFF:'OF-19', ACCEPTANCE:'OF-20',
  CONTROL_INTERVENTION_RECOURSE:'OF-21', LIFECYCLE:'OF-22'
});
export const CIF_EPISTEMIC_TYPES = Object.freeze([
  'CLAIM','EVIDENCE','EVIDENCE_ASSERTION','VERIFICATION','FACT',
  'INFERENCE','RECOMMENDATION','FORECAST','ASSUMPTION_PROPOSITION'
]);
export const CIF_CAUSAL_ROLES = Object.freeze([
  'AMPLIFYING','MITIGATING','PREVENTIVE'
]);
export const FORBIDDEN_RELATIONSHIP_ENTAILMENTS = Object.freeze([
  ['DEPENDS_ON','RELIES_ON'],['RELIES_ON','DEPENDS_ON'],
  ['OCCUPIES_ROLE','POSSESSES_AUTHORITY'],['REPRESENTS','POSSESSES_AUTHORITY'],
  ['ACTS_ON_BEHALF_OF','ACCOUNTABLE_FOR'],['RECEIVES','ACCEPTS'],
  ['HAS_ACCESS_TO','IS_PERMITTED_TO'],['AUTHENTICATES_AS','IS_PERMITTED_TO'],
  ['IS_PERMITTED_TO','POSSESSES_AUTHORITY'],['POSSESSES_AUTHORITY','ACCOUNTABLE_FOR'],
  ['RESPONSIBLE_FOR','ACCOUNTABLE_FOR'],['PERFORMS','RESPONSIBLE_FOR'],
  ['PERFORMS','ACCOUNTABLE_FOR'],['DEPENDS_ON','IS_MEMBER_OF'],
  ['REQUESTS','MAKES_COMMITMENT'],['OFFERS','ACCEPTS'],['TRANSMITS','RECEIVES'],
  ['RECEIVES','VALIDATES'],['VALIDATES','ACCEPTS'],['ACCEPTS','PERFORMS'],
  ['PERFORMS','COMPLETES'],['PRECEDES','CONTRIBUTES_CAUSALLY_TO'],
  ['DEPENDS_ON','CONTRIBUTES_CAUSALLY_TO'],['CORRECTS','SUPERSEDES'],
  ['RECOVERS_FROM','REACTIVATES'],['IS_MEMBER_OF','CONSENTS_TO'],
  ['IS_PERMITTED_TO','CONSENTS_TO'],['ACCEPTS','CONSENTS_TO'],
  ['POSSESSES_AUTHORITY','CONSENTS_TO']
]);
export const SEMANTIC_NON_ENTAILMENTS = Object.freeze([
  ['DEPENDENCY','RELIANCE'],['RELIANCE','DEPENDENCY'],
  ['ROLE_OCCUPANCY','AUTHORITY'],['REPRESENTATION','AUTHORITY'],
  ['ACTS_ON_BEHALF_OF','ACCOUNTABILITY_TRANSFER'],['MACHINE_EXECUTION','INSTITUTIONAL_ACCOUNTABILITY'],
  ['ASSUMPTION_PROPOSITION','ASSUMPTION_ADOPTION'],['ASSUMPTION_ADOPTION','FACT'],['RECEIPT','ACCEPTANCE'],
  ['CAPABILITY','AUTHORITY'],['ACCESS','PERMISSION'],['AUTHENTICATION','AUTHORIZATION'],
  ['EVIDENCE','FACT'],['FACT','INFERENCE'],['INFERENCE','RECOMMENDATION'],
  ['RECOMMENDATION','DECISION'],['FORECAST','FACT'],['CONFIDENCE','PROBABILITY'],
  ['PROBABILITY','EVIDENCE_QUALITY'],['CONFIDENCE','AUTHORITY'],
  ['POSSESSION','RELIANCE'],['RELIANCE','INHERITANCE'],['TRUST','AUTHORITY'],
  ['DEPENDENCY','MEMBERSHIP'],['REQUEST','COMMITMENT'],['OFFER','ACCEPTANCE'],
  ['TRANSMISSION','RECEIPT'],['RECEIPT','VALIDATION'],['VALIDATION','ACCEPTANCE'],
  ['ACCEPTANCE','EXECUTION'],['EXECUTION','COMPLETION'],['COMPLETION','OUTCOME'],
  ['OUTCOME','VALUE'],['METRIC','OUTCOME'],['TARGET_ACHIEVEMENT','VALUE_REALIZATION'],
  ['EXECUTION','ACCOUNTABILITY'],['AUTHORITY','ACCOUNTABILITY'],
  ['RESPONSIBILITY','ACCOUNTABILITY'],['COMMITMENT','ACCOUNTABILITY'],
  ['RESPONSIBILITY','AUTHORITY'],['RESPONSIBILITY','COMMITMENT'],
  ['RESPONSIBILITY','PERFORMANCE'],['SEQUENCE','CAUSATION'],['CORRELATION','CAUSATION'],
  ['DEPENDENCY','CAUSATION'],['RESPONSIBILITY','CAUSATION'],['ACCOUNTABILITY','CAUSATION'],
  ['CAUSAL_CONTRIBUTION','LEGAL_LIABILITY'],['CORRECTION','HISTORICAL_ERASURE'],
  ['CORRECTION','SUPERSESSION'],['CHANGED_VALIDITY','CORRECTION'],
  ['SHARED_EVIDENCE','SHARED_DECISION'],['SAME_SOURCE_VALUE','SAME_SEMANTIC_MEANING'],
  ['TECHNICAL_CONTINUITY','SEMANTIC_CONTINUITY'],
  ['TECHNICAL_RECOVERY','ASSURANCE_RESTORATION'],
  ['ASSURANCE_RESTORATION','AUTHORIZED_RESUMPTION'],
  ['TECHNICAL_RECOVERY','AUTHORIZED_RESUMPTION'],
  ['PARTICIPATION','CONSENT'],['PERMISSION','CONSENT'],['ACCEPTANCE','CONSENT'],
  ['AUTHORITY','CONSENT'],['MEMBERSHIP','CONSENT'],['PRIOR_USE','CONSENT'],['SILENCE','CONSENT'],
  ['CLASSIFICATION','RISK_ASSESSMENT'],['CLASSIFICATION','AUTHORIZATION'],
  ['CLASSIFICATION','SAFETY_VALIDATION'],['CLASSIFICATION','VALUE_JUDGMENT'],
  ['SWARM_COMPONENT_CLASSIFICATION','SWARM_SYSTEM_CLASSIFICATION'],
  ['AGENT_CLASSIFICATION','AGENT_SYSTEM_CLASSIFICATION']
]);
const text=v=>String(v??'').trim();
const list=v=>Array.isArray(v)?v:v==null?[]:[v];
const unique=v=>[...new Set(list(v).map(text).filter(Boolean))];

export function normalizeCanonicalObjectRef(record={}) {
  const id=text(record.canonicalId||record.id), family=text(record.family), errors=[];
  if(!id) errors.push('canonicalId is required.');
  if(!Object.values(CIF_OBJECT_FAMILIES).includes(family)) errors.push('family is not a recognized CIF object family.');
  if(!text(record.domainType)) errors.push('domainType is required.');
  if(!text(record.domainId)) errors.push('domainId is required.');
  errors.push(...objectSemanticFindings(record).map(x=>x.message));
  return {
    ...record,
    canonicalId:id,family,domainType:text(record.domainType),domainId:text(record.domainId),
    frameworkVersion:record.frameworkVersion === undefined ? CIF_FRAMEWORK_VERSION : record.frameworkVersion,
    recordVersion:record.recordVersion ?? record.version ?? '',schemaVersion:record.schemaVersion ?? '',specializationVersion:record.specializationVersion ?? '',
    state:text(record.state||record.status||'active'),effectiveFrom:text(record.effectiveFrom),
    effectiveTo:text(record.effectiveTo),recordedAt:text(record.recordedAt),
    ownerRef:text(record.ownerRef),contextRef:text(record.contextRef),
    provenanceRef:text(record.provenanceRef),evidenceRefs:unique(record.evidenceRefs||record.evidenceIds),
    limitationRefs:unique(record.limitationRefs),reassessmentTriggerRefs:unique(record.reassessmentTriggerRefs),
    supersedesRef:text(record.supersedesRef),supersededByRef:text(record.supersededByRef),
    sourceModule:text(record.sourceModule),errors
  };
}

export function normalizeCanonicalRelationship(record={}) {
  const relationshipType=text(record.relationshipType);
  const def=CIF_RELATIONSHIP_DEFINITIONS[relationshipType]||null;
  const representationMode=text(record.representationMode||def?.authoritativeRepresentation||'ASSERTED_EDGE').toUpperCase();
  const errors=[];
  if(!text(record.id)) errors.push('relationship id is required.');
  if(!text(record.sourceId)) errors.push('sourceId is required.');
  if(!text(record.targetId)) errors.push('targetId is required.');
  if(!CIF_RELATIONSHIPS.includes(relationshipType)) errors.push('relationshipType is not in the CIF relationship grammar.');
  if(!CIF_RELATIONSHIP_REPRESENTATION_MODES.includes(representationMode)) errors.push('representationMode is not recognized.');
  if(def&&representationMode!==def.authoritativeRepresentation) errors.push(`${relationshipType} authoritative representation is ${def.authoritativeRepresentation}.`);
  if(def?.requiresBasis&&!text(record.basisRef)) errors.push(`${relationshipType} requires basisRef.`);
  if(def?.requiresScope&&!text(record.scopeRef||record.scope)) errors.push(`${relationshipType} requires scope.`);
  const findings=relationshipFindings({...record,relationshipType,representationMode});
  errors.push(...findings.map(x=>x.message));
  return {
    ...record, findings,
    id:text(record.id),relationshipType,representationMode,sourceId:text(record.sourceId),
    sourceFamily:text(record.sourceFamily),targetId:text(record.targetId),targetFamily:text(record.targetFamily),
    scope:text(record.scope),scopeRef:text(record.scopeRef),contextRef:text(record.contextRef),
    basisRef:text(record.basisRef),purposeRef:text(record.purposeRef),
    state:text(record.state||record.status||'active'),effectiveFrom:text(record.effectiveFrom),
    effectiveTo:text(record.effectiveTo),recordedAt:text(record.recordedAt),
    provenanceRef:text(record.provenanceRef),conditionRefs:unique(record.conditionRefs||record.conditions),
    limitationRefs:unique(record.limitationRefs||record.limitations),
    evidenceRefs:unique(record.evidenceRefs||record.evidenceIds),
    reassessmentTriggerRefs:unique(record.reassessmentTriggerRefs),
    supersedesRef:text(record.supersedesRef),supersededByRef:text(record.supersededByRef),errors:[...new Set(errors)]
  };
}

export function validateDerivedRelationship({sourceRelationship='',proposedRelationship='',derivationBasis=[],explicitAssertion=false}={}) {
  if (![sourceRelationship,proposedRelationship].every(x=>CIF_RELATIONSHIPS.includes(x))) return {valid:false,status:'UNREGISTERED_RELATIONSHIP',issues:['Unknown relationship cannot establish a CIF derivation.']};
  const forbidden=FORBIDDEN_RELATIONSHIP_ENTAILMENTS.some(([s,t])=>s===sourceRelationship&&t===proposedRelationship);
  const basis=unique(derivationBasis);
  if(forbidden&&!explicitAssertion) return {valid:false,status:'FORBIDDEN_ENTAILMENT',issues:[`${sourceRelationship} does not entail ${proposedRelationship}.`]};
  if(forbidden&&explicitAssertion&&!basis.length) return {valid:false,status:'INSUFFICIENT_BASIS',issues:[`Explicit ${proposedRelationship} requires an independent basis.`]};
  if(sourceRelationship!==proposedRelationship&&(!explicitAssertion||!basis.length)) return {valid:false,status:'INDEPENDENT_BASIS_REQUIRED',issues:['Distinct material relationships require an independent explicit assertion and basis.']};
  return {valid:true,status:'PASS',issues:[]};
}
export function validateSemanticEntailment({sourceConcept='',proposedConcept='',derivationBasis=[],explicitAssertion=false}={}) {
  const s=text(sourceConcept).toUpperCase(),t=text(proposedConcept).toUpperCase();
  const forbidden=SEMANTIC_NON_ENTAILMENTS.some(([a,b])=>a===s&&b===t),basis=unique(derivationBasis);
  if(forbidden&&!explicitAssertion) return {valid:false,status:'FORBIDDEN_SEMANTIC_ENTAILMENT',issues:[`${s} does not entail ${t}.`]};
  if(forbidden&&explicitAssertion&&!basis.length) return {valid:false,status:'INSUFFICIENT_BASIS',issues:[`Explicit ${t} requires an independent basis.`]};
  if(!s||!t||s!==t&&(!explicitAssertion||!basis.length)) return {valid:false,status:'INDEPENDENT_BASIS_REQUIRED',issues:['Distinct material concepts cannot be inferred without independent basis.']};
  return {valid:true,status:'PASS',issues:[]};
}
export function canonicalProjection({canonicalRef={},relationships=[],domainRecord=null}={}) {
  const ref=normalizeCanonicalObjectRef(canonicalRef),rels=relationships.map(normalizeCanonicalRelationship);
  const issues=[...ref.errors,...rels.flatMap(x=>x.errors)];
  return {ref,relationships:rels,domainRecord,status:issues.length?'INCOMPLETE':'PASS',issues};
}
