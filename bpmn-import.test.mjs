import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { importBpmnXml } from './bpmn-parser-adapter.mjs';
import { deterministicImportProjection, stableJson } from './bpmn-import-model.mjs';
import { validateBpmnStructure } from './bpmn-structural-validator.mjs';

const FIXED_TIME = '2026-08-23T12:00:00.000Z';
const load = (name) => fs.readFile(new URL(`./bpmn-fixtures/${name}`, import.meta.url));
const run = async (name) => validateBpmnStructure(await importBpmnXml({ fileName: name, data: await load(name), importedAt: FIXED_TIME }));

test('BPMN-A01 minimal valid process produces deterministic normalized inventory', async () => {
  const first = await run('minimal-valid.bpmn');
  const second = validateBpmnStructure(await importBpmnXml({ fileName: 'minimal-valid.bpmn', data: await load('minimal-valid.bpmn'), importedAt: '2026-08-23T12:01:00.000Z' }));
  assert.equal(first.status, 'STAGED');
  assert.deepEqual(first.diagnostics, []);
  assert.deepEqual(first.elements.filter((item) => /(?:StartEvent|Task|EndEvent|SequenceFlow)$/.test(item.bpmnType)).map((item) => item.sourceId).sort(), ['End_1', 'Flow_1', 'Flow_2', 'Start_1', 'Task_1']);
  assert.notEqual(first.source.importedAt, second.source.importedAt);
  assert.equal(stableJson(deterministicImportProjection(first)), stableJson(deterministicImportProjection(second)));
});

test('BPMN-A02/A03 collaboration, message flow, lanes, and hierarchy are preserved without authority inference', async () => {
  const model = await run('collaboration-lanes.bpmn');
  assert.ok(model.elements.some((item) => item.bpmnType === 'bpmn:Participant'));
  assert.ok(model.elements.some((item) => item.bpmnType === 'bpmn:Lane'));
  assert.ok(model.elements.some((item) => item.sourceId === 'NestedLane_A' && item.containerId === 'NestedLaneSet_A'));
  assert.ok(model.relationships.some((item) => item.kind === 'MESSAGE_FLOW'));
  assert.ok(model.relationships.some((item) => item.kind === 'LANE_ALLOCATION'));
  assert.deepEqual(model.mappingCandidates, []);
  assert.ok(!stableJson(model).match(/authority|accountability|membership|accepted/iu));
});

test('BPMN-A04-A08 exact task, event, gateway, subprocess, and data types survive normalization', async () => {
  const model = await run('core-constructs.bpmn');
  const types = new Set(model.elements.map((item) => item.bpmnType));
  for (const expected of ['bpmn:UserTask', 'bpmn:ManualTask', 'bpmn:ServiceTask', 'bpmn:BusinessRuleTask', 'bpmn:ScriptTask', 'bpmn:ReceiveTask', 'bpmn:ExclusiveGateway', 'bpmn:InclusiveGateway', 'bpmn:ParallelGateway', 'bpmn:EventBasedGateway', 'bpmn:SubProcess', 'bpmn:CallActivity', 'bpmn:BoundaryEvent', 'bpmn:ErrorEventDefinition', 'bpmn:IntermediateCatchEvent', 'bpmn:TimerEventDefinition', 'bpmn:IntermediateThrowEvent', 'bpmn:DataObjectReference', 'bpmn:DataInputAssociation', 'bpmn:Association']) assert.ok(types.has(expected), expected);
  assert.equal(model.elements.find((item) => item.sourceId === 'Service_1').bpmnType, 'bpmn:ServiceTask');
  assert.ok(!stableJson(model.elements.find((item) => item.sourceId === 'Service_1')).match(/\bAI\b/u));
  assert.ok(model.relationships.some((item) => item.sourceId === 'Boundary_1' && item.sourceProperty === 'attachedToRef' && item.targetId === 'Sub_1'));
  assert.equal(model.elements.find((item) => item.sourceId === 'Boundary_1').attributes.cancelActivity, true);
  assert.ok(model.relationships.some((item) => item.sourceId === 'Call_1' && item.sourceProperty === 'calledElement' && item.targetId === 'Global_Task_1'));
  assert.ok(model.relationships.some((item) => item.kind === 'DATA_ASSOCIATION'));
});

test('BPMN-A09 duplicate IDs are rejected deterministically', async () => {
  const first = await run('duplicate-id.bpmn');
  const second = await run('duplicate-id.bpmn');
  assert.equal(first.status, 'REJECTED');
  assert.deepEqual(first.diagnostics, second.diagnostics);
  assert.ok(first.diagnostics.some((item) => item.code === 'BPMN-VAL-001' && item.sourceId === 'Duplicate_1'));
});

test('BPMN-A10 dangling references remain staged with explicit diagnostics', async () => {
  const model = await run('dangling-reference.bpmn');
  assert.equal(model.status, 'STAGED');
  assert.ok(model.diagnostics.some((item) => item.severity === 'ERROR' && /Missing_Target|unresolved reference/iu.test(item.message)));
});

test('BPMN-A11 extension content remains inert and visible', async () => {
  const model = await run('unknown-extension.bpmn');
  const process = model.elements.find((item) => item.sourceId === 'Process_Ext');
  assert.equal(process.extensionAttributes['vendor:reviewState'], 'synthetic');
  assert.ok(model.elements.some((item) => item.bpmnType === 'vendor:advisory' && item.supportState === 'PRESERVED_UNMAPPED'));
  assert.ok(model.diagnostics.some((item) => item.code === 'BPMN-VAL-004'));
});

test('BPMN DI is preserved as rendering metadata without adding process semantics', async () => {
  const model = await run('diagram-interchange.bpmn');
  assert.ok(model.elements.some((item) => item.bpmnType === 'bpmndi:BPMNDiagram'));
  assert.ok(model.elements.some((item) => item.bpmnType === 'dc:Bounds'));
  assert.ok(model.relationships.some((item) => item.kind === 'DI_LINK' && item.targetId === 'Start_DI'));
  assert.deepEqual(model.mappingCandidates, []);
});

test('deferred conversation and vendor dialect content remain visible but unmapped', async () => {
  const model = await run('deferred-and-vendor.bpmn');
  assert.equal(model.elements.find((item) => item.sourceId === 'Conversation_1').supportState, 'PRESERVED_UNMAPPED');
  const vendorTask = model.elements.find((item) => item.sourceId === 'Vendor_Task_1');
  assert.equal(vendorTask.extensionAttributes['camunda:type'], 'external');
  assert.equal(vendorTask.extensionAttributes['camunda:topic'], 'synthetic-topic');
  assert.deepEqual(model.mappingCandidates, []);
});

test('recognized choreography content parses but remains outside the v0.1 mapping profile', async () => {
  const model = await run('choreography-deferred.bpmn');
  assert.deepEqual(model.diagnostics.filter((item) => item.severity === 'ERROR'), []);
  assert.equal(model.elements.find((item) => item.sourceId === 'Choreography_1').supportState, 'PRESERVED_UNMAPPED');
  assert.equal(model.elements.find((item) => item.sourceId === 'Choreo_Task').supportState, 'PRESERVED_UNMAPPED');
  assert.deepEqual(model.mappingCandidates, []);
});

test('BPMN-A15 provenance changes when source bytes change and preserves parser identity', async () => {
  const source = await load('minimal-valid.bpmn');
  const first = await importBpmnXml({ fileName: 'minimal-valid.bpmn', data: source, importedAt: FIXED_TIME });
  const changed = await importBpmnXml({ fileName: 'minimal-valid.bpmn', data: Buffer.concat([source, Buffer.from('\n<!-- controlled mutation -->\n')]), importedAt: '2026-08-23T12:01:00.000Z' });
  assert.notEqual(first.source.sha256, changed.source.sha256);
  assert.equal(first.parser.library, 'bpmn-moddle');
  assert.equal(first.parser.libraryVersion, '10.1.0');
  assert.equal(first.parser.mappingVersion, '0.1.0');
  assert.equal(first.source.localOnly, true);
  assert.equal(first.source.importedAt, FIXED_TIME);
});

test('North Star fixture remains compatible with the standards-aware adapter', async () => {
  const data = await fs.readFile(new URL('./assets/North-Star-Mortgage-Workflow-v0.1.bpmn', import.meta.url));
  const model = validateBpmnStructure(await importBpmnXml({ fileName: 'North-Star-Mortgage-Workflow-v0.1.bpmn', data, importedAt: FIXED_TIME }));
  assert.equal(model.diagnostics.length, 0);
  assert.equal(model.elements.filter((item) => /(?:Event|Task|Gateway)$/.test(item.bpmnType)).length, 14);
  assert.equal(model.elements.filter((item) => item.bpmnType === 'bpmn:SequenceFlow').length, 13);
});
