/** UX safety primitives. No approval, authority or evidence-validation decisions. */
export class WorkspaceStorageError extends Error {
  constructor(code, message, cause) {
    super(message, { cause });
    this.name = 'WorkspaceStorageError';
    this.code = code;
  }
}

export function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function assertSafeJSON(value, depth = 0) {
  if (depth > 40) throw new Error('Record nesting exceeds the supported limit.');
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      if (['__proto__', 'constructor', 'prototype'].includes(key)) {
        throw new Error(`Unsupported record property: ${key}`);
      }
      assertSafeJSON(child, depth + 1);
    }
  }
  return value;
}

/** Validate structural contracts without manufacturing or approving domain records. */
export function validateWorkspaceShape(value) {
  if (!isRecord(value)) throw new Error('Workspace must be an object.');
  assertSafeJSON(value);
  const objects = ['opportunity', 'baseline', 'risk', 'authorityEnvelope', 'architecture', 'pilot', 'results', 'regulatory', 'complianceCost', 'feoa'];
  const arrays = ['evidence', 'inventory', 'authorityEnvelopes', 'uxRemovalHistory'];
  for (const key of objects) {
    if (key in value && !isRecord(value[key])) throw new Error(`Invalid workspace section: ${key}`);
  }
  for (const key of arrays) {
    if (key in value && (!Array.isArray(value[key]) || value[key].some(item => !isRecord(item)))) throw new Error(`Invalid workspace collection: ${key}`);
  }
  for (const [parent, key] of [['architecture', 'alternatives'], ['complianceCost', 'activities']]) {
    if (value[parent] && key in value[parent] && (!Array.isArray(value[parent][key]) || value[parent][key].some(item => !isRecord(item)))) {
      throw new Error(`Invalid workspace collection: ${parent}.${key}`);
    }
  }
  return value;
}

/** Optimistic same-browser conflict detection, not a multi-user transaction lock. */
export function createGuardedStore({ key, storage, empty, normalize = value => value }) {
  let raw = null;
  let loaded = false;
  let blocked = null;
  let lastError = null;
  let savedAt = null;
  const fail = (code, message, cause) => {
    lastError = new WorkspaceStorageError(code, message, cause);
    return lastError;
  };
  return {
    read() {
      if (loaded) throw new Error('A guarded store must be read only once per instance.');
      loaded = true;
      try {
        raw = storage().getItem(key);
        const parsed = raw === null ? empty() : assertSafeJSON(JSON.parse(raw));
        if (!isRecord(parsed)) throw new Error('Expected an object, not a scalar or array.');
        return normalize(parsed);
      } catch (error) {
        blocked = fail('READ_BLOCKED', 'Stored work could not be read. The original is protected from overwrite. Export recovery data before repairing it.', error);
        return empty();
      }
    },
    save(value) {
      if (!loaded) throw new Error('Read the guarded store before saving.');
      if (blocked) throw blocked;
      try {
        if (!isRecord(value)) throw new Error('Workspace must be an object.');
        assertSafeJSON(value);
        // Do not normalize writes: unknown domain fields must not be discarded.
        const serialized = JSON.stringify(value);
        const target = storage();
        if (target.getItem(key) !== raw) {
          throw fail('CONFLICT', 'Another tab or process changed this record. Export your current work and reload before reconciling it.');
        }
        target.setItem(key, serialized);
        raw = serialized;
        savedAt = new Date().toISOString();
        lastError = null;
        return savedAt;
      } catch (error) {
        if (error instanceof WorkspaceStorageError) throw error;
        throw fail('WRITE_FAILED', 'Changes were not saved in this browser. Keep this tab open, retry, or export your current work.', error);
      }
    },
    getState() { return { key, loaded, blocked: Boolean(blocked), error: lastError, raw, savedAt }; }
  };
}

export const BASELINE_FIELDS = Object.freeze({
  annualVolume: 'Annual volume', hoursPerOccurrence: 'Hours per occurrence',
  loadedRate: 'Loaded hourly rate', annualErrorCost: 'Annual error cost',
  currentToolCost: 'Current annual tool cost', laborReduction: 'Labor reduction percentage',
  errorReduction: 'Error reduction percentage', implementationCost: 'Implementation cost',
  recurringCost: 'Annual recurring cost'
});

export function finiteInput(value) {
  if (value === null || value === undefined || typeof value === 'boolean') return null;
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && !value.trim()) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

/** Preserve established formulas. Missing/invalid inputs never become assumed zero. */
export function calculateBaseline(input = {}) {
  const numbers = {}, missing = [], invalid = [];
  for (const [field, label] of Object.entries(BASELINE_FIELDS)) {
    const supplied = input[field];
    const absent = supplied === null || supplied === undefined || (typeof supplied === 'string' && !supplied.trim());
    const number = finiteInput(supplied);
    if (absent) missing.push(label);
    else if (number === null || number < 0 || (field.endsWith('Reduction') && number > 100)) invalid.push(label);
    numbers[field] = number;
  }
  const result = { labor: null, current: null, reducedLabor: null, reducedErrors: null,
    benefit: null, implementation: null, payback: null, roi: null,
    calculationState: invalid.length ? 'invalid' : missing.length ? 'incomplete' : 'complete',
    missing, invalid };
  if (missing.length || invalid.length) return result;
  const n = numbers;
  const labor = n.annualVolume * n.hoursPerOccurrence * n.loadedRate;
  const reducedLabor = labor * n.laborReduction / 100;
  const reducedErrors = n.annualErrorCost * n.errorReduction / 100;
  const current = labor + n.annualErrorCost + n.currentToolCost;
  const benefit = reducedLabor + reducedErrors - n.recurringCost;
  const payback = benefit > 0 ? n.implementationCost / benefit : null;
  const roi = n.implementationCost > 0 ? (benefit - n.implementationCost) / n.implementationCost * 100 : null;
  if ([labor, reducedLabor, reducedErrors, current, benefit, payback, roi].some(value => value !== null && !Number.isFinite(value))) {
    return { ...result, calculationState: 'invalid', invalid: ['Calculation exceeds the supported numeric range'] };
  }
  return { ...result, labor, current, reducedLabor, reducedErrors, benefit,
    implementation: n.implementationCost, payback, roi };
}

export function baselineExplanation(result) {
  if (result.calculationState === 'invalid') return `Not calculated. Correct: ${result.invalid.join('; ')}.`;
  if (result.calculationState === 'incomplete') return `Not calculated. Supply: ${result.missing.join('; ')}. Enter an explicit 0 when zero is known.`;
  return 'Forecast from entered inputs, not a validated or realized result. Evidence review remains separate.';
}

const SUPPORTED_COLLECTIONS = Object.freeze(['evidence', 'inventory', 'complianceCost.activities']);
function collectionAt(data, path) {
  if (!SUPPORTED_COLLECTIONS.includes(path)) throw new Error('Unsupported removal collection.');
  const rows = path.split('.').reduce((value, key) => value?.[key], data);
  if (!Array.isArray(rows)) throw new Error('Expected a record collection.');
  return rows;
}

function referenceExists(value, token) {
  if (!token) return false;
  if (typeof value === 'string') {
    if (value.trim() === token) return true;
    // Match explicit IDs/names in delimited lists or prose, never a short
    // substring inside another identifier (E1 != E10; CRM != CRMS).
    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^\\p{L}\\p{N}_-])${escaped}(?=$|[^\\p{L}\\p{N}_-])`, 'u').test(value);
  }
  if (Array.isArray(value)) return value.some(item => referenceExists(item, token));
  if (isRecord(value)) return Object.values(value).some(item => referenceExists(item, token));
  return false;
}

/** Conservative protection; this is not a substitute for full domain lineage. */
export function removalBlockReason(data, path, index) {
  const rows = collectionAt(data, path), record = rows[index];
  if (!Number.isInteger(index) || !record) return 'The selected record is no longer available.';
  if (path === 'evidence' && ['Validated', 'Resolved'].includes(record.state)) {
    return 'Reviewed evidence is retained. Add a superseding evidence entry and explain the correction rather than deleting the original.';
  }
  const other = structuredClone(data);
  collectionAt(other, path).splice(index, 1);
  delete other.uxRemovalHistory;
  // feoa.evidence is a synchronized mirror, not an independent dependency.
  if (path === 'evidence' && isRecord(other.feoa)) delete other.feoa.evidence;
  const tokens = [record.id, ...(path === 'inventory' ? [record.name] : [])]
    .filter(value => typeof value === 'string' || typeof value === 'number')
    .map(value => String(value).trim()).filter(Boolean);
  if (tokens.some(token => referenceExists(other, token))) return 'This record is referenced elsewhere. Retain it and resolve those dependencies before removal.';
  // Unidentified evidence cannot be proven unreferenced once an authority record exists.
  if (path === 'evidence' && !record.id && ((data.authorityEnvelopes || []).length || Object.keys(data.authorityEnvelope || {}).length)) {
    return 'This evidence has no stable ID and an authority record exists. Its dependencies cannot be safely resolved, so it has been retained.';
  }
  return null;
}

export function removeLocalRecord(data, path, index, now = new Date().toISOString()) {
  const reason = removalBlockReason(data, path, index);
  if (reason) throw new Error(reason);
  const next = structuredClone(data);
  const [record] = collectionAt(next, path).splice(index, 1);
  next.uxRemovalHistory = [...(next.uxRemovalHistory || []), { path, index, record, removedAt: now }];
  // No automatic expiry or silent truncation of recovery records.
  return next;
}

export function undoLocalRemoval(data) {
  const next = structuredClone(data), history = next.uxRemovalHistory || [];
  if (!history.length) throw new Error('No removal is available to undo.');
  const event = history.at(-1), rows = collectionAt(next, event.path);
  if (event.record.id && rows.some(row => row.id === event.record.id)) {
    throw new Error('A record with the same ID now exists. Reconcile it before restoring this record.');
  }
  rows.splice(Math.min(event.index, rows.length), 0, event.record);
  history.pop();
  return next;
}
