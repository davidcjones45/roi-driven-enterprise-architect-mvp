import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CIF_OBJECT_FAMILIES,
  canonicalProjection,
  validateDerivedRelationship
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

test('technical recovery does not entail reactivation', () => {
  const result = validateDerivedRelationship({
    sourceRelationship:'RECOVERS_FROM',
    proposedRelationship:'REACTIVATES'
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
