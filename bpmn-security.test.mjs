import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { importBpmnXml, inspectXmlSafety } from './bpmn-parser-adapter.mjs';
import { BPMN_IMPORT_LIMITS } from './bpmn-import-model.mjs';

const load = (name) => fs.readFile(new URL(`./bpmn-fixtures/${name}`, import.meta.url));
const canonicalFixtureBytes = (bytes) => Buffer.from(bytes.toString('utf8').replace(/\r\n/g, '\n'), 'utf8');

async function rejectsFixture(name, code) {
  const data = await load(name);
  await assert.rejects(() => importBpmnXml({ fileName: name, data, importedAt: '2026-08-23T12:00:00.000Z' }), (error) => error.code === code);
}

test('BPMN-A12 rejects DTD and entity declarations before parsing', async () => rejectsFixture('doctype-entity.xml', 'BPMN-SEC-001'));
test('BPMN-A12 rejects external import locations and never retrieves them', async () => rejectsFixture('remote-import.bpmn', 'BPMN-SEC-009'));

test('BPMN-A12 rejects non-declaration processing instructions', async () => {
  const xml = '<?xml version="1.0"?><?unsafe action="run"?><bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"/>';
  await assert.rejects(() => importBpmnXml({ fileName: 'pi.xml', data: xml }), (error) => error.code === 'BPMN-SEC-003');
});

test('BPMN-A12 malformed XML is rejected without a partial inventory', async () => {
  const model = await importBpmnXml({ fileName: 'malformed.xml', data: await load('malformed.xml'), importedAt: '2026-08-23T12:00:00.000Z' }).catch((error) => error);
  assert.ok(model.code === 'BPMN-SEC-008' || (model.status === 'REJECTED' && model.elements.length === 0));
});

test('BPMN-A13 rejects oversize input, excessive depth, and excessive values', async () => {
  const oversized = new Uint8Array(BPMN_IMPORT_LIMITS.maxBytes + 1).fill(32);
  await assert.rejects(() => importBpmnXml({ fileName: 'large.bpmn', data: oversized }), (error) => error.code === 'BPMN-SEC-005');
  const deep = `${'<a>'.repeat(BPMN_IMPORT_LIMITS.maxDepth + 1)}${'</a>'.repeat(BPMN_IMPORT_LIMITS.maxDepth + 1)}`;
  assert.throws(() => inspectXmlSafety(deep), (error) => error.code === 'BPMN-SEC-005');
  const longValue = `<a value="${'x'.repeat(BPMN_IMPORT_LIMITS.maxValueLength + 1)}"/>`;
  assert.throws(() => inspectXmlSafety(longValue), (error) => error.code === 'BPMN-SEC-006');
});

test('secure intake rejects invalid extension, media type, and invalid UTF-8', async () => {
  const valid = await load('minimal-valid.bpmn');
  await assert.rejects(() => importBpmnXml({ fileName: 'model.txt', data: valid }), (error) => error.code === 'BPMN-SEC-010');
  await assert.rejects(() => importBpmnXml({ fileName: 'model.bpmn', mediaType: 'text/html', data: valid }), (error) => error.code === 'BPMN-SEC-010');
  await assert.rejects(() => importBpmnXml({ fileName: 'model.bpmn', data: Uint8Array.from([0xc3, 0x28]) }), (error) => error.code === 'BPMN-SEC-011');
  await assert.rejects(() => importBpmnXml({ fileName: '../model.bpmn', data: valid }), (error) => error.code === 'BPMN-SEC-010');
  await assert.rejects(() => importBpmnXml({ fileName: 'model.bpmn', data: valid, importedAt: 'not-a-time' }), (error) => error.code === 'BPMN-SEC-012');
});

test('media types are normalized before provenance is recorded', async () => {
  const model = await importBpmnXml({ fileName: 'model.bpmn', mediaType: 'Application/XML', data: await load('minimal-valid.bpmn'), importedAt: '2026-08-23T12:00:00Z' });
  assert.equal(model.source.mediaType, 'application/xml');
});

test('XML scanner rejects unquoted attributes instead of interpreting them', () => {
  assert.throws(() => inspectXmlSafety('<a value=unsafe/>'), (error) => error.code === 'BPMN-SEC-008');
});

test('XML scanner enforces comment and trailing-text value limits', () => {
  assert.throws(() => inspectXmlSafety(`<!--${'x'.repeat(BPMN_IMPORT_LIMITS.maxValueLength + 1)}--><a/>`), (error) => error.code === 'BPMN-SEC-006');
  assert.throws(() => inspectXmlSafety(`<a/>${'x'.repeat(BPMN_IMPORT_LIMITS.maxValueLength + 1)}`), (error) => error.code === 'BPMN-SEC-006');
});

test('fixture manifest hashes match every retained synthetic fixture in canonical LF form', async () => {
  const manifest = JSON.parse(await fs.readFile(new URL('./bpmn-fixtures/manifest.json', import.meta.url), 'utf8'));
  for (const fixture of manifest.fixtures) {
    const bytes = await load(fixture.file);
    assert.equal(createHash('sha256').update(canonicalFixtureBytes(bytes)).digest('hex'), fixture.sha256, fixture.file);
  }
});

test('fixture manifest identity is invariant to Windows line-ending checkout conversion', async () => {
  const bytes = await load('choreography-deferred.bpmn');
  const windowsBytes = Buffer.from(canonicalFixtureBytes(bytes).toString('utf8').replace(/\n/g, '\r\n'), 'utf8');
  assert.equal(createHash('sha256').update(canonicalFixtureBytes(windowsBytes)).digest('hex'), createHash('sha256').update(canonicalFixtureBytes(bytes)).digest('hex'));
});
