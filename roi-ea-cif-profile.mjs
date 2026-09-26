import { finding } from './roi-ea-cif-registry.mjs';
import { normalizeCanonicalObjectRef, normalizeCanonicalRelationship, validateDerivedRelationship, validateSemanticEntailment } from './roi-ea-canonical-model.mjs';
import { objectSemanticFindings } from './roi-ea-cif-semantics.mjs';
import { evaluateCIFValidation } from './roi-ea-cif-validation-model.mjs';

// Keys are application evidence-binding names for specification §12 obligations,
// not new Core concepts, object families, or invariants.
export const PROFILE_OBLIGATIONS = Object.freeze({
  'CIF-Lite':Object.freeze(['decisionAuthority','epistemicDistinctions','provenanceEffectiveTime','externalExpertiseBoundaries','reassessmentTriggers','applicableCoreRules']),
  'CIF-Governed':Object.freeze(['capability','dependency','trustState','reliance','ruleObligation','controlOperation','handoffAcceptance','governedRelationships']),
  'CIF-Full':Object.freeze(['materialFamiliesSpecializations','historicalReconstruction','authoritativeRepresentations','dependencyImpactReassessment','explicitRCVLimitations'])
});
const present = value => typeof value === 'string' && value.trim().length > 0;
const ids = value => Array.isArray(value) && value.length > 0 && value.every(present);
const liteCoverage = ['OF-02','OF-03','OF-06','OF-01','OF-16','OF-15','OF-12','OF-18','OF-05','OF-22'];

export function evaluateCIFProfile(record = {}) {
  const profile = record.profileSelected, findings = [], levels=Object.keys(PROFILE_OBLIGATIONS);
  const add = (code,message,status='INSUFFICIENT_EVIDENCE') => findings.push(finding(code,message,status));
  if (!levels.includes(profile)) return { profile,conformance:'INSUFFICIENT_EVIDENCE',findings:[finding('PROFILE_REQUIRED','Select a registered CIF profile.','INSUFFICIENT_EVIDENCE')] };
  const objects=Array.isArray(record.canonicalObjects)?record.canonicalObjects:[],relationships=Array.isArray(record.relationships)?record.relationships:[];
  const byId = new Map();
  for (const object of objects) {
    const id=object.canonicalId||object.id;
    if (!present(id)) add('OBJECT_ID','Profile objects require stable IDs.','FAIL');
    if(byId.has(id)) add('DUPLICATE_OBJECT','Duplicate canonical object identity.','FAIL');
    byId.set(id,object);
    findings.push(...objectSemanticFindings(object));
    const normalized=normalizeCanonicalObjectRef(object);
    for(const error of normalized.errors) if(!findings.some(f=>f.message===error)) add('OBJECT_STRUCTURE',error,'FAIL');
  }
  for (const family of liteCoverage) {
    if (!objects.some(o=>o.family===family)) {
      const coverage=record.coverage?.[family];
      if(coverage?.status!=='NOT_APPLICABLE'||!present(coverage.basisRef)||!present(coverage.scope)) add('PROFILE_COVERAGE',`${family} modeling coverage requires records or an explicit scoped non-applicability assessment.`);
    }
  }
  if(!ids(record.decisionIds)||record.decisionIds.some(id=>byId.get(id)?.family!=='OF-16')) add('CONSEQUENTIAL_DECISION','Identify and resolve the consequential decision.');
  if(!ids(record.authorityIds)||record.authorityIds.some(id=>byId.get(id)?.family!=='OF-15')) add('DECISION_AUTHORITY','Identify and resolve decision authority.');
  for (const rel of relationships) {
    const source=byId.get(rel.sourceId),target=byId.get(rel.targetId);
    if(!source||!target) add('DANGLING_RELATIONSHIP',`Relationship ${rel.id} has an unresolved endpoint.`);
    if(source&&rel.sourceFamily&&rel.sourceFamily!==source.family || target&&rel.targetFamily&&rel.targetFamily!==target.family) add('ENDPOINT_CONFLICT','Relationship endpoint family conflicts with object.','FAIL');
    if(source&&rel.sourceSubtype&&rel.sourceSubtype!==source.subtype || target&&rel.targetSubtype&&rel.targetSubtype!==target.subtype) add('ENDPOINT_CONFLICT','Relationship endpoint subtype conflicts with object.','FAIL');
    const normalized=normalizeCanonicalRelationship({...rel,sourceFamily:source?.family??rel.sourceFamily,sourceSubtype:source?.subtype??rel.sourceSubtype,
      targetFamily:target?.family??rel.targetFamily,targetSubtype:target?.subtype??rel.targetSubtype,
      authoritativeRecord:byId.get(rel.authoritativeRecordRef||rel.basisRef)??rel.authoritativeRecord});
    findings.push(...normalized.findings);
    for(const error of normalized.errors) if(!normalized.findings.some(f=>f.message===error)) add('RELATIONSHIP_STRUCTURE',error,'FAIL');
  }
  for (const inference of record.inferences||[]) {
    const check=inference.sourceRelationship?validateDerivedRelationship(inference):validateSemanticEntailment(inference);
    if(!check.valid) add(check.status,check.issues.join(' '),'FAIL');
  }
  const required=levels.slice(0,levels.indexOf(profile)+1).flatMap(level=>PROFILE_OBLIGATIONS[level]);
  const materialFamilies={capability:'OF-07',dependency:'OF-09',trustState:'OF-10',reliance:'OF-11',ruleObligation:'OF-14',controlOperation:'OF-21',handoffAcceptance:'OF-20'};
  for(const key of required) {
    const assessment=record.obligationAssessments?.[key];
    if(assessment?.status==='VIOLATED') {add('PROFILE_OBLIGATION',`${key}: known material violation.`,'FAIL');continue;}
    if(assessment?.status==='NOT_APPLICABLE') {
      if(PROFILE_OBLIGATIONS['CIF-Lite'].includes(key)||!present(assessment.basisRef)||!present(assessment.scope)||assessment.material!==false) add('PROFILE_APPLICABILITY',`${key}: missing or invalid nonmateriality basis.`);
      if(key==='handoffAcceptance'&&objects.some(o=>o.family==='OF-19')) add('HANDOFF_ACCEPTANCE','A material handoff requires its acceptance assessment.','FAIL');
      continue;
    }
    if(assessment?.status!=='SATISFIED'||!ids(assessment.evidenceRefs)||!present(assessment.basisRef)||!present(assessment.scope)||!present(assessment.assessorRef)) {
      add('PROFILE_OBLIGATION',`${key}: needs a scoped evidence-backed assessment; a profile label does not establish conformance.`);continue;
    }
    if(assessment.evidenceRefs.some(id=>byId.get(id)?.family!=='OF-12')||byId.get(assessment.assessorRef)?.family!=='OF-01') add('ASSESSMENT_REFERENCES',`${key}: assessment evidence/assessor must resolve to supplied Epistemic Objects and Actors.`);
    if(materialFamilies[key]&&!objects.some(o=>o.family===materialFamilies[key])) add('MATERIAL_FAMILY',`${key}: the material governed object is missing.`);
  }
  if(profile==='CIF-Full') {
    for(const family of record.requiredFamilies||[]) if(!objects.some(o=>o.family===family)) add('MATERIAL_FAMILY',`Required material family ${family} is missing.`);
    for(const id of record.requiredSpecializationIds||[]) if(!record.specializationIds?.includes(id)) add('SPECIALIZATION',`Required specialization ${id} is missing.`);
    if(!record.validationResultId||!Array.isArray(record.limitations)||record.validationResult?.id!==record.validationResultId) add('RCV_FINDINGS','Full requires explicit R/C/V findings and limitations.');
    else {
      const validation=evaluateCIFValidation(record.validationResult);
      if(!validation.valid||['INSUFFICIENT_EVIDENCE','NOT_APPLICABLE'].includes(validation.result.conformance)) add('RCV_FINDINGS','Full requires assessable R/C/V findings for its material conclusions.',validation.result.conformance==='FAIL'?'FAIL':'INSUFFICIENT_EVIDENCE');
    }
  }
  findings.push(...(record.materialFindings||[]));
  const conformance=findings.some(f=>f.status==='FAIL')?'FAIL':findings.length?'INSUFFICIENT_EVIDENCE':'PASS';
  return {profile,conformance,findings,evidenceBoundary:'Recorded assessment evidence; no external validation inferred.'};
}
