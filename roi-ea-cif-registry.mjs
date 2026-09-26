import sourceRegistry from './schemas/cif-roi-ea-v0.4.1/CIF_Relationships.json' with { type: 'json' };
import sourceBinding from './schemas/cif-roi-ea-v0.4.1/binding.json' with { type: 'json' };

const freeze = value => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};
export const CIF_BINDING = freeze(structuredClone(sourceBinding));
export const CIF_ACTOR_SUBTYPES = CIF_BINDING.actor_subtypes;
export const CIF_ABSENCE_STATES = CIF_BINDING.absence_states;
export const familyId = name => {
  const index = CIF_BINDING.family_names.indexOf(name);
  return index < 0 ? name : `OF-${String(index + 1).padStart(2, '0')}`;
};
const family = value => /^OF-(0[1-9]|1[0-9]|2[0-2])$/.test(value);
const present = value => typeof value === 'string' && value.trim().length > 0;
const date = value => present(value) && Number.isFinite(Date.parse(value));
export const finding = (code, message, status = 'FAIL') => ({ code, message, status });

export function parseRelationshipRegistry(input) {
  const registry = typeof input === 'string' ? JSON.parse(input) : structuredClone(input);
  if (registry?.registry_id !== 'CIF-RELREG-0.4.1' || registry.framework_version !== '0.4.1' ||
      !Array.isArray(registry.relationships) || registry.relationship_count !== 60 || registry.relationships.length !== 60) {
    throw new Error('Invalid CIF v0.4.1 registry identity or count.');
  }
  const modes = ['OBJECT_REIFIED','RELATIONSHIP_RECORD','DERIVED_VIEW','EVENT_DERIVED','ASSERTED_EDGE'];
  if (!Array.isArray(registry.representation_modes) || registry.representation_modes.length !== modes.length ||
      modes.some(mode => !registry.representation_modes.includes(mode))) throw new Error('Invalid registry modes.');
  const types = new Set();
  for (const row of registry.relationships) {
    if (!present(row.relationship_type) || types.has(row.relationship_type)) throw new Error('Duplicate or missing relationship type.');
    types.add(row.relationship_type);
    if (!modes.includes(row.authoritative_representation)) throw new Error('Invalid authoritative mode.');
    for (const field of ['allowed_source','allowed_target']) {
      if (!Array.isArray(row[field]) || !row[field].length || row[field].some(x => !family(x) && x !== 'ANY_GOVERNED_OBJECT' && !CIF_ACTOR_SUBTYPES.includes(x))) {
        throw new Error(`Invalid ${field} for ${row.relationship_type}.`);
      }
    }
    for (const field of ['basis_requirement','scope_requirement']) {
      if (!['MUST','SHOULD','MAY'].includes(row[field])) throw new Error(`Invalid ${field}.`);
    }
    if (!present(row.notes)) throw new Error('Missing registry constraint notes.');
  }
  return freeze(registry);
}
export const CIF_REGISTRY = parseRelationshipRegistry(sourceRegistry);
export const CIF_RELATIONSHIPS = Object.freeze(CIF_REGISTRY.relationships.map(row => row.relationship_type));
export const CIF_RELATIONSHIP_REPRESENTATION_MODES = CIF_REGISTRY.representation_modes;
export const CIF_RELATIONSHIP_DEFINITIONS = freeze(Object.fromEntries(CIF_REGISTRY.relationships.map(row => [row.relationship_type, {
  ...row, authoritativeRepresentation: row.authoritative_representation,
  requiresBasis: row.basis_requirement === 'MUST', requiresScope: row.scope_requirement === 'MUST'
}])));

// These rules implement the prose in registry notes and specification §§4.4–4.6.
// The registry above remains the only list of types, modes, endpoints, basis and scope.
export function relationshipFindings(record) {
  const result = [], type = record.relationshipType, def = CIF_RELATIONSHIP_DEFINITIONS[type];
  const add = (code, message, status) => result.push(finding(code, message, status));
  if (!def) return [finding('UNREGISTERED_RELATIONSHIP', `Unregistered relationship: ${type}.`)];
  for (const side of ['source','target']) {
    const f = record[`${side}Family`], subtype = record[`${side}Subtype`];
    if (!present(f)) add('MISSING_ENDPOINT_FAMILY', `${side} family is required to assess conformance.`, 'INSUFFICIENT_EVIDENCE');
    else if (!family(f) || !def[`allowed_${side}`].some(x => x === f || x === 'ANY_GOVERNED_OBJECT' || (f === 'OF-01' && x === subtype))) {
      add('INVALID_ENDPOINT', `${type} does not permit ${side} family/subtype ${f}/${subtype || ''}.`);
    }
    if (f === 'OF-01' && subtype && !CIF_ACTOR_SUBTYPES.includes(subtype)) add('INVALID_ACTOR_SUBTYPE', `${side} Actor subtype is not canonical.`);
  }
  if (record.representationMode !== def.authoritativeRepresentation) add('INVALID_REPRESENTATION', `${type} authoritative representation is ${def.authoritativeRepresentation}.`);
  if (def.requiresBasis && !present(record.basisRef)) add('MISSING_BASIS', `${type} requires basisRef.`, 'INSUFFICIENT_EVIDENCE');
  if (def.requiresScope && !present(record.scopeRef || record.scope)) add('MISSING_SCOPE', `${type} requires scope.`, 'INSUFFICIENT_EVIDENCE');
  for (const field of ['effectiveFrom','effectiveTo']) if (record[field] && !date(record[field])) add('INVALID_TIME', `${field} must be a valid effective time.`);
  if (date(record.effectiveFrom) && date(record.effectiveTo) && Date.parse(record.effectiveFrom) >= Date.parse(record.effectiveTo)) add('INVALID_PERIOD', 'Effective period must end after it starts.');
  if (['OCCUPIES_ROLE','REPRESENTS','CONSENTS_TO'].includes(type)) {
    if (!date(record.effectiveFrom) || !date(record.effectiveTo)) add('MISSING_EFFECTIVE_PERIOD', `${type} requires a bounded effective period.`, 'INSUFFICIENT_EVIDENCE');
  }
  if (type === 'ACTS_ON_BEHALF_OF' && !present(record.contextRef)) add('MISSING_CONTEXT', 'ACTS_ON_BEHALF_OF requires its action/decision context.', 'INSUFFICIENT_EVIDENCE');
  if (type === 'OCCUPIES_ROLE') {
    if (record.targetSubtype !== 'ROLE_OR_OFFICE') add('ROLE_TARGET', 'OCCUPIES_ROLE target must be ROLE_OR_OFFICE.', record.targetSubtype ? 'FAIL' : 'INSUFFICIENT_EVIDENCE');
    if (record.sourceSubtype !== 'HUMAN_PERSON' && !present(record.occupancyBasisRef)) add('OCCUPANCY_REVIEW', 'Nonstandard or unidentified occupant requires an explicit occupancy basis for review.', 'INSUFFICIENT_EVIDENCE');
  }
  if (type === 'ACCOUNTABLE_FOR' && !CIF_BINDING.institutional_actor_subtypes.includes(record.sourceSubtype)) {
    // Evidence is supplied externally; this validator never invents a regime.
    const regime = record.externalGovernance;
    const established = regime?.status === 'ESTABLISHED_FOR_SCOPE' && present(regime.regimeRef) && present(regime.authorityRef) &&
      present(regime.evidenceRef) && regime.actorId === record.sourceId && regime.subjectId === record.targetId &&
      regime.scope === (record.scopeRef || record.scope) && date(regime.effectiveFrom) && date(regime.effectiveTo) &&
      date(record.effectiveFrom) && date(record.effectiveTo) && Date.parse(regime.effectiveFrom) <= Date.parse(record.effectiveFrom) &&
      Date.parse(regime.effectiveTo) >= Date.parse(record.effectiveTo);
    if (!established) add('INSTITUTIONAL_ACCOUNTABILITY', 'Institutional accountability requires an institutional Actor or independently established applicable external governance.', record.sourceSubtype ? 'FAIL' : 'INSUFFICIENT_EVIDENCE');
  }
  if (type === 'ASSUMES') {
    if (record.targetSubtype !== 'ASSUMPTION_PROPOSITION') add('ASSUMPTION_TARGET', 'ASSUMES target must be an Assumption Proposition.', record.targetSubtype ? 'FAIL' : 'INSUFFICIENT_EVIDENCE');
    const adoption = record.authoritativeRecord;
    if (adoption?.family !== 'OF-16' || !['ASSUMPTION_ADOPTION','ASSUMPTION'].includes(adoption.subtype) ||
        adoption.id !== record.basisRef || adoption.propositionId !== record.targetId ||
        ![adoption.actorId,...(adoption.relyingIds || [])].includes(record.sourceId) ||
        adoption.scope !== (record.scopeRef || record.scope) || !present(adoption.basisRef)) {
      add('ASSUMPTION_ADOPTION_REQUIRED', 'ASSUMES must project a matching governed OF-16 Assumption Adoption.', 'INSUFFICIENT_EVIDENCE');
    }
  }
  if (['OBJECT_REIFIED','EVENT_DERIVED','DERIVED_VIEW'].includes(def.authoritativeRepresentation) && type !== 'ASSUMES') {
    if (!present(record.authoritativeRecordRef) || !record.authoritativeRecord) add('AUTHORITATIVE_RECORD_REQUIRED', `${type} requires its authoritative object/event/derivation record.`, 'INSUFFICIENT_EVIDENCE');
    else if (record.authoritativeRecord.id !== record.authoritativeRecordRef) add('AUTHORITATIVE_RECORD_MISMATCH', 'Authoritative record reference does not match its record.');
    // Object-reified notes identify the owning family; parse rather than duplicate the registry.
    const familyNames={Authority:'OF-15',Commitment:'OF-17',Decision:'OF-16'};
    const expected = def.notes.match(/(?:carried by|from effective) (?:an? )?(OF-\d\d)/)?.[1] ||
      Object.entries(familyNames).find(([name])=>def.notes.includes(`from effective ${name} records`)||def.notes.includes(`${name} object is authoritative`))?.[1];
    if (expected && record.authoritativeRecord && record.authoritativeRecord.family !== expected) add('AUTHORITATIVE_FAMILY', `${type} requires authoritative ${expected}.`);
    if(record.authoritativeRecord && (record.authoritativeRecord.sourceId!==record.sourceId || record.authoritativeRecord.targetId!==record.targetId)) add('AUTHORITATIVE_ENDPOINTS', 'Authoritative record must explicitly support these endpoints.', 'INSUFFICIENT_EVIDENCE');
  }
  if (type === 'CONTRIBUTES_CAUSALLY_TO') {
    for (const key of ['causalClaim','attributionStatus','effectiveFrom','effectiveTo']) if (!present(record[key])) add('CAUSAL_BASIS', `Causal attribution requires ${key}.`, 'INSUFFICIENT_EVIDENCE');
    if (!record.evidenceRefs?.length || !Array.isArray(record.limitationRefs)) add('CAUSAL_EVIDENCE', 'Causal attribution requires evidence and explicit limitations.', 'INSUFFICIENT_EVIDENCE');
  }
  if (type === 'CONSENTS_TO' && (!present(record.purposeRef) || !record.evidenceRefs?.length)) add('CONSENT_EVIDENCE', 'Consent requires purpose and independent evidence.', 'INSUFFICIENT_EVIDENCE');
  if (['APPLIES_TO','REQUIRES','PROHIBITS','PERMITS'].includes(type) && !present(record.ruleScopeBasisRef)) add('RULE_SCOPE', 'Rule target materiality to the cited scope needs an assessment basis.', 'INSUFFICIENT_EVIDENCE');
  if (['MAPS_TO','TRANSFORMS_TO','DERIVED_FROM'].includes(type) && !present(record.provenanceRef)) add('SEMANTIC_PROVENANCE', 'Mapping/derivation requires provenance.', 'INSUFFICIENT_EVIDENCE');
  if (type === 'TRANSFORMS_TO' && !present(record.methodRef)) add('TRANSFORMATION_METHOD', 'Transformation requires method.', 'INSUFFICIENT_EVIDENCE');
  if (type === 'MAPS_TO' && (!present(record.contextRef) || !present(record.mappingVersion))) add('MAPPING_CONTEXT', 'Mapping requires context/version or a documented nonmateriality assessment.', 'INSUFFICIENT_EVIDENCE');
  if (type === 'REACTIVATES' && !present(record.authorizedResumptionRef)) add('AUTHORIZED_RESUMPTION', 'Technical recovery does not establish authorized resumption.', 'INSUFFICIENT_EVIDENCE');
  const recommendedTargets={SUPPORTED_BY:['EVIDENCE','VERIFICATION'],INFERS:['INFERENCE','FORECAST'],RECOMMENDS:['RECOMMENDATION']};
  if(recommendedTargets[type]&&!recommendedTargets[type].includes(record.targetSubtype)&&!present(record.subtypeExceptionBasisRef)) add('SUBTYPE_REVIEW', `${type} target subtype requires review against registry guidance.`, 'INSUFFICIENT_EVIDENCE');
  if(type==='SUPERSEDES'&&record.sourceFamily!==record.targetFamily&&!present(record.crossFamilyBasisRef)) add('SUPERSESSION_FAMILY', 'Cross-family supersession requires an explicit basis; history must remain reconstructable.', 'INSUFFICIENT_EVIDENCE');
  return result;
}
