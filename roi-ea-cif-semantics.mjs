import { CIF_BINDING, CIF_ACTOR_SUBTYPES, CIF_ABSENCE_STATES, finding, relationshipFindings } from './roi-ea-cif-registry.mjs';
export { CIF_ACTOR_SUBTYPES, CIF_ABSENCE_STATES };
const text = value => typeof value === 'string' ? value.trim() : '';
const list = value => Array.isArray(value) ? value : [];

export function validateControlledAbsence(value, { required = true } = {}) {
  const valid = CIF_ABSENCE_STATES.includes(value) || (!required && value == null);
  return { value, valid, semanticState: CIF_ABSENCE_STATES.includes(value) ? value : undefined,
    issues: valid ? [] : ['An explicit CIF absence state is required; null has storage meaning only.'] };
}

export function objectSemanticFindings(record = {}) {
  const findings = [], add = (code, message, status) => findings.push(finding(code, message, status));
  for(const [subtypes,family] of [[CIF_ACTOR_SUBTYPES,'OF-01'],[CIF_BINDING.epistemic_subtypes,'OF-12'],[CIF_BINDING.decision_subtypes,'OF-16']]) {
    if(subtypes.includes(record.subtype)&&record.family!==family) add('SUBTYPE_FAMILY',`${record.subtype} cannot be assigned to ${record.family}; expected ${family}.`);
  }
  if(record.family==='OF-12'&&!text(record.subtype)) add('EPISTEMIC_SUBTYPE','Epistemic category must be explicit to assess distinctions.','INSUFFICIENT_EVIDENCE');
  if (record.family === 'OF-01' && !CIF_ACTOR_SUBTYPES.includes(record.subtype)) {
    add('ACTOR_SUBTYPE', 'Actor requires a canonical subtype; preserve unclassified legacy data for review.', record.subtype ? 'FAIL' : 'INSUFFICIENT_EVIDENCE');
  }
  if (record.subtype === 'ASSUMPTION_PROPOSITION' && record.family !== 'OF-12') add('ASSUMPTION_FAMILY', 'Assumption Proposition belongs to OF-12.');
  if (['ASSUMPTION_ADOPTION','ASSUMPTION'].includes(record.subtype)) {
    if (record.family !== 'OF-16') add('ASSUMPTION_FAMILY', 'Assumption Adoption belongs to OF-16.');
    for (const field of ['propositionId','actorId','scope','basisRef']) if (!text(record[field])) add('ADOPTION_TRACE', `Assumption Adoption requires ${field}.`, 'INSUFFICIENT_EVIDENCE');
    if (!list(record.relyingIds).length || !list(record.reassessmentTriggerRefs).length) add('ADOPTION_REASSESSMENT', 'Adoption requires relying decision/model/plan references and reassessment triggers.', 'INSUFFICIENT_EVIDENCE');
  }
  if (record.subtype === 'ASSUMPTION_PROPOSITION' && record.epistemicType === 'FACT') add('ASSUMPTION_NOT_FACT', 'Assumption Proposition is not established Fact.');
  if (record.family === 'OF-02' && record.traceabilityMaterial !== false) {
    if (!['STATED','ADOPTED','AUTHORIZED'].includes(record.purposeStatus)) add('PURPOSE_STATUS', 'Purpose must identify whether it is stated, adopted, or authorized.', 'INSUFFICIENT_EVIDENCE');
    for (const field of ['actorId','basisRef','scope']) if (!text(record[field])) add('PURPOSE_TRACE', `Material Purpose requires ${field}.`, 'INSUFFICIENT_EVIDENCE');
  }
  if (record.family === 'OF-02' && record.traceabilityMaterial === false && !text(record.materialityBasisRef)) add('PURPOSE_MATERIALITY', 'Nonmaterial purpose traceability requires its assessment basis.', 'INSUFFICIENT_EVIDENCE');
  if (record.family === 'OF-02' && record.legitimacyEstablishedByCIF === true) add('PURPOSE_LEGITIMACY', 'CIF does not establish purpose legitimacy.');
  for (const [key, value] of Object.entries(record.absenceStates || {})) {
    if (!validateControlledAbsence(value).valid) add('ABSENCE_STATE', `${key}: explicit controlled absence state required.`);
  }
  return findings;
}

export function normalizeCIFActor(record = {}) {
  // Preserve original principal vocabulary; expose a canonical projection separately.
  const aliases = { HUMAN:'HUMAN_PERSON', ROLE:'ROLE_OR_OFFICE' };
  const subtype = record.subtype ?? aliases[record.type] ?? record.type;
  const actor = { ...record, family:'OF-01', subtype };
  return { actor, findings:objectSemanticFindings(actor) };
}

export function deriveAssumes({ proposition = {}, adoption = {}, sourceId, sourceFamily } = {}) {
  const normalizedAdoption = { ...adoption, subtype:adoption.subtype === 'ASSUMPTION' && adoption.family === 'OF-16' ? 'ASSUMPTION_ADOPTION' : adoption.subtype };
  const relationship = {
    id:`${adoption.id}:ASSUMES:${sourceId || adoption.actorId}`, relationshipType:'ASSUMES', representationMode:'DERIVED_VIEW',
    sourceId:sourceId || adoption.actorId, sourceFamily:sourceId && sourceId !== adoption.actorId ? sourceFamily : 'OF-01',
    targetId:proposition.id, targetFamily:proposition.family, targetSubtype:proposition.subtype,
    basisRef:adoption.id, scope:adoption.scope, authoritativeRecord:normalizedAdoption,
    effectiveFrom:adoption.effectiveFrom, effectiveTo:adoption.effectiveTo
  };
  const findings = [...objectSemanticFindings(proposition),...objectSemanticFindings(normalizedAdoption),...relationshipFindings(relationship)];
  if (!text(proposition.id) || !text(adoption.id)) findings.push(finding('MISSING_ID','Proposition and adoption require stable identifiers.'));
  return { relationship, valid:!findings.length, findings, createsFact:false };
}

export function assumptionReassessment({ propositionId, materialChange = false, adoptions = [] } = {}) {
  if (!materialChange) return [];
  return adoptions.filter(a => a.family === 'OF-16' && ['ASSUMPTION','ASSUMPTION_ADOPTION'].includes(a.subtype) && a.propositionId === propositionId)
    .map(a => ({ adoptionId:a.id, propositionId, relyingIds:[...list(a.relyingIds)], triggerRefs:[...list(a.reassessmentTriggerRefs)], status:'REASSESSMENT_REQUIRED' }));
}

// Qualitative, scoped judgments. These dimensions are prompts, never a scalar formula.
export const EXTERNALITY_DIMENSIONS = Object.freeze(['magnitude','plausibility','affectedActors','distribution','duration','reversibility','rightsSafety','dependencyPropagation','delayedEffects','persistence','boundaryDecisionEffect']);
export function assessExternalityMateriality(record = {}) {
  const findings = [];
  if (!text(record.systemBoundary) || !text(record.decisionId)) findings.push(finding('EXTERNALITY_SCOPE','Externality assessment requires decision and system boundary.','INSUFFICIENT_EVIDENCE'));
  for (const key of EXTERNALITY_DIMENSIONS) {
    const assessment = record.dimensions?.[key];
    if (!assessment || !['ASSESSED',...CIF_ABSENCE_STATES].includes(assessment.status) ||
        (['ASSESSED','NOT_APPLICABLE'].includes(assessment.status) && !text(assessment.basis))) {
      findings.push(finding('EXTERNALITY_DIMENSION', `${key} needs a bounded assessment or explicit absence state.`, 'INSUFFICIENT_EVIDENCE'));
    } else if (!['ASSESSED','NOT_APPLICABLE'].includes(assessment.status)) findings.push(finding('EXTERNALITY_UNDETERMINED', `${key} remains ${assessment.status}.`, 'INSUFFICIENT_EVIDENCE'));
  }
  if (!['MATERIAL','NOT_MATERIAL',...CIF_ABSENCE_STATES].includes(record.materiality) || !text(record.materialityBasis)) findings.push(finding('MATERIALITY_JUDGMENT','Materiality requires an explicit judgment and basis.','INSUFFICIENT_EVIDENCE'));
  if (record.materiality === 'MATERIAL' && record.dimensions?.boundaryDecisionEffect?.changesDecision === true && !text(record.expandedBoundary)) findings.push(finding('BOUNDARY_EXPANSION','A plausibly material decision-changing externality requires boundary expansion.'));
  return { assessment:structuredClone(record), findings, valid:!findings.length, scalarScore:null,
    boundaryExpansionRequired:record.materiality === 'MATERIAL' && record.dimensions?.boundaryDecisionEffect?.changesDecision === true };
}

export const CIF_COMPATIBILITY_VERSION = CIF_BINDING.schema_version;
