import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { CIF_REGISTRY,parseRelationshipRegistry,relationshipFindings,CIF_ACTOR_SUBTYPES,CIF_ABSENCE_STATES } from './roi-ea-cif-registry.mjs';
import { normalizeCanonicalObjectRef,normalizeCanonicalRelationship,validateDerivedRelationship,validateSemanticEntailment,canonicalProjection } from './roi-ea-canonical-model.mjs';
import { deriveAssumes,assumptionReassessment,normalizeCIFActor,objectSemanticFindings,validateControlledAbsence,assessExternalityMateriality,EXTERNALITY_DIMENSIONS } from './roi-ea-cif-semantics.mjs';
import { evaluateCIFValidation } from './roi-ea-cif-validation-model.mjs';
import { evaluateCIFProfile,PROFILE_OBLIGATIONS } from './roi-ea-cif-profile.mjs';
import { validateCIFCaseSummary } from './roi-ea-cif-case-summary-model.mjs';
import { migrateCIFRecord } from './roi-ea-cif-migration.mjs';
import { cifApplicationSchema } from './roi-ea-cif-schema.mjs';

const role = type => ({id:'REL-1',relationshipType:type,representationMode:'RELATIONSHIP_RECORD',sourceId:'A',sourceFamily:'OF-01',sourceSubtype:'HUMAN_PERSON',
  targetId:'R',targetFamily:'OF-01',targetSubtype:'ROLE_OR_OFFICE',basisRef:'B',scope:'pilot',contextRef:'decision-D',effectiveFrom:'2026-09-01',effectiveTo:'2026-10-01'});
const proposition = () => ({id:'P',family:'OF-12',subtype:'ASSUMPTION_PROPOSITION',statement:'Demand may grow',frameworkVersion:'0.4',recordVersion:'2'});
const adoption = () => ({id:'AD',family:'OF-16',subtype:'ASSUMPTION_ADOPTION',propositionId:'P',actorId:'A',scope:'pilot',basisRef:'B',relyingIds:['D'],reassessmentTriggerRefs:['CHANGE-P']});

test('registry has canonical source hash, 60 definitions and immutable parsed data',async()=>{
  const bytes=await readFile(new URL('./schemas/cif-roi-ea-v0.4.1/CIF_Relationships.json',import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),'2d7d429c0b07d3e3821ef1467a4c78e687fb3029020f360d7c17b24be1584df6');
  assert.equal(CIF_REGISTRY.relationships.length,60);
  assert.throws(()=>{CIF_REGISTRY.relationships[0].allowed_source.push('OF-99');});
  for(const mutate of [r=>r.relationships.pop(),r=>r.relationships[1].relationship_type=r.relationships[0].relationship_type,
    r=>r.relationships[0].allowed_source=['OF-99'],r=>r.relationships[0].basis_requirement='OPTIONAL',r=>r.relationships[0].authoritative_representation='EDGE',r=>r.framework_version='0.4']) {
    const r=structuredClone(CIF_REGISTRY);mutate(r);assert.throws(()=>parseRelationshipRegistry(r));
  }
});
for(const type of ['OCCUPIES_ROLE','REPRESENTS','ACTS_ON_BEHALF_OF']) test(`${type} validates basis scope endpoints and relevant context/time`,()=>{
  assert.equal(normalizeCanonicalRelationship(role(type)).errors.length,0);
  for(const change of [{sourceFamily:'OF-12'},{targetFamily:'OF-16'},{basisRef:''},{scope:''},{representationMode:'ASSERTED_EDGE'}]) assert.ok(normalizeCanonicalRelationship({...role(type),...change}).errors.length);
  if(type!=='ACTS_ON_BEHALF_OF') assert.ok(normalizeCanonicalRelationship({...role(type),effectiveTo:''}).errors.length);
  else assert.ok(normalizeCanonicalRelationship({...role(type),contextRef:''}).errors.length);
});
test('unknown relationship and absent endpoint families cannot silently conform',()=>{
  assert.ok(normalizeCanonicalRelationship({...role('UNREGISTERED')}).errors.length);
  assert.ok(normalizeCanonicalRelationship({...role('REPRESENTS'),sourceFamily:''}).errors.length);
  assert.equal(validateDerivedRelationship({sourceRelationship:'NOT_REGISTERED',proposedRelationship:'PERFORMS'}).valid,false);
});
test('every registered relationship rejects forbidden endpoint families and a nonauthoritative mode',()=>{
  for(const definition of CIF_REGISTRY.relationships) {
    const base={...role(definition.relationship_type),sourceFamily:'OF-99',targetFamily:'OF-99',representationMode:'UNREGISTERED_MODE'};
    const findings=relationshipFindings(base);
    assert.equal(findings.filter(f=>f.code==='INVALID_ENDPOINT').length,2,definition.relationship_type);
    assert.ok(findings.some(f=>f.code==='INVALID_REPRESENTATION'),definition.relationship_type);
  }
});
test('registry object-reified relationship requires owning object evidence',()=>{
  const r={...role('DEPENDS_ON'),representationMode:'OBJECT_REIFIED',authoritativeRecordRef:'DEP',authoritativeRecord:{id:'DEP',family:'OF-11',sourceId:'A',targetId:'R'}};
  assert.ok(relationshipFindings(r).some(f=>f.code==='AUTHORITATIVE_FAMILY'));
  r.authoritativeRecord.family='OF-09';assert.equal(relationshipFindings(r).length,0);
});
test('all Actor subtypes and legacy principal aliases remain interpretable',()=>{
  for(const subtype of CIF_ACTOR_SUBTYPES) assert.equal(normalizeCIFActor({id:'A',subtype}).findings.length,0);
  assert.equal(normalizeCIFActor({id:'A',type:'HUMAN'}).actor.subtype,'HUMAN_PERSON');
  assert.equal(normalizeCIFActor({id:'A',type:'ROLE'}).actor.type,'ROLE');
  assert.ok(normalizeCIFActor({id:'A'}).findings.length);
});
for(const subtype of ['TECHNICAL_SYSTEM','AUTONOMOUS_AGENT','OTHER_IDENTIFIED_ACTOR']) test(`${subtype} cannot silently satisfy institutional accountability`,()=>{
  const r={...role('ACCOUNTABLE_FOR'),sourceSubtype:subtype,targetFamily:'OF-16'};
  assert.ok(relationshipFindings(r).some(f=>f.code==='INSTITUTIONAL_ACCOUNTABILITY'&&f.status==='FAIL'));
  r.relationshipType='RESPONSIBLE_FOR';assert.equal(relationshipFindings(r).length,0);
  r.relationshipType='PERFORMS';r.targetFamily='OF-18';r.representationMode='ASSERTED_EDGE';assert.equal(relationshipFindings(r).length,0);
});
test('external governance exception is scoped, evidenced and time bounded',()=>{
  const r={...role('ACCOUNTABLE_FOR'),sourceSubtype:'TECHNICAL_SYSTEM',targetFamily:'OF-16',externalGovernance:{status:'ESTABLISHED_FOR_SCOPE',regimeRef:'EXT',authorityRef:'AUTH',evidenceRef:'E',actorId:'A',subjectId:'R',scope:'pilot',effectiveFrom:'2026-01-01',effectiveTo:'2026-12-31'}};
  assert.equal(relationshipFindings(r).length,0);
  r.externalGovernance.scope='other';assert.ok(relationshipFindings(r).length);
});
test('proposition and adoption remain separate; ASSUMES is a matched derived projection',()=>{
  const p=proposition(),a=adoption(),snapshot=structuredClone({p,a});
  const result=deriveAssumes({proposition:p,adoption:a});assert.equal(result.valid,true);assert.equal(result.createsFact,false);
  assert.deepEqual({p,a},snapshot);
  assert.equal(deriveAssumes({proposition:{...p,subtype:'FACT'},adoption:a}).valid,false);
  assert.equal(deriveAssumes({proposition:p,adoption:{...a,propositionId:'OTHER'}}).valid,false);
  assert.equal(deriveAssumes({proposition:p,adoption:a,sourceId:'UNRELATED'}).valid,false);
  assert.equal(deriveAssumes({proposition:p,adoption:a,sourceId:'D'}).valid,false);
  assert.equal(deriveAssumes({proposition:p,adoption:a,sourceId:'D',sourceFamily:'OF-16'}).valid,true);
  assert.ok(objectSemanticFindings({...p,family:'OF-16'}).length);
  assert.deepEqual(assumptionReassessment({propositionId:'P',materialChange:false,adoptions:[a]}),[]);
  assert.deepEqual(assumptionReassessment({propositionId:'P',materialChange:true,adoptions:[a]})[0].relyingIds,['D']);
});
for(const [sourceRelationship,proposedRelationship] of [['OFFERS','ACCEPTS'],['RECEIVES','VALIDATES'],['VALIDATES','ACCEPTS'],['CORRECTS','SUPERSEDES'],['DEPENDS_ON','RELIES_ON'],['RELIES_ON','DEPENDS_ON'],['OCCUPIES_ROLE','POSSESSES_AUTHORITY'],['REPRESENTS','POSSESSES_AUTHORITY'],['ACTS_ON_BEHALF_OF','ACCOUNTABLE_FOR'],['PERFORMS','ACCOUNTABLE_FOR']]) {
  test(`${sourceRelationship} does not entail ${proposedRelationship}`,()=>{
    assert.equal(validateDerivedRelationship({sourceRelationship,proposedRelationship}).valid,false);
    assert.equal(validateDerivedRelationship({sourceRelationship,proposedRelationship,explicitAssertion:true}).valid,false);
    assert.equal(validateDerivedRelationship({sourceRelationship,proposedRelationship,explicitAssertion:true,derivationBasis:['INDEPENDENT']}).valid,true);
  });
}
for(const [sourceConcept,proposedConcept] of [['ASSUMPTION_PROPOSITION','ASSUMPTION_ADOPTION'],['ASSUMPTION_ADOPTION','FACT'],['MACHINE_EXECUTION','INSTITUTIONAL_ACCOUNTABILITY'],['DEPENDENCY','RELIANCE'],['RELIANCE','DEPENDENCY']]) test(`${sourceConcept} does not entail ${proposedConcept}`,()=>assert.equal(validateSemanticEntailment({sourceConcept,proposedConcept}).valid,false));
test('controlled absence states differ from storage null and arbitrary text',()=>{
  for(const state of CIF_ABSENCE_STATES) assert.deepEqual(validateControlledAbsence(state),{value:state,valid:true,semanticState:state,issues:[]});
  for(const value of [null,undefined,'','null','UNSURE']) assert.equal(validateControlledAbsence(value).valid,false);
  assert.equal(validateControlledAbsence(null,{required:false}).semanticState,undefined);
  assert.ok(objectSemanticFindings({absenceStates:{authority:null}}).length);
});
const validation = () => ({id:'V',subjectId:'D',scope:'pilot',representability:'PASS',conformance:'PASS',externalValidity:'NOT_ESTABLISHED',basisRefs:['B'],evidenceRefs:['E']});
test('known violation overrides insufficient evidence, conditional and not applicable',()=>{
  for(const conformance of ['INSUFFICIENT_EVIDENCE','PASS','CONDITIONAL','NOT_APPLICABLE']) {
    const r=evaluateCIFValidation({...validation(),conformance,findings:[{status:'INSUFFICIENT_EVIDENCE'},{status:'FAIL'}]});
    assert.equal(r.result.conformance,'FAIL');assert.equal(r.status,'FAIL');assert.equal(r.overallCIFPass,null);
    assert.equal(r.result.representability,'PASS');assert.equal(r.result.externalValidity,'NOT_ESTABLISHED');
  }
});
test('conditional cannot substitute for uncertainty or expired unmonitored conditions',()=>{
  const input={...validation(),conformance:'CONDITIONAL',asOf:'2026-09-25',conditions:[{id:'C',requirement:'Monitor',enforcementRef:'CONTROL',monitorRef:'M',effectiveFrom:'2026-09-01',effectiveTo:'2026-10-01'}]};
  assert.equal(evaluateCIFValidation(input).result.conformance,'CONDITIONAL');
  for(const delta of [{conditions:[]},{asOf:'2026-11-01'},{evidenceRefs:[]},{findings:[{status:'INSUFFICIENT_EVIDENCE'}]}]) assert.equal(evaluateCIFValidation({...input,...delta}).result.conformance,'INSUFFICIENT_EVIDENCE');
  assert.ok(evaluateCIFValidation({...validation(),externalValidity:'ESTABLISHED_FOR_SCOPE'}).issues.length);
});
const profileCase=()=>{
  const families=['OF-02','OF-03','OF-06','OF-01','OF-16','OF-15','OF-12','OF-18','OF-05','OF-22'];
  const objects=families.map(family=>({id:family,family,domainId:family,domainType:'fixture',subtype:family==='OF-01'?'HUMAN_PERSON':family==='OF-12'?'EVIDENCE':undefined,...(family==='OF-02'?{purposeStatus:'STATED',actorId:'OF-01',basisRef:'B',scope:'pilot'}:{})}));
  const assessment={status:'SATISFIED',evidenceRefs:['OF-12'],scope:'pilot',basisRef:'B',assessorRef:'OF-01'};
  return {id:'CASE',title:'Pilot',purpose:'Stated purpose',systemBoundary:'pilot',profileSelected:'CIF-Lite',canonicalObjects:objects,decisionIds:['OF-16'],authorityIds:['OF-15'],obligationAssessments:Object.fromEntries(PROFILE_OBLIGATIONS['CIF-Lite'].map(key=>[key,structuredClone(assessment)]))};
};
test('profile label alone is insufficient; scoped evidenced Lite obligations are evaluated',()=>{
  assert.equal(evaluateCIFProfile({profileSelected:'CIF-Lite'}).conformance,'INSUFFICIENT_EVIDENCE');
  assert.equal(evaluateCIFProfile(profileCase()).conformance,'PASS');
  for(const obligation of PROFILE_OBLIGATIONS['CIF-Lite']) {
    const c=profileCase();delete c.obligationAssessments[obligation];assert.equal(evaluateCIFProfile(c).conformance,'INSUFFICIENT_EVIDENCE');
    c.obligationAssessments[obligation]={status:'VIOLATED'};assert.equal(evaluateCIFProfile(c).conformance,'FAIL');
  }
});
test('Governed and Full do not require explicitly nonmaterial optional objects; unassessed is not nonmaterial',()=>{
  for(const profileSelected of ['CIF-Governed','CIF-Full']) {
    const c={...profileCase(),profileSelected,validationResultId:'V',validationResult:validation(),limitations:[]};
    assert.equal(evaluateCIFProfile(c).conformance,'INSUFFICIENT_EVIDENCE');
    for(const key of PROFILE_OBLIGATIONS['CIF-Governed']) c.obligationAssessments[key]={status:'NOT_APPLICABLE',material:false,scope:'pilot',basisRef:'MATERIALITY'};
    for(const key of PROFILE_OBLIGATIONS['CIF-Full']) c.obligationAssessments[key]={status:'SATISFIED',evidenceRefs:['OF-12'],scope:'pilot',basisRef:'B',assessorRef:'OF-01'};
    assert.equal(evaluateCIFProfile(c).conformance,'PASS');
    c.canonicalObjects.push({id:'HANDOFF',family:'OF-19',domainId:'H',domainType:'handoff'});
    assert.equal(evaluateCIFProfile(c).conformance,'FAIL');
  }
});
test('profile resolves endpoint subtypes from objects and catches machine accountability',()=>{
  const c=profileCase();c.canonicalObjects.find(o=>o.family==='OF-01').subtype='AUTONOMOUS_AGENT';
  c.relationships=[{...role('ACCOUNTABLE_FOR'),sourceId:'OF-01',targetId:'OF-16',sourceSubtype:undefined,targetSubtype:undefined,targetFamily:'OF-16'}];
  assert.equal(validateCIFCaseSummary(c).conformance,'FAIL');
});
test('presentation fields cannot alter semantic profile conformance',()=>{
  const c=profileCase();assert.deepEqual(evaluateCIFProfile(c),evaluateCIFProfile({...c,title:'Changed title',cardColor:'purple',layout:'wide'}));
});
test('purpose traceability preserves stated basis without CIF legitimacy',()=>{
  const p={family:'OF-02',purposeStatus:'ADOPTED',actorId:'A',scope:'pilot',basisRef:'B'};
  assert.equal(objectSemanticFindings(p).length,0);
  assert.ok(objectSemanticFindings({...p,actorId:''}).length);
  assert.ok(objectSemanticFindings({...p,legitimacyEstablishedByCIF:true}).some(f=>f.status==='FAIL'));
});
test('migration is deterministic, idempotent, non-destructive and preserves four versions and null',()=>{
  const old={metadata:{id:'A',framework_version:'0.4',schema_version:'0.1',record_version:'7',specialization_version:'0.2',recorded_at:'2026-08-01',effective_to:null},object_family:'DECISION',attributes:{decision_type:'ASSUMPTION',proposition_id:'P'},extra:{untouched:true}};
  const snapshot=structuredClone(old),m=migrateCIFRecord(old);
  assert.deepEqual(old,snapshot);assert.deepEqual(m.original,old);assert.equal(m.record.subtype,'ASSUMPTION_ADOPTION');assert.equal(m.record.family,'OF-16');
  assert.equal(m.record.frameworkVersion,'0.4');assert.equal(m.record.schemaVersion,'0.1');assert.equal(m.record.recordVersion,'7');assert.equal(m.record.specializationVersion,'0.2');assert.equal(m.record.effectiveTo,null);
  assert.deepEqual(migrateCIFRecord(m),m);assert.deepEqual(migrateCIFRecord(old),m);
  assert.ok(m.review.length);assert.equal(m.record.attributes.decision_type,'ASSUMPTION');
});
test('legacy adoption is interpreted without inventing a proposition or fact',()=>{
  const a={...adoption(),subtype:'ASSUMPTION',frameworkVersion:'0.4'};
  assert.equal(deriveAssumes({proposition:proposition(),adoption:a}).valid,true);
  assert.equal(migrateCIFRecord(a).record.subtype,'ASSUMPTION_ADOPTION');assert.equal(a.subtype,'ASSUMPTION');
  const ambiguous={id:'X',family:'OF-12',subtype:'ASSUMPTION'};
  assert.equal(migrateCIFRecord(ambiguous).record.subtype,'ASSUMPTION');assert.ok(migrateCIFRecord(ambiguous).review.length);
});
test('historic version stays historic in projection; new record defaults to current framework',()=>{
  const base={id:'D',family:'OF-16',domainId:'D',domainType:'decision'};
  assert.equal(normalizeCanonicalObjectRef({...base,frameworkVersion:'0.4'}).frameworkVersion,'0.4');
  assert.equal(normalizeCanonicalObjectRef(base).frameworkVersion,'0.4.1');
  assert.equal(normalizeCanonicalObjectRef({...base,frameworkVersion:null}).frameworkVersion,null);
  assert.equal(canonicalProjection({canonicalRef:{...base,frameworkVersion:'0.4'},domainRecord:base}).domainRecord,base);
});
test('externality supports qualitative bounded materiality without scalar scoring',()=>{
  const record={decisionId:'D',systemBoundary:'pilot',materiality:'NOT_MATERIAL',materialityBasis:'Reviewed bounded effects',dimensions:Object.fromEntries(EXTERNALITY_DIMENSIONS.map(k=>[k,{status:'ASSESSED',basis:'Scoped review'}]))};
  assert.equal(assessExternalityMateriality(record).valid,true);assert.equal(assessExternalityMateriality(record).scalarScore,null);
  record.materiality='MATERIAL';record.dimensions.boundaryDecisionEffect.changesDecision=true;
  assert.equal(assessExternalityMateriality(record).boundaryExpansionRequired,true);assert.equal(assessExternalityMateriality(record).valid,false);
  assert.equal(validateCIFCaseSummary({...profileCase(),externalityAssessment:record}).conformance,'FAIL');
  record.expandedBoundary='Pilot and affected suppliers';assert.equal(assessExternalityMateriality(record).valid,true);
});
test('schema is generated from same registry and leaves historical versions unconflated',()=>{
  const s=cifApplicationSchema();assert.equal(s.$defs.relationship.properties.relationshipType.enum.length,60);
  assert.equal(s.$defs.relationship.allOf.length,60);assert.deepEqual(s.properties.frameworkVersion.type,['string','null']);
  assert.ok(s.properties.absenceStates.additionalProperties.enum.includes('UNRESOLVED'));
});
test('default non-entailment also blocks unlisted materially different inferences',()=>{
  assert.equal(validateDerivedRelationship({sourceRelationship:'REPRESENTS',proposedRelationship:'IS_PERMITTED_TO'}).valid,false);
  assert.equal(validateSemanticEntailment({sourceConcept:'OWNER',proposedConcept:'ACCOUNTABILITY'}).valid,false);
});
test('absence of historical version never becomes current metadata on normalization',()=>{
  const migrated=migrateCIFRecord({id:'D',family:'OF-16',domainId:'D',domainType:'decision'});
  assert.equal(normalizeCanonicalObjectRef(migrated.record).frameworkVersion,null);
  assert.equal(Object.hasOwn(migrated.original,'frameworkVersion'),false);
});
test('legacy MRS relationships retain provenance, representation and unresolved endpoints',()=>{
  const legacy={metadata:{id:'REL',framework_version:'0.4',schema_version:'0.1',recorded_at:'2026-08-01'},relationship_type:'ASSUMES',representation_mode:'ASSERTED_EDGE',source_ref:'A',target_ref:'P'};
  const m=migrateCIFRecord(legacy);
  assert.equal(m.record.relationshipType,'ASSUMES');assert.equal(m.record.representationMode,'ASSERTED_EDGE');
  assert.equal(m.record.frameworkVersion,'0.4');assert.equal(m.record.recordedAt,'2026-08-01');
  assert.ok(m.review.length);assert.ok(normalizeCanonicalRelationship(m.record).errors.length);assert.deepEqual(m.original,legacy);
});
test('conflicting MRS and application versions are preserved for explicit review',()=>{
  const m=migrateCIFRecord({id:'D',family:'OF-16',frameworkVersion:'0.4',metadata:{framework_version:'0.4.1'},subtype:'DECISION',attributes:{decision_type:'ASSUMPTION'}});
  assert.equal(m.record.frameworkVersion,'0.4');assert.equal(m.record.metadata.framework_version,'0.4.1');
  assert.equal(m.record.subtype,'DECISION');assert.ok(m.review.some(x=>x.includes('Conflicting')));
});
test('known epistemic/decision category errors fail even when an assessment says satisfied',()=>{
  const c=profileCase();c.canonicalObjects.find(o=>o.family==='OF-12').subtype='DECISION';
  assert.equal(evaluateCIFProfile(c).conformance,'FAIL');
  assert.ok(objectSemanticFindings({family:'OF-16',subtype:'FACT'}).some(f=>f.status==='FAIL'));
});
test('CIF version UI imports the registry and communicates EV-0 without changing layout',async()=>{
  const [html,ui]=await Promise.all(['index.html','roi-ea-cif-version-ui.mjs'].map(f=>readFile(new URL(f,import.meta.url),'utf8')));
  assert.match(html,/id="cif-framework-version"/);assert.match(html,/src="roi-ea-cif-version-ui.mjs"/);
  const target={textContent:''},previous=globalThis.document;
  try {
    globalThis.document={getElementById:id=>id==='cif-framework-version'?target:null};
    await import('./roi-ea-cif-version-ui.mjs');
    assert.equal(target.textContent,'CIF v0.4.1 · EV-0: not independently externally validated.');
  } finally { if(previous===undefined) delete globalThis.document;else globalThis.document=previous; }
  assert.match(ui,/CIF_REGISTRY/);
});
