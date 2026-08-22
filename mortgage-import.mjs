import { MORTGAGE_FIXTURE } from './mortgage-fixture.mjs';
import { validateMortgageFixture } from './mortgage-model.mjs';

export const MORTGAGE_IMPORT_TEMPLATE_ID = 'MTG-IMPORT-V0.2';
export const MORTGAGE_IMPORT_TEMPLATE_FILE = 'assets/North-Star-Mortgage-Controlled-Import-Template-v0.2.xlsx';

const REQUIRED_SHEETS = Object.freeze({
  'Case Inputs': ['ID', 'Field', 'Value', 'Type', 'Visibility'],
  'Fictional Policy': ['ID', 'Criterion', 'Operator', 'Standard', 'Exception Boundary', 'Unit'],
  'Evidence Inventory': ['ID', 'Document Type', 'As Of', 'Status', 'Source', 'Used For'],
  'ERIR Source Seed': ['ID', 'Source', 'Instrument Type', 'Status', 'URL'],
});
const FORBIDDEN_ARCHIVE_PATHS = [/vbaProject\.bin$/i, /xl\/externalLinks\//i, /xl\/embeddings\//i, /xl\/connections\.xml$/i];
const FORBIDDEN_TERMS = /(^|[_\s-])(age|race|ethnicity|sex|gender|protected[ _-]?class|hmda[ _-]?demographic)([_\s-]|$)/i;
const MAX_FILE_BYTES = 2_000_000;
const MAX_UNCOMPRESSED_BYTES = 6_000_000;

const textDecoder = new TextDecoder('utf-8');
const readU16 = (view, offset) => view.getUint16(offset, true);
const readU32 = (view, offset) => view.getUint32(offset, true);

function xmlDecode(value='') {
  return value.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

function attr(attributes, name) {
  const match = attributes.match(new RegExp(`(?:^|\\s)${name.replace(':', '\\:')}="([^"]*)"`));
  return match ? xmlDecode(match[1]) : '';
}

function columnIndex(reference) {
  const letters = String(reference).match(/^[A-Z]+/i)?.[0]?.toUpperCase() || '';
  let result = 0;
  for (const letter of letters) result = result * 26 + letter.charCodeAt(0) - 64;
  return result - 1;
}

async function inflateRaw(bytes) {
  if (typeof DecompressionStream !== 'function') throw new Error('This browser does not support controlled XLSX decompression.');
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function unzipXlsx(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  if (bytes.byteLength > MAX_FILE_BYTES) throw new Error(`Workbook exceeds the ${MAX_FILE_BYTES.toLocaleString()}-byte controlled import limit.`);
  const view = new DataView(arrayBuffer);
  let eocd = -1;
  for (let offset = Math.max(0, bytes.length - 65_557); offset <= bytes.length - 22; offset += 1) {
    if (readU32(view, offset) === 0x06054b50) eocd = offset;
  }
  if (eocd < 0) throw new Error('The selected file is not a readable XLSX archive.');
  const entryCount = readU16(view, eocd + 10);
  let cursor = readU32(view, eocd + 16);
  const entries = new Map();
  let totalUncompressed = 0;
  for (let index = 0; index < entryCount; index += 1) {
    if (readU32(view, cursor) !== 0x02014b50) throw new Error('The XLSX directory is malformed.');
    const method = readU16(view, cursor + 10);
    const compressedSize = readU32(view, cursor + 20);
    const uncompressedSize = readU32(view, cursor + 24);
    const nameLength = readU16(view, cursor + 28);
    const extraLength = readU16(view, cursor + 30);
    const commentLength = readU16(view, cursor + 32);
    const localOffset = readU32(view, cursor + 42);
    const name = textDecoder.decode(bytes.subarray(cursor + 46, cursor + 46 + nameLength));
    if (FORBIDDEN_ARCHIVE_PATHS.some(pattern => pattern.test(name))) throw new Error(`Workbook contains a prohibited embedded or external component: ${name}`);
    totalUncompressed += uncompressedSize;
    if (totalUncompressed > MAX_UNCOMPRESSED_BYTES) throw new Error('Workbook expands beyond the controlled import limit.');
    if (readU32(view, localOffset) !== 0x04034b50) throw new Error(`The XLSX entry is malformed: ${name}`);
    const localNameLength = readU16(view, localOffset + 26);
    const localExtraLength = readU16(view, localOffset + 28);
    const start = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = bytes.subarray(start, start + compressedSize);
    let content;
    if (method === 0) content = compressed.slice();
    else if (method === 8) content = await inflateRaw(compressed);
    else throw new Error(`Unsupported XLSX compression method ${method}.`);
    if (uncompressedSize && content.byteLength !== uncompressedSize) throw new Error(`XLSX entry size mismatch: ${name}`);
    entries.set(name.replace(/^\//, ''), content);
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

function xmlEntry(entries, name, required=true) {
  const bytes = entries.get(name);
  if (!bytes) {
    if (required) throw new Error(`Required XLSX component is missing: ${name}`);
    return '';
  }
  return textDecoder.decode(bytes);
}

function sharedStrings(entries) {
  const xml = xmlEntry(entries, 'xl/sharedStrings.xml', false);
  if (!xml) return [];
  return [...xml.matchAll(/<(?:\w+:)?si\b[^>]*>([\s\S]*?)<\/(?:\w+:)?si>/g)].map(match => [...match[1].matchAll(/<(?:\w+:)?t\b[^>]*>([\s\S]*?)<\/(?:\w+:)?t>/g)].map(part => xmlDecode(part[1])).join(''));
}

function parseWorksheet(xml, strings) {
  if (/<(?:\w+:)?f\b/i.test(xml)) throw new Error('Formulas are prohibited in the controlled import template.');
  const rows = [];
  for (const match of xml.matchAll(/<(?:\w+:)?c\b([^>]*?)\/>|<(?:\w+:)?c\b([^>]*)>([\s\S]*?)<\/(?:\w+:)?c>/g)) {
    const attributes = match[1] ?? match[2];
    const body = match[3] || '';
    const reference = attr(attributes, 'r');
    const rowIndex = Math.max(0, Number(reference.match(/\d+$/)?.[0] || 1) - 1);
    const colIndex = Math.max(0, columnIndex(reference));
    const type = attr(attributes, 't');
    const raw = body.match(/<(?:\w+:)?v\b[^>]*>([\s\S]*?)<\/(?:\w+:)?v>/)?.[1];
    const inline = [...body.matchAll(/<(?:\w+:)?t\b[^>]*>([\s\S]*?)<\/(?:\w+:)?t>/g)].map(part => xmlDecode(part[1])).join('');
    let value = '';
    if (type === 's') value = strings[Number(raw)] ?? '';
    else if (type === 'inlineStr') value = inline;
    else if (type === 'b') value = raw === '1';
    else if (raw !== undefined && raw !== '') value = Number.isFinite(Number(raw)) ? Number(raw) : xmlDecode(raw);
    rows[rowIndex] ||= [];
    rows[rowIndex][colIndex] = value;
  }
  return rows.map(row => row || []);
}

function workbookSheets(entries) {
  const workbook = xmlEntry(entries, 'xl/workbook.xml');
  const relationships = xmlEntry(entries, 'xl/_rels/workbook.xml.rels');
  const targets = new Map([...relationships.matchAll(/<Relationship\b([^>]*)\/>/g)].map(match => [attr(match[1], 'Id'), attr(match[1], 'Target')]));
  return [...workbook.matchAll(/<(?:\w+:)?sheet\b([^>]*)\/>/g)].map(match => {
    const name = attr(match[1], 'name');
    const relationshipId = attr(match[1], 'r:id');
    const target = targets.get(relationshipId);
    if (!target) throw new Error(`Worksheet relationship is missing: ${name}`);
    const normalized = target.startsWith('/') ? target.slice(1) : `xl/${target.replace(/^\.\//, '')}`;
    return { name, path: normalized.replace(/xl\/\.\.\//g, '') };
  });
}

function exactRow(row, expected, label) {
  const actual = row.slice(0, expected.length).map(value => String(value ?? '').trim());
  if (actual.length !== expected.length || expected.some((value, index) => actual[index] !== value)) throw new Error(`${label} headers do not match the controlled template. Found: ${actual.join(' | ') || 'none'}.`);
  if (row.slice(expected.length).some(value => String(value ?? '').trim())) throw new Error(`${label} contains an unapproved column.`);
}

function dataRows(matrix, sheetName) {
  const expected = REQUIRED_SHEETS[sheetName];
  if (String(matrix[0]?.[0] ?? '').trim() !== `Controlled template: ${MORTGAGE_IMPORT_TEMPLATE_ID}`) throw new Error(`${sheetName} does not identify ${MORTGAGE_IMPORT_TEMPLATE_ID}.`);
  exactRow(matrix[3] || [], expected, sheetName);
  const rows = matrix.slice(4).filter(row => row.some(value => String(value ?? '').trim() !== ''));
  if (rows.length > 100) throw new Error(`${sheetName} exceeds the 100-row controlled limit.`);
  rows.forEach((row, index) => {
    if (row.slice(expected.length).some(value => String(value ?? '').trim())) throw new Error(`${sheetName} row ${index + 5} contains an unapproved column.`);
    if (!String(row[0] ?? '').trim()) throw new Error(`${sheetName} row ${index + 5} has no stable identifier.`);
  });
  return rows;
}

function parseBoolean(value, label) {
  if (value === true || value === 1 || String(value).toLowerCase() === 'true') return true;
  if (value === false || value === 0 || String(value).toLowerCase() === 'false') return false;
  throw new Error(`${label} must be TRUE or FALSE.`);
}

function parseTyped(value, type, label) {
  if (type === 'boolean') return parseBoolean(value, label);
  if (['currency', 'integer', 'percentage', 'months'].includes(type)) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) throw new Error(`${label} must be numeric.`);
    return parsed;
  }
  if (type !== 'text') throw new Error(`${label} has an unsupported type: ${type}`);
  return String(value ?? '').trim();
}

function assertSafeText(value, label) {
  if (FORBIDDEN_TERMS.test(String(value ?? ''))) throw new Error(`${label} introduces a prohibited protected-class or age field.`);
}

function mapFixture(matrices, fileName, sha256) {
  const inputRows = dataRows(matrices['Case Inputs'], 'Case Inputs');
  const allowedInputs = new Map(MORTGAGE_FIXTURE.caseInputs.map(row => [row.field, row]));
  const caseInputs = inputRows.map((row, index) => {
    const [id, field, value, type, visibility] = row;
    assertSafeText(field, `Case Inputs row ${index + 5}`);
    const baseline = allowedInputs.get(String(field));
    if (!baseline) throw new Error(`Case Inputs row ${index + 5} uses an unapproved field: ${field}`);
    if (id !== baseline.id || type !== baseline.type || visibility !== baseline.visibility) throw new Error(`Case Inputs row ${index + 5} changes controlled metadata for ${field}.`);
    return { id:String(id), field:String(field), value:parseTyped(value, String(type), `Case Inputs ${field}`), type:String(type), visibility:String(visibility) };
  });
  if (caseInputs.length !== MORTGAGE_FIXTURE.caseInputs.length) throw new Error('Case Inputs must retain every controlled field exactly once.');

  const allowedPolicy = new Map(MORTGAGE_FIXTURE.policy.map(row => [row.criterion, row]));
  const policy = dataRows(matrices['Fictional Policy'], 'Fictional Policy').map((row, index) => {
    const [id, criterion, operator, standard, exceptionBoundary, unit] = row;
    const baseline = allowedPolicy.get(String(criterion));
    if (!baseline) throw new Error(`Fictional Policy row ${index + 5} uses an unapproved criterion: ${criterion}`);
    if (id !== baseline.id || operator !== baseline.operator || unit !== baseline.unit) throw new Error(`Fictional Policy row ${index + 5} changes controlled metadata for ${criterion}.`);
    return { id:String(id), criterion:String(criterion), operator:String(operator), standard:parseTyped(standard, String(unit), `Policy ${criterion}`), exceptionBoundary:String(exceptionBoundary ?? '').trim()===''?null:parseTyped(exceptionBoundary, String(unit), `Policy exception ${criterion}`), unit:String(unit) };
  });
  if (policy.length !== MORTGAGE_FIXTURE.policy.length) throw new Error('Fictional Policy must retain every controlled criterion exactly once.');

  const evidence = dataRows(matrices['Evidence Inventory'], 'Evidence Inventory').map((row, index) => {
    const [id, documentType, asOf, status, source, usedFor] = row.map(value => String(value ?? '').trim());
    for (const [label, value] of [['document type', documentType], ['use', usedFor]]) assertSafeText(value, `Evidence Inventory ${label} row ${index + 5}`);
    if (!/^DOC-MTG-[A-Z0-9-]+$/.test(id)) throw new Error(`Evidence Inventory row ${index + 5} has an invalid identifier.`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf)) throw new Error(`Evidence Inventory row ${index + 5} must use YYYY-MM-DD.`);
    return { id, documentType, asOf, status, source, usedFor };
  });

  const erirSources = dataRows(matrices['ERIR Source Seed'], 'ERIR Source Seed').map((row, index) => {
    const [id, source, instrumentType, status, url] = row.map(value => String(value ?? '').trim());
    if (!/^ERIR-MTG-[A-Z0-9-]+$/.test(id)) throw new Error(`ERIR Source Seed row ${index + 5} has an invalid identifier.`);
    if (url && !/^https:\/\//i.test(url)) throw new Error(`ERIR Source Seed row ${index + 5} must use an HTTPS URL or remain blank.`);
    return { id, source, instrumentType, status, url };
  });

  const fixture = {
    ...structuredClone(MORTGAGE_FIXTURE),
    fixtureId: 'MTG-NORTH-STAR-V0.2',
    sourceArtifact: fileName,
    sourceSha256: sha256,
    importedSheets: Object.keys(REQUIRED_SHEETS),
    excludedSheets: [],
    caseInputs,
    policy,
    evidence,
    erirSources,
  };
  const validation = validateMortgageFixture(fixture);
  if (!validation.valid) throw new Error(validation.errors.join(' '));
  return fixture;
}

export async function sha256Hex(arrayBuffer) {
  const digest = await crypto.subtle.digest('SHA-256', arrayBuffer);
  return [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join('');
}

export async function importMortgageWorkbook(arrayBuffer, fileName='controlled-import.xlsx') {
  const entries = await unzipXlsx(arrayBuffer);
  const sheets = workbookSheets(entries);
  const actualNames = sheets.map(sheet => sheet.name);
  const expectedNames = Object.keys(REQUIRED_SHEETS);
  const missing = expectedNames.filter(name => !actualNames.includes(name));
  const extra = actualNames.filter(name => !expectedNames.includes(name));
  if (missing.length || extra.length) throw new Error(`Workbook sheet contract mismatch. Missing: ${missing.join(', ') || 'none'}. Unapproved: ${extra.join(', ') || 'none'}.`);
  const strings = sharedStrings(entries);
  const matrices = Object.fromEntries(sheets.map(sheet => [sheet.name, parseWorksheet(xmlEntry(entries, sheet.path), strings)]));
  const sha256 = await sha256Hex(arrayBuffer);
  const fixture = mapFixture(matrices, fileName, sha256);
  return {
    fixture,
    report: {
      templateId: MORTGAGE_IMPORT_TEMPLATE_ID,
      sourceArtifact: fileName,
      sourceSha256: sha256,
      importedSheets: expectedNames,
      acceptedRows: fixture.caseInputs.length + fixture.policy.length + fixture.evidence.length + fixture.erirSources.length,
      protectedRowsAccepted: 0,
      persistence: 'Session memory only',
      authority: 'No credit or action authority',
    },
  };
}
