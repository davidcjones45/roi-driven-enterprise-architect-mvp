import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CIF_OBJECT_FAMILIES,
  CIF_RELATIONSHIPS,
  CIF_CAUSAL_ROLES,
  FORBIDDEN_RELATIONSHIP_ENTAILMENTS,
  SEMANTIC_NON_ENTAILMENTS,
  canonicalProjection,
  validateDerivedRelationship,
  validateSemanticEntailment
} from './roi-ea-canonical-model.mjs';

test('canonical object projection remains thin and preserves the domain record', () => {
  const domain = { id:'AE-1', status:'Active' };
  const result = canonicalProjection({
    canonicalRef:{ canonicalId:'CAN-AE-1', family:CIF_OBJECT_FAMILIES.AUTHORITY_DELEGATION,
      domainType:'authority_envelope', domainId:'AE-1', sourceModule:'authority-model.mjs' },
    domainRecord:domain
  });
  assert.equal(result.status,'PASS');
  assert.equal(result.domainRecord,domain);
});

test('CIF relationship grammar includes rule semantics, assumption, and trust-state relation', () => {
  for (const relation of ['ASSUMES','APPLIES_TO','REQUIRES','PROHIBITS','PERMITS','HAS_TRUST_STATE_FOR']) {
    assert.equal(CIF_RELATIONSHIPS.includes(relation), true, relation);
  }
});

test('causal roles are not represented as relationship types', () => {
  for (const role of ['AMPLIFYING','MITIGATING','PREVENTIVE']) {
    assert.equal(CIF_CAUSAL_ROLES.includes(role), true);
  }
  for (const invalidRelation of ['AMPLIFIES','MITIGATES','PREVENTS']) {
    assert.equal(CIF_RELATIONSHIPS.includes(invalidRelation), false);
  }
  assert.equal(CIF_RELATIONSHIPS.includes('CONTRIBUTES_CAUSALLY_TO'), true);
});

test('relationship non-entailment table contains only canonical relationship names', () => {
  for (const [source,target] of FORBIDDEN_RELATIONSHIP_ENTAILMENTS) {
    assert.equal(CIF_RELATIONSHIPS.includes(source), true, `noncanonical source relationship: ${source}`);
    assert.equal(CIF_RELATIONSHIPS.includes(target), true, `noncanonical target relationship: ${target}`);
  }
});

test('semantic non-entailments preserve CIF and AACM distinctions', () => {
  for (const pair of [
    ['CAPABILITY','AUTHORITY'],['COMPLETION','OUTCOME'],['OUTCOME','VALUE'],
    ['TECHNICAL_RECOVERY','AUTHORIZED_RESUMPTION'],['CLASSIFICATION','AUTHORIZATION'],
    ['SWARM_COMPONENT_CLASSIFICATION','SWARM_SYSTEM_CLASSIFICATION']
  ]) {
    assert.equal(SEMANTIC_NON_ENTAILMENTS.some(([s,t]) => s === pair[0] && t === pair[1]), true, pair.join(' != '));
  }
});

test('permission does not entail authority', () => {
  const result = validateDerivedRelationship({ sourceRelationship:'IS_PERMITTED_TO', proposedRelationship:'POSSESSES_AUTHORITY' });
  assert.equal(result.valid,false);
});

test('dependency does not entail membership', () => {
  const result = validateDerivedRelationship({ sourceRelationship:'DEPENDS_ON', proposedRelationship:'IS_MEMBER_OF' });
  assert.equal(result.valid,false);
});

test('technical recovery relationship does not entail reactivation', () => {
  const result = validateDerivedRelationship({ sourceRelationship:'RECOVERS_FROM', proposedRelationship:'REACTIVATES' });
  assert.equal(result.valid,false);
});

test('classification does not semantically entail authorization', () => {
  const result = validateSemanticEntailment({ sourceConcept:'CLASSIFICATION', proposedConcept:'AUTHORIZATION' });
  assert.equal(result.valid,false);
});

test('explicit materially different relationship requires independent basis', () => {
  const result = validateDerivedRelationship({
    sourceRelationship:'IS_PERMITTED_TO', proposedRelationship:'POSSESSES_AUTHORITY',
    explicitAssertion:true, derivationBasis:[]
  });
  assert.equal(result.status,'INSUFFICIENT_BASIS');
  assert.equal(validateDerivedRelationship({
    sourceRelationship:'IS_PERMITTED_TO', proposedRelationship:'POSSESSES_AUTHORITY',
    explicitAssertion:true, derivationBasis:['AE-1']
  }).valid,true);
});

test('explicit semantic assertion requires independent basis', () => {
  assert.equal(validateSemanticEntailment({
    sourceConcept:'OUTCOME', proposedConcept:'VALUE', explicitAssertion:true, derivationBasis:[]
  }).status,'INSUFFICIENT_BASIS');
});
