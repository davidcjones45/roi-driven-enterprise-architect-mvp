import { parseBpmnXml } from './vendor/bpmn-moddle-10.1.0.bundle.mjs';
import { BPMN_IMPORT_LIMITS, BPMN_IMPORT_PROFILE, assertNormalizedImportModel } from './bpmn-import-model.mjs';

const ADAPTER_VERSION = '0.1.0';
const MAPPING_VERSION = '0.1.0';
const ALLOWED_MEDIA_TYPES = new Set(['application/xml', 'text/xml', 'application/bpmn+xml', '']);
const URI_REFERENCE_ATTRIBUTES = new Set(['href', 'src', 'location', 'schemalocation']);

function diagnostic(code, severity, message, sourceId = null) {
  return { code, severity, message, sourceId };
}

function bytesFrom(input) {
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  if (typeof input === 'string') return new TextEncoder().encode(input);
  throw new TypeError('BPMN input must be a string, Uint8Array, or ArrayBuffer');
}

async function sha256Hex(bytes) {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('');
}

function fail(code, message, details = {}) {
  const error = new Error(message);
  error.code = code;
  Object.assign(error, details);
  return error;
}

function readTag(xml, start) {
  let quote = null;
  for (let i = start + 1; i < xml.length; i += 1) {
    const char = xml[i];
    if (quote) {
      if (char === quote) quote = null;
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (char === '>') {
      return { text: xml.slice(start, i + 1), end: i + 1 };
    }
  }
  throw fail('BPMN-SEC-008', 'Unterminated XML tag');
}

function parseStartTag(tag) {
  const body = tag.slice(1, tag.endsWith('/>') ? -2 : -1).trim();
  const nameMatch = body.match(/^([^\s/>]+)/u);
  if (!nameMatch) throw fail('BPMN-SEC-008', 'Malformed XML start tag');
  const attributes = [];
  const remainder = body.slice(nameMatch[0].length);
  const attributePattern = /([^\s=/>]+)\s*=\s*("([^"]*)"|'([^']*)')/gu;
  let match;
  let lastIndex = 0;
  while ((match = attributePattern.exec(remainder))) {
    if (remainder.slice(lastIndex, match.index).trim()) throw fail('BPMN-SEC-008', `Malformed XML attribute in <${nameMatch[1]}>`);
    attributes.push([match[1], match[3] ?? match[4] ?? '']);
    lastIndex = attributePattern.lastIndex;
  }
  const leftover = remainder.slice(lastIndex).trim();
  if (leftover) throw fail('BPMN-SEC-008', `Malformed or unquoted XML attribute in <${nameMatch[1]}>`);
  return { name: nameMatch[1], attributes, selfClosing: tag.endsWith('/>') };
}

export function inspectXmlSafety(xml, limits = BPMN_IMPORT_LIMITS) {
  const lowered = xml.toLowerCase();
  if (lowered.includes('<!doctype')) throw fail('BPMN-SEC-001', 'DOCTYPE declarations are prohibited');
  if (lowered.includes('<!entity')) throw fail('BPMN-SEC-002', 'Entity declarations are prohibited');

  let cursor = 0;
  let depth = 0;
  let maxDepth = 0;
  let elementCount = 0;
  let attributeCount = 0;
  const ids = new Map();
  const diagnostics = [];
  const stack = [];

  while (cursor < xml.length) {
    const start = xml.indexOf('<', cursor);
    if (start < 0) break;
    const text = xml.slice(cursor, start);
    if (text.length > limits.maxValueLength) throw fail('BPMN-SEC-006', 'XML text value exceeds the configured limit');

    if (xml.startsWith('<!--', start)) {
      const end = xml.indexOf('-->', start + 4);
      if (end < 0) throw fail('BPMN-SEC-008', 'Unterminated XML comment');
      if (end - (start + 4) > limits.maxValueLength) throw fail('BPMN-SEC-006', 'XML comment exceeds the configured limit');
      cursor = end + 3;
      continue;
    }
    if (xml.startsWith('<![CDATA[', start)) {
      const end = xml.indexOf(']]>', start + 9);
      if (end < 0) throw fail('BPMN-SEC-008', 'Unterminated CDATA section');
      if (end - (start + 9) > limits.maxValueLength) throw fail('BPMN-SEC-006', 'CDATA value exceeds the configured limit');
      cursor = end + 3;
      continue;
    }
    if (xml.startsWith('<?', start)) {
      const end = xml.indexOf('?>', start + 2);
      if (end < 0) throw fail('BPMN-SEC-008', 'Unterminated processing instruction');
      if (end - (start + 2) > limits.maxValueLength) throw fail('BPMN-SEC-006', 'Processing instruction exceeds the configured limit');
      const instruction = xml.slice(start, end + 2);
      if (!/^<\?xml\s[^?]*\?>$/iu.test(instruction) || xml.slice(0, start).trim()) {
        throw fail('BPMN-SEC-003', 'Processing instructions other than the leading XML declaration are prohibited');
      }
      cursor = end + 2;
      continue;
    }
    if (xml.startsWith('<!', start)) throw fail('BPMN-SEC-004', 'Unsupported XML declaration');

    const { text: tag, end } = readTag(xml, start);
    if (tag.startsWith('</')) {
      const closeName = tag.slice(2, -1).trim();
      const openName = stack.pop();
      if (!openName || openName !== closeName) throw fail('BPMN-SEC-008', `Mismatched XML closing tag: ${closeName}`);
      depth -= 1;
    } else {
      const parsed = parseStartTag(tag);
      elementCount += 1;
      attributeCount += parsed.attributes.length;
      if (elementCount > limits.maxElements) throw fail('BPMN-SEC-005', 'XML element count exceeds the configured limit');
      if (attributeCount > limits.maxAttributes) throw fail('BPMN-SEC-007', 'XML attribute count exceeds the configured limit');
      if (!parsed.selfClosing) {
        depth += 1;
        maxDepth = Math.max(maxDepth, depth);
        if (depth > limits.maxDepth) throw fail('BPMN-SEC-005', 'XML depth exceeds the configured limit');
        stack.push(parsed.name);
      }
      for (const [name, value] of parsed.attributes) {
        if (value.length > limits.maxValueLength) throw fail('BPMN-SEC-006', `Attribute ${name} exceeds the configured value limit`);
        const localName = name.toLowerCase().split(':').at(-1);
        if (localName === 'id') {
          if (ids.has(value)) diagnostics.push(diagnostic('BPMN-VAL-001', 'FATAL', `Duplicate BPMN identifier: ${value}`, value));
          else ids.set(value, parsed.name);
        }
        if (URI_REFERENCE_ATTRIBUTES.has(localName) && /(?:https?|file|ftp):/iu.test(value)) {
          throw fail('BPMN-SEC-009', `External resource reference is prohibited: ${name}`);
        }
      }
    }
    cursor = end;
  }
  if (stack.length) throw fail('BPMN-SEC-008', `Unclosed XML element: ${stack.at(-1)}`);
  if (xml.slice(cursor).length > limits.maxValueLength) throw fail('BPMN-SEC-006', 'Trailing XML text exceeds the configured limit');
  return { elementCount, attributeCount, maxDepth, diagnostics };
}

function isModdleElement(value) {
  return Boolean(value && typeof value === 'object' && typeof value.$type === 'string');
}

function primitive(value) {
  return value === null || ['string', 'number', 'boolean'].includes(typeof value);
}

function supportState(type) {
  if (/^bpmn:(?:Choreography|ChoreographyTask|SubChoreography|CallChoreography|Conversation|SubConversation|CallConversation|ConversationNode)$/u.test(type)) return 'PRESERVED_UNMAPPED';
  if (/^(bpmn|bpmndi|di|dc):/.test(type)) return 'SUPPORTED';
  return 'PRESERVED_UNMAPPED';
}

function relationKind(property, sourceType) {
  if (property === 'sourceRef' || property === 'targetRef') {
    if (sourceType === 'bpmn:SequenceFlow') return 'SEQUENCE_FLOW';
    if (sourceType === 'bpmn:MessageFlow') return 'MESSAGE_FLOW';
    if (sourceType === 'bpmn:Association') return 'ASSOCIATION';
    return 'REFERENCE';
  }
  if (/dataInputAssociations|dataOutputAssociations/u.test(property)) return 'DATA_ASSOCIATION';
  if (property === 'flowNodeRef') return 'LANE_ALLOCATION';
  if (property === 'bpmnElement') return 'DI_LINK';
  return 'REFERENCE';
}

function normalizeDefinitions(definitions, parserWarnings, safetyDiagnostics) {
  const elements = [];
  const relationships = [];
  const seenObjects = new WeakSet();
  const usedIds = new Set();

  function visit(value, containerId, path, viaProperty = null) {
    if (!isModdleElement(value) || seenObjects.has(value)) return null;
    seenObjects.add(value);
    let sourceId = value.id || `@${path}`;
    if (usedIds.has(sourceId)) sourceId = `@${path}`;
    usedIds.add(sourceId);

    const attributes = {};
    const extensionAttributes = {};
    for (const [key, item] of Object.entries(value.$attrs || {})) extensionAttributes[key] = primitive(item) ? item : String(item);
    for (const descriptor of value.$descriptor?.properties || []) {
      const key = descriptor.name;
      const item = value[key];
      if (key === 'id' || key === 'name' || isModdleElement(item) || Array.isArray(item) || item === undefined) continue;
      if (primitive(item)) attributes[key] = item;
    }
    elements.push({
      sourceId,
      bpmnType: value.$type,
      name: value.name ?? null,
      containerId,
      attributes,
      extensionAttributes,
      supportState: supportState(value.$type),
    });

    const descriptorProperties = value.$descriptor?.properties || [];
    for (const descriptor of descriptorProperties) {
      const property = descriptor.name;
      const child = value[property];
      if (child == null) continue;
      if (property === 'calledElement' && typeof child === 'string') {
        relationships.push({ kind: 'REFERENCE', sourceId, targetId: child.includes(':') ? child.split(':').at(-1) : child, sourceProperty: property });
        continue;
      }
      const values = Array.isArray(child) ? child : [child];
      values.forEach((item, index) => {
        if (!isModdleElement(item)) return;
        if (descriptor.isReference) {
          const targetId = item.id || `@unidentified-reference:${item.$type}`;
          relationships.push({ kind: relationKind(property, value.$type), sourceId, targetId, sourceProperty: property });
        } else {
          const childId = visit(item, sourceId, `${path}/${property}[${index}]`, property);
          if (childId) relationships.push({ kind: /dataInputAssociations|dataOutputAssociations/u.test(property) ? 'DATA_ASSOCIATION' : 'CONTAINMENT', sourceId, targetId: childId, sourceProperty: property });
        }
      });
    }
    return sourceId;
  }

  const definitionId = definitions.id || '@definitions';
  for (const [index, root] of (definitions.rootElements || []).entries()) visit(root, definitionId, `definitions/rootElements[${index}]`);
  for (const [index, diagram] of (definitions.diagrams || []).entries()) visit(diagram, definitionId, `definitions/diagrams[${index}]`);

  elements.sort((a, b) => a.sourceId.localeCompare(b.sourceId));
  relationships.sort((a, b) => `${a.sourceId}|${a.sourceProperty}|${a.targetId}`.localeCompare(`${b.sourceId}|${b.sourceProperty}|${b.targetId}`));
  const diagnostics = [...safetyDiagnostics];
  parserWarnings.forEach((warning) => diagnostics.push(diagnostic('BPMN-PAR-001', 'ERROR', String(warning.message || warning), warning.element?.id || null)));
  if (elements.some((element) => element.supportState !== 'SUPPORTED')) diagnostics.push(diagnostic('BPMN-VAL-004', 'WARNING', 'One or more extension elements were preserved without v0.1 mapping support'));
  diagnostics.sort((a, b) => `${a.code}|${a.sourceId || ''}|${a.message}`.localeCompare(`${b.code}|${b.sourceId || ''}|${b.message}`));
  if (diagnostics.length > BPMN_IMPORT_LIMITS.maxDiagnostics) {
    diagnostics.length = BPMN_IMPORT_LIMITS.maxDiagnostics - 1;
    diagnostics.push(diagnostic('BPMN-VAL-005', 'WARNING', 'Additional diagnostics were omitted after the configured limit'));
  }

  return {
    definitions: {
      id: definitions.id || null,
      targetNamespace: definitions.targetNamespace || null,
      exporter: definitions.exporter || null,
      exporterVersion: definitions.exporterVersion || null,
      rootElementIds: (definitions.rootElements || []).map((item, index) => item.id || `@definitions/rootElements[${index}]`),
    },
    elements,
    relationships,
    diagnostics,
  };
}

export async function importBpmnXml({ fileName, mediaType = '', data, importedAt = new Date().toISOString() }) {
  if (!/^[^/\\\u0000-\u001f]{1,255}\.(?:bpmn|xml)$/iu.test(fileName || '')) throw fail('BPMN-SEC-010', 'A local .bpmn or .xml filename is required');
  const normalizedMediaType = String(mediaType).toLowerCase();
  if (!ALLOWED_MEDIA_TYPES.has(normalizedMediaType)) throw fail('BPMN-SEC-010', `Unsupported BPMN media type: ${mediaType}`);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/u.test(importedAt) || Number.isNaN(Date.parse(importedAt))) throw fail('BPMN-SEC-012', 'Import timestamp must be a valid UTC ISO-8601 value');
  const bytes = bytesFrom(data);
  if (bytes.byteLength < 1 || bytes.byteLength > BPMN_IMPORT_LIMITS.maxBytes) throw fail('BPMN-SEC-005', 'BPMN file size is outside the configured limit');
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let xml;
  try { xml = decoder.decode(bytes); } catch { throw fail('BPMN-SEC-011', 'BPMN input is not valid UTF-8'); }
  const declaredEncoding = xml.match(/^\s*<\?xml[^>]*encoding\s*=\s*["']([^"']+)["']/iu)?.[1];
  if (declaredEncoding && declaredEncoding.toLowerCase() !== 'utf-8') throw fail('BPMN-SEC-011', 'Only UTF-8 XML is supported');

  const safety = inspectXmlSafety(xml);
  if (safety.diagnostics.some((item) => item.severity === 'FATAL')) {
    return rejectedModel(fileName, normalizedMediaType, bytes, await sha256Hex(bytes), importedAt, safety.diagnostics);
  }

  let parsed;
  try { parsed = await parseBpmnXml(xml); }
  catch (error) { return rejectedModel(fileName, normalizedMediaType, bytes, await sha256Hex(bytes), importedAt, [diagnostic('BPMN-PAR-002', 'FATAL', error.message || 'BPMN parsing failed')]); }
  const normalized = normalizeDefinitions(parsed.rootElement, parsed.warnings || [], safety.diagnostics);
  const model = {
    profile: BPMN_IMPORT_PROFILE,
    source: { fileName, sha256: await sha256Hex(bytes), byteLength: bytes.byteLength, mediaType: normalizedMediaType || 'application/bpmn+xml', localOnly: true, importedAt },
    parser: { adapterVersion: ADAPTER_VERSION, library: 'bpmn-moddle', libraryVersion: '10.1.0', mappingVersion: MAPPING_VERSION },
    ...normalized,
    mappingCandidates: [],
    status: 'STAGED',
  };
  return assertNormalizedImportModel(model);
}

function rejectedModel(fileName, mediaType, bytes, sha256, importedAt, diagnostics) {
  return assertNormalizedImportModel({
    profile: BPMN_IMPORT_PROFILE,
    source: { fileName, sha256, byteLength: bytes.byteLength, mediaType: mediaType || 'application/bpmn+xml', localOnly: true, importedAt },
    parser: { adapterVersion: ADAPTER_VERSION, library: 'bpmn-moddle', libraryVersion: '10.1.0', mappingVersion: MAPPING_VERSION },
    definitions: { id: null, targetNamespace: null, exporter: null, exporterVersion: null, rootElementIds: [] },
    elements: [], relationships: [], diagnostics: diagnostics.slice(0, BPMN_IMPORT_LIMITS.maxDiagnostics), mappingCandidates: [], status: 'REJECTED',
  });
}
