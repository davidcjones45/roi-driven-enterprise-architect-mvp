import assert from 'node:assert/strict';import test from 'node:test';
import {CIF_FRAMEWORK_VERSION,CIF_EPISTEMIC_TYPES,CIF_RELATIONSHIP_DEFINITIONS,normalizeCanonicalRelationship,validateSemanticEntailment} from './roi-ea-canonical-model.mjs';
import {evaluateCIFValidation} from './roi-ea-cif-validation-model.mjs';
test('CIF v0.4 and epistemic subtypes',()=>{assert.equal(CIF_FRAMEWORK_VERSION,'0.4');for(const x of ['CLAIM','EVIDENCE','FACT','INFERENCE','RECOMMENDATION','FORECAST'])assert.equal(CIF_EPISTEMIC_TYPES.includes(x),true);});
test('governed relationship requires authoritative representation, scope and basis',()=>{const r=normalizeCanonicalRelationship({id:'R1',relationshipType:'ACCOUNTABLE_FOR',sourceId:'A',targetId:'D',scope:'decision D',basisRef:'B1'});assert.equal(r.errors.length,0);assert.equal(r.representationMode,CIF_RELATIONSHIP_DEFINITIONS.ACCOUNTABLE_FOR.authoritativeRepresentation);});
test('forecast does not entail fact',()=>assert.equal(validateSemanticEntailment({sourceConcept:'FORECAST',proposedConcept:'FACT'}).valid,false));
test('R C V remain independent',()=>{const r=evaluateCIFValidation({id:'VAL1',subjectId:'CASE1',representability:'PASS',conformance:'CONDITIONAL',externalValidity:'OUTSIDE_CIF_DETERMINATION'});assert.equal(r.status,'PASS');assert.equal(r.overallCIFPass,null);});
