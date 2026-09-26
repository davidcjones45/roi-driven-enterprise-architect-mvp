import { CIF_BINDING, familyId } from './roi-ea-cif-registry.mjs';
import { objectSemanticFindings } from './roi-ea-cif-semantics.mjs';

const aliases = { effective_from:'effectiveFrom',effective_to:'effectiveTo',recorded_at:'recordedAt',owner_ref:'ownerRef',context_ref:'contextRef',
  provenance_ref:'provenanceRef',evidence_refs:'evidenceRefs',limitation_refs:'limitationRefs',reassessment_trigger_refs:'reassessmentTriggerRefs',
  framework_version:'frameworkVersion',schema_version:'schemaVersion',record_version:'recordVersion',specialization_version:'specializationVersion',
  proposition_id:'propositionId',actor_id:'actorId',basis_ref:'basisRef',relying_ids:'relyingIds',
  relationship_type:'relationshipType',representation_mode:'representationMode',source_ref:'sourceId',target_ref:'targetId',
  source_family:'sourceFamily',target_family:'targetFamily',scope_ref:'scopeRef' };

// Pure, explicit read adapter. Original bytes/record remain outside the projection;
// no storage writes, generated dates, invented provenance, or guessed framework version.
export function migrateCIFRecord(input) {
  if(input?.compatibilityVersion===CIF_BINDING.schema_version&&input.original&&input.record) return structuredClone(input);
  const original=structuredClone(input),record=structuredClone(input),review=[];
  if(!input||typeof input!=='object'||Array.isArray(input)) throw new TypeError('CIF migration requires an object record.');
  const sources=[input.metadata||{},input.attributes||{},input];
  for(const source of sources) for(const [from,to] of Object.entries(aliases)) {
    if(Object.hasOwn(source,from)) {
      if(Object.hasOwn(record,to)&&JSON.stringify(record[to])!==JSON.stringify(source[from])) review.push(`Conflicting ${from}/${to}; values preserved for review.`);
      else record[to]=structuredClone(source[from]);
    }
  }
  if(record.family===undefined&&input.object_family!==undefined) record.family=familyId(input.object_family);
  record.id=record.id??input.metadata?.id;
  if(input.object_family) {
    record.domainType=record.domainType??input.object_family;
    record.domainId=record.domainId??record.id;
  }
  if(record.relationshipType) {
    if(record.sourceFamily) record.sourceFamily=familyId(record.sourceFamily);
    if(record.targetFamily) record.targetFamily=familyId(record.targetFamily);
    if(!record.sourceFamily||!record.targetFamily) review.push('Legacy relationship endpoint families require resolution; do not infer conformance from a stored edge.');
  }
  const candidates=[record.subtype,input.attributes?.decision_type,input.attributes?.epistemic_type].filter(v=>v!=null);
  if(new Set(candidates).size>1) review.push('Conflicting subtype attributes; no semantic conversion performed.');
  else {
    record.subtype=candidates[0];
    if(record.family==='OF-16'&&record.subtype==='ASSUMPTION') record.subtype='ASSUMPTION_ADOPTION';
    else if(record.subtype==='ASSUMPTION') review.push('ASSUMPTION outside OF-16 is ambiguous and is preserved.');
  }
  if(!Object.hasOwn(record,'frameworkVersion')) {
    record.frameworkVersion=null;
    review.push('Framework version is absent; no historical version inferred.');
  }
  if(record.family==='OF-01'&&!record.subtype) review.push('Actor subtype absent; no subtype inferred from name or owner.');
  review.push(...objectSemanticFindings(record).map(f=>f.message));
  return {compatibilityVersion:CIF_BINDING.schema_version,original,record,review:[...new Set(review)]};
}
