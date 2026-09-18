import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CIF_OBJECT_FAMILIES,
  CIF_RELATIONSHIPS,
  FORBIDDEN_RELATIONSHIP_ENTAILMENTS,
  SEMANTIC_NON_ENTAILMENTS,
  canonicalProjection,
  validateDerivedRelationship,
  validateSemanticEntailment
} from './roi-ea-canonical-model.mjs';

test('canonical object projection remains thin and preserves the domain record', () => {
  const domain = { id:'AE-1', status:'Active' };
  const result = canonicalProjection({
    canonicalRef:{
      canonicalId:'CAN-AE-1',
      family:CIF_OBJECT_FAMILIES.AUTHORITY_DELEGATION,
      domainType:'authority_envelope',
      domainId:'AE-1',
      sourceModule:'authority-model.mjs'
    },
    domainRecord:domain
  });
  assert.equal(result.status,'PASS');
  assert.equal(result.domainRecord,domain);
  assert.equal(result.ref.domainId,'AE-1');
});

test('relationship non-entailment table contains only canonical relationship names', () => {
  for (const [source,target] of FORBIDDEN_RELATIONSHIP_ENTAILMENTS) {
    assert.equal(CIF_RELATIONSHIPS.includes(source), true, `noncanonical source relationship: ${source}`);
    assert.equal(CIF_RELATIONSHIPS.includes(target), true, `noncanonical target relationship: ${target}`);
  }
});

test('semantic non-entailment table contains semantic concepts rather than invented CIF relationships', () => {
  assert.equal(SEMANTIC_NON_ENTAILMENTS.some(([source,target]) => source === 'CAPABILITY' && target === 'AUTHORITY'), true);
  assert.equal(SEMANTIC_NON_ENTAILMENTS.some(([source,target]) => source === 'COMPLETION' && target === 'OUTCOME'), true);
  assert.equal(SEMANTIC_NON_ENTAILMENTS.some(([source,target]) => source === 'OUTCOME' && target === 'VALUE'), true);
  assert.equal(SEMANTIC_NON_ENTAILMENTS.some(([source,target]) => source === 'CLASSIFICATION' && target === 'AUTHORIZATION'), true);
  assert.equal(FORBIDDEN_RELATIONSHIP_ENTAILMENTS.some(([source]) => source === 'HAS_CAPABILITY'), false);
});

test('permission does not entail authority', () => {
  const result = validateDerivedRelationship({
    sourceRelationship:'IS_PERMITTED_TO',
    proposedRelationship:'POSSESSES_AUTHORITY'
  });
  assert.equal(result.valid,false);
  assert.equal(result.status,'FORBIDDEN_ENTAILMENT');
});

test('dependency does not entail membership', () => {
  const result = validateDerivedRelationship({
    sourceRelationship:'DEPENDS_ON',
    proposedRelationship:'IS_MEMBER_OF'
  });
  assert.equal(result.valid,false);
});

test('technical recovery relationship does not entail reactivation', () => {
  const result = validateDerivedRelationship({
    sourceRelationship:'RECOVERS_FROM',
    proposedRelationship:'REACTIVATES'
  });
  assert.equal(result.valid,false);
});

test('capability does not semantically entail authority', () => {
  const result = validateSemanticEntailment({
    sourceConcept:'CAPABILITY',
    proposedConcept:'AUTHORITY'
  });
  assert.equal(result.valid,false);
  assert.equal(result.status,'FORBIDDEN_SEMANTIC_ENTAILMENT');
});

test('completion does not semantically entail outcome', () => {
  const result = validateSemanticEntailment({
    sourceConcept:'COMPLETION',
    proposedConcept:'OUTCOME'
  });
  assert.equal(result.valid,false);
});

test('outcome does not semantically entail value', () => {
  const result = validateSemanticEntailment({
    sourceConcept:'OUTCOME',
    proposedConcept:'VALUE'
  });
  assert.equal(result.valid,false);
});

test('AACM classification does not semantically entail authorization', () => {
  const result = validateSemanticEntailment({
    sourceConcept:'CLASSIFICATION',
    proposedConcept:'AUTHORIZATION'
  });
  assert.equal(result.valid,false);
});

test('swarm system classification is not inferred from component classifications', () => {
  const result = validateSemanticEntailment({
    sourceConcept:'SWARM_COMPONENT_CLASSIFICATION',
    proposedConcept:'SWARM_SYSTEM_CLASSIFICATION'
  });
  assert.equal(result.valid,false);
});

test('explicit materially different relationship requires independent basis', () => {
  const result = validateDerivedRelationship({
    sourceRelationship:'IS_PERMITTED_TO',
    proposedRelationship:'POSSESSES_AUTHORITY',
    explicitAssertion:true,
    derivationBasis:[]
  });
  assert.equal(result.valid,false);
  assert.equal(result.status,'INSUFFICIENT_BASIS');

  const supported = validateDerivedRelationship({
    sourceRelationship:'IS_PERMITTED_TO',
    proposedRelationship:'POSSESSES_AUTHORITY',
    explicitAssertion:true,
    derivationBasis:['AE-1']
  });
  assert.equal(supported.valid,true);
});

test('explicit semantic assertion requires independent basis when source concept cannot entail target', () => {
  const result = validateSemanticEntailment({
    sourceConcept:'OUTCOME',
    proposedConcept:'VALUE',
    explicitAssertion:true,
    derivationBasis:[]
  });
  assert.equal(result.valid,false);
  assert.equal(result.status,'INSUFFICIENT_BASIS');

  const supported = validateSemanticEntailment({
    sourceConcept:'OUTCOME',
    proposedConcept:'VALUE',
    explicitAssertion:true,
    derivationBasis:['FINANCE-VALIDATION-1']
  });
  assert.equal(supported.valid,true);
});
