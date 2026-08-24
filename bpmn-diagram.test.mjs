import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { importBpmnXml } from './bpmn-parser-adapter.mjs';
import { buildBpmnDiagramView, BPMN_DIAGRAM_VIEW_PROFILE } from './bpmn-diagram.mjs';

test('BPMN diagram view is deterministic, read-only, and does not add process semantics', async () => {
  const data = await readFile(new URL('./assets/North-Star-Mortgage-Workflow-v0.1.bpmn', import.meta.url));
  const model = await importBpmnXml({ fileName: 'North-Star-Mortgage-Workflow-v0.1.bpmn', mediaType: 'application/bpmn+xml', data, importedAt: '2026-08-24T00:00:00Z' });
  const first = buildBpmnDiagramView(model);
  const second = buildBpmnDiagramView(model);
  assert.equal(first.profile, BPMN_DIAGRAM_VIEW_PROFILE);
  assert.equal(first.layout, 'DETERMINISTIC_AUTO_LAYOUT');
  assert.deepEqual(first, second);
  assert.ok(first.nodes.length > 0);
  assert.ok(first.edges.length > 0);
  assert.ok(first.nodes.every((node) => Array.isArray(node.candidateIds)));
  assert.equal(Object.hasOwn(first, 'authority'), false);
  assert.equal(Object.hasOwn(first, 'execution'), false);
  assert.equal(model.elements.some((element) => Object.hasOwn(element, 'x')), false);
});

test('BPMN diagram view uses source DI bounds when they are present', async () => {
  const data = await readFile(new URL('./bpmn-fixtures/diagram-interchange.bpmn', import.meta.url));
  const model = await importBpmnXml({ fileName: 'diagram-interchange.bpmn', mediaType: 'application/bpmn+xml', data, importedAt: '2026-08-24T00:00:00Z' });
  const view = buildBpmnDiagramView(model);
  assert.equal(view.layout, 'SOURCE_DI');
  assert.deepEqual(view.nodes.find((node) => node.id === 'Start_DI'), { id: 'Start_DI', type: 'bpmn:StartEvent', label: 'Start_DI', candidateIds: [], x: 10, y: 10, width: 36, height: 36 });
});

test('BPMN diagram falls back safely when source DI bounds are incomplete', async () => {
  const xml = '<?xml version="1.0" encoding="UTF-8"?><bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" id="D" targetNamespace="https://example.test"><bpmn:process id="P" isExecutable="false"><bpmn:startEvent id="S"><bpmn:outgoing>F1</bpmn:outgoing></bpmn:startEvent><bpmn:task id="T"><bpmn:incoming>F1</bpmn:incoming></bpmn:task><bpmn:sequenceFlow id="F1" sourceRef="S" targetRef="T"/></bpmn:process><bpmndi:BPMNDiagram id="D1"><bpmndi:BPMNPlane id="P1" bpmnElement="P"><bpmndi:BPMNShape id="SS" bpmnElement="S"><dc:Bounds x="10" y="10" width="36" height="36"/></bpmndi:BPMNShape></bpmndi:BPMNPlane></bpmndi:BPMNDiagram></bpmn:definitions>';
  const model = await importBpmnXml({ fileName: 'partial-di.bpmn', mediaType: 'application/bpmn+xml', data: xml, importedAt: '2026-08-24T00:00:00Z' });
  const view = buildBpmnDiagramView(model);
  assert.equal(view.layout, 'DETERMINISTIC_AUTO_LAYOUT');
  assert.ok(view.nodes.every((node) => [node.x, node.y, node.width, node.height].every(Number.isFinite)));
});

test('BPMN diagram auto-layout remains finite for a cyclic source graph', async () => {
  const xml = '<?xml version="1.0" encoding="UTF-8"?><bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" id="D" targetNamespace="https://example.test"><bpmn:process id="P" isExecutable="false"><bpmn:startEvent id="S"><bpmn:outgoing>F1</bpmn:outgoing></bpmn:startEvent><bpmn:task id="A"><bpmn:incoming>F1</bpmn:incoming><bpmn:incoming>F3</bpmn:incoming><bpmn:outgoing>F2</bpmn:outgoing></bpmn:task><bpmn:task id="B"><bpmn:incoming>F2</bpmn:incoming><bpmn:outgoing>F3</bpmn:outgoing></bpmn:task><bpmn:sequenceFlow id="F1" sourceRef="S" targetRef="A"/><bpmn:sequenceFlow id="F2" sourceRef="A" targetRef="B"/><bpmn:sequenceFlow id="F3" sourceRef="B" targetRef="A"/></bpmn:process></bpmn:definitions>';
  const model = await importBpmnXml({ fileName: 'cyclic.bpmn', mediaType: 'application/bpmn+xml', data: xml, importedAt: '2026-08-24T00:00:00Z' });
  const view = buildBpmnDiagramView(model);
  assert.equal(view.layout, 'DETERMINISTIC_AUTO_LAYOUT');
  assert.ok(view.nodes.every((node) => Number.isFinite(node.x) && node.x < 2_000));
});
