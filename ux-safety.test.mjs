import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createGuardedStore, WorkspaceStorageError, finiteInput, calculateBaseline,
  baselineExplanation, removeLocalRecord, undoLocalRemoval, validateWorkspaceShape,
  assertSafeJSON } from './ux-safety-model.mjs';

function memory(initial = null) {
  let raw = initial, failRead = false, failWrite = false;
  return {
    getItem() { if(failRead) throw new Error('disabled'); return raw; },
    setItem(key, value) { if(failWrite) throw new Error('quota'); raw = value; },
    raw: () => raw, external: value => {raw = value;},
    blockRead: () => {failRead = true;}, blockWrite: value => {failWrite = value;}
  };
}
function storeFor(target, normalize = value => value) {
  return createGuardedStore({ key:'test', storage:()=>target, empty:()=>({}), normalize });
}
const sample = { annualVolume:'12000', hoursPerOccurrence:'0.25', loadedRate:'38',
  annualErrorCost:'12000', currentToolCost:'4800', laborReduction:'30', errorReduction:'20',
  implementationCost:'18000', recurringCost:'7200' };

test('untouched baseline is unknown, not zero', () => {
  const result = calculateBaseline();
  assert.equal(result.current, null); assert.equal(result.benefit, null);
  assert.equal(result.roi, null); assert.equal(result.calculationState, 'incomplete');
  assert.equal(result.missing.length, 9);
});
for (const value of [undefined, null, '', '  ', false, true, [], {}, 'not a number', Infinity, NaN]) {
  test(`finiteInput rejects ${String(value)} (${typeof value})`, () => assert.equal(finiteInput(value), null));
}
test('explicit supported zero is retained', () => {
  assert.equal(finiteInput('0'), 0);
  const result = calculateBaseline(Object.fromEntries(Object.keys(sample).map(key => [key,0])));
  assert.equal(result.calculationState, 'complete'); assert.equal(result.current,0);
  assert.equal(result.benefit,0); assert.equal(result.roi,null); assert.equal(result.payback,null);
});
test('existing Northstar economic formula is unchanged', () => {
  const result = calculateBaseline(sample);
  assert.equal(result.current,130800); assert.equal(result.labor,114000);
  assert.equal(result.benefit,29400); assert.ok(Math.abs(result.roi - 63.33333333333333) < 1e-9);
  assert.equal(result.payback,18000/29400);
});
test('a single missing required input blocks all baseline metrics', () => {
  for (const key of Object.keys(sample)) {
    const values = {...sample}; delete values[key];
    assert.equal(calculateBaseline(values).current,null);
  }
});
test('negative costs and out-of-range percentages are rejected', () => {
  for (const [field,value] of [['loadedRate',-1],['laborReduction',101],['errorReduction',-1],['annualVolume','n/a']]) {
    const result=calculateBaseline({...sample,[field]:value});
    assert.equal(result.calculationState,'invalid'); assert.equal(result.current,null);
  }
});
test('numeric overflow cannot escape as an established metric', () => {
  const result=calculateBaseline({...sample,annualVolume:1e308,hoursPerOccurrence:1e308});
  assert.equal(result.calculationState,'invalid'); assert.equal(result.current,null);
});
test('zero implementation does not divide by zero', () => {
  const result=calculateBaseline({...sample,implementationCost:0});
  assert.equal(result.roi,null); assert.equal(result.payback,0);
});
test('nonpositive benefit has no positive payback', () => {
  const result=calculateBaseline({...sample,recurringCost:100000});
  assert.ok(result.benefit<0); assert.equal(result.payback,null);
});
test('complete calculation is still labeled a forecast', () => {
  assert.match(baselineExplanation(calculateBaseline(sample)),/not a validated or realized result/);
});
test('normal read/write roundtrip preserves unknown domain fields', () => {
  const target=memory('{"other":{"value":42}}'),store=storeFor(target);
  const value=store.read(); value.name='draft'; store.save(value);
  assert.equal(JSON.parse(target.raw()).other.value,42);
  assert.ok(store.getState().savedAt); assert.equal(store.getState().error,null);
});
test('corrupt original is retained and locked against overwrite', () => {
  const target=memory('{bad'),store=storeFor(target);
  assert.deepEqual(store.read(),{}); assert.equal(store.getState().blocked,true);
  assert.throws(()=>store.save({}),{code:'READ_BLOCKED'}); assert.equal(target.raw(),'{bad');
  assert.equal(store.getState().raw,'{bad');
});
test('normalization failure protects the original bytes', () => {
  const target=memory('{"opportunity":null}'),store=storeFor(target,validateWorkspaceShape);
  store.read(); assert.throws(()=>store.save({}),WorkspaceStorageError);
  assert.equal(target.raw(),'{"opportunity":null}');
});
test('storage property access failure is handled as a blocked read', () => {
  const store=createGuardedStore({key:'t',storage:()=>{throw new Error('security');},empty:()=>({})});
  assert.deepEqual(store.read(),{}); assert.equal(store.getState().blocked,true);
});
test('quota failure does not report a save or change the original', () => {
  const target=memory('{"value":1}'),store=storeFor(target); store.read(); target.blockWrite(true);
  assert.throws(()=>store.save({value:2}),{code:'WRITE_FAILED'});
  assert.equal(target.raw(),'{"value":1}'); assert.equal(store.getState().savedAt,null);
});
test('retry succeeds after a transient write failure', () => {
  const target=memory(),store=storeFor(target); store.read(); target.blockWrite(true);
  assert.throws(()=>store.save({value:2})); target.blockWrite(false); store.save({value:2});
  assert.equal(store.getState().error,null); assert.equal(JSON.parse(target.raw()).value,2);
});
test('concurrent tab changes are not silently overwritten', () => {
  const target=memory('{"value":1}'),store=storeFor(target); store.read();target.external('{"value":3}');
  assert.throws(()=>store.save({value:2}),{code:'CONFLICT'}); assert.equal(target.raw(),'{"value":3}');
});
test('read is required and cannot reset the conflict baseline twice', () => {
  const store=storeFor(memory());assert.throws(()=>store.save({}));store.read();assert.throws(()=>store.read());
});
test('unsafe prototype keys and excessive nesting are rejected', () => {
  assert.throws(()=>assertSafeJSON(JSON.parse('{"__proto__":{"polluted":true}}')));
  let value={}; for(let i=0;i<45;i++)value={child:value}; assert.throws(()=>assertSafeJSON(value));
});
test('schema guards distinguish objects from arrays and null', () => {
  for(const input of [[],null,{evidence:{}},{baseline:[]},{inventory:[null]},{architecture:{alternatives:'bad'}}]) {
    assert.throws(()=>validateWorkspaceShape(input));
  }
  assert.equal(validateWorkspaceShape({extra:'preserved'}).extra,'preserved');
});
const record=()=>({evidence:[{id:'EVD-TEST-1',claim:'Example',state:'Supplied'}],inventory:[],authorityEnvelope:{},authorityEnvelopes:[],complianceCost:{activities:[]}});
test('removal creates a persistent recovery record and does not mutate input', () => {
  const before=record(),after=removeLocalRecord(before,'evidence',0,'2026-09-20T00:00:00Z');
  assert.equal(before.evidence.length,1);assert.equal(after.evidence.length,0);
  assert.deepEqual(after.uxRemovalHistory[0].record,before.evidence[0]);
});
test('undo restores removed record after JSON storage roundtrip', () => {
  const before=record(),after=JSON.parse(JSON.stringify(removeLocalRecord(before,'evidence',0)));
  const undone=undoLocalRemoval(after); assert.deepEqual(undone.evidence,before.evidence);assert.equal(undone.uxRemovalHistory.length,0);
});
test('reviewed evidence is retained rather than silently deleted', () => {
  for(const state of ['Validated','Resolved']) { const value=record();value.evidence[0].state=state;assert.throws(()=>removeLocalRecord(value,'evidence',0),/Reviewed evidence/); }
});
test('explicit references prevent removal', () => {
  const value=record();value.authorityEnvelope={evidenceRefs:'EVD-TEST-1'};
  assert.throws(()=>removeLocalRecord(value,'evidence',0),/referenced/);
});
test('unidentified evidence with authority records fails conservatively', () => {
  const value=record();delete value.evidence[0].id;value.authorityEnvelopes=[{id:'AE-1'}];
  assert.throws(()=>removeLocalRecord(value,'evidence',0),/no stable ID/);
});
test('inventory and cost removal cannot delete evidence', () => {
  const value=record();value.inventory=[{name:'Unused application'}];value.complianceCost.activities=[{name:'Draft work'}];
  const after=removeLocalRecord(removeLocalRecord(value,'inventory',0),'complianceCost.activities',0);
  assert.deepEqual(after.evidence,value.evidence);assert.equal(after.uxRemovalHistory.length,2);
});
test('invalid collection and stale index are rejected without mutation', () => {
  const value=record();assert.throws(()=>removeLocalRecord(value,'authorityEnvelopes',0));
  assert.throws(()=>removeLocalRecord(value,'evidence',-1));assert.throws(()=>removeLocalRecord(value,'evidence',42));
  assert.equal(value.evidence.length,1);
});
test('undo will not introduce a duplicate stable ID', () => {
  const value=removeLocalRecord(record(),'evidence',0);value.evidence.push({id:'EVD-TEST-1',claim:'Changed'});
  assert.throws(()=>undoLocalRemoval(value),/same ID/);
});
test('synchronized FEOA evidence is not mistaken for an independent reference', () => {
  const value=record();value.feoa={evidence:structuredClone(value.evidence)};
  assert.equal(removeLocalRecord(value,'evidence',0).evidence.length,0);
  value.feoa.actions=[{evidenceIds:['EVD-TEST-1']}];
  assert.throws(()=>removeLocalRecord(value,'evidence',0),/referenced/);
});

// R3 regressions: short explicit references must not be treated as absent.
for (const [name, record, other] of [
  ['CRM exact inventory reference', {name:'CRM'}, {authorityEnvelope:{inventoryRefs:'CRM'}}],
  ['CRM inventory name even when it has a long ID', {id:'APP-123',name:'CRM'}, {authorityEnvelope:{inventoryRefs:'CRM'}}],
  ['CRM in a delimited list', {name:'CRM'}, {authorityEnvelope:{inventoryRefs:'ERP; CRM; API'}}],
  ['single-character exact name', {name:'X'}, {authorityEnvelope:{inventoryRefs:['X']}}],
  ['escaped identifier punctuation', {name:'A+B'}, {authorityEnvelope:{inventoryRefs:'ERP; A+B; CRM'}}],
]) {
  test(`R3 protects ${name}`, () => {
    assert.throws(() => removeLocalRecord({inventory:[record], ...other}, 'inventory', 0), /referenced/);
  });
}
for (const reference of ['E1', ['E1'], {evidenceRefs:'E2; E1'}, 'See E1.']) {
  test(`R3 protects short evidence reference ${JSON.stringify(reference)}`, () => {
    assert.throws(() => removeLocalRecord({evidence:[{id:'E1',state:'Supplied'}], authorityEnvelope:{evidenceRefs:reference}},'evidence',0),/referenced/);
  });
}
for (const [name, reference] of [['CRM','CRMS'], ['CRM','INCREMENT'], ['E1','E10'], ['E1','PRE-E1-OTHER']]) {
  test(`R3 does not treat ${reference} as a reference to ${name}`, () => {
    const result=removeLocalRecord({inventory:[{name}], authorityEnvelope:{notes:reference}},'inventory',0);
    assert.equal(result.inventory.length,0);
    assert.equal(result.uxRemovalHistory.length,1);
  });
}
test('baseline cards use current form inputs and refresh when draft inputs change', () => {
  const app = readFileSync(new URL('./app.js', import.meta.url), 'utf8');
  assert.match(app, /function baselineInputForDisplay\(\)\{[\s\S]*?return form \? getForm\(form\) : data\.baseline;/);
  assert.match(app, /const b = calculateBaseline\(baselineInputForDisplay\(\)\);/);
  assert.match(app, /if\(key==='baseline'\)\{form\.addEventListener\('input',renderBaseline\);form\.addEventListener\('change',renderBaseline\);\}/);
});