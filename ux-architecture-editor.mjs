/** Architecture editing owns presentation state only. Submission is owned by app.js. */
import { assertSafeJSON, isRecord } from './ux-safety-model.mjs';
import { captureFields, restoreFields } from './ux-safety-ui.mjs';

export const ARCHITECTURE_DRAFT_SCHEMA = 'roi-ea-architecture-draft/v2';
export const ALTERNATIVE_FIELDS = Object.freeze(['name', 'category', 'cost', 'benefit', 'feasibility', 'risk']);
export const MAX_ALTERNATIVES = 300;
const CATEGORIES = ['Do nothing', 'Retire or consolidate', 'Simplify', 'Integrate', 'Automate', 'Improve analytics', 'Introduce bounded AI'];
const editors = new WeakMap();

/** Snapshot validation is structural; it does not assess the alternatives. */
export function validateArchitectureSnapshot(snapshot) {
  if (!isRecord(snapshot) || snapshot.schema !== ARCHITECTURE_DRAFT_SCHEMA) {
    throw new Error('This architecture draft uses an unsupported format. It is retained for recovery, not partially restored.');
  }
  assertSafeJSON(snapshot);
  if (!Array.isArray(snapshot.fields) || snapshot.fields.length > 300 || snapshot.fields.some(field =>
    !isRecord(field) || typeof field.name !== 'string' || typeof field.value !== 'string' || typeof field.type !== 'string')) {
    throw new Error('Unsupported architecture header fields.');
  }
  if (!Array.isArray(snapshot.rows) || snapshot.rows.length > MAX_ALTERNATIVES) {
    throw new Error(`Architecture drafts support at most ${MAX_ALTERNATIVES} alternatives. No edits were discarded.`);
  }
  const keys = new Set();
  for (const row of snapshot.rows) {
    if (!isRecord(row) || typeof row.key !== 'string' || !row.key || keys.has(row.key) || !isRecord(row.record)) {
      throw new Error('Invalid or duplicate architecture draft row identity.');
    }
    keys.add(row.key);
    if (ALTERNATIVE_FIELDS.some(field => typeof row.record[field] !== 'string')) {
      throw new Error('The draft does not contain all six alternative fields. It was not partially restored.');
    }
  }
  if (snapshot.preferredKey !== null && (typeof snapshot.preferredKey !== 'string' || !keys.has(snapshot.preferredKey))) {
    throw new Error('The preferred alternative is not present in this draft.');
  }
  return snapshot;
}

export function createArchitectureEditor({ form, host, addButton, getRecorded }) {
  if (!form || !host || !addButton || !form.contains(host) || !form.contains(addButton)) {
    throw new Error('The architecture editor requires its existing form, row container and Add button.');
  }
  if (editors.has(form)) return editors.get(form);
  const doc = form.ownerDocument, win = doc.defaultView;
  let rowMetadata = new Map();
  let nextRowNumber = 1;
  // Alternatives have data-field controls; capture them through the row codec,
  // not through generic named-field serialization.
  const topForm = () => ({ elements: [...form.elements].filter(control => !host.contains(control)) });
  const make = (tag, text, attrs = {}) => {
    const element = doc.createElement(tag);
    if (text) element.textContent = text;
    for (const [name, value] of Object.entries(attrs)) element.setAttribute(name, value);
    return element;
  };
  const fail = message => { throw new Error(message); };

  function validate(snapshot) {
    validateArchitectureSnapshot(snapshot);
    const actual = captureFields(topForm());
    if (actual.length !== snapshot.fields.length || actual.some((field, i) =>
      field.name !== snapshot.fields[i].name || field.type !== snapshot.fields[i].type)) {
      fail('The architecture header structure changed. Export the retained draft for reconciliation.');
    }
    const controls = [...topForm().elements].filter(control => control.name && !['file','submit','button','reset'].includes(control.type));
    controls.forEach((control, i) => {
      const clone = control.cloneNode(true);
      clone.value = snapshot.fields[i].value;
      if (clone.value !== snapshot.fields[i].value) fail(`Cannot restore ${snapshot.fields[i].name} without changing its value.`);
    });
    return snapshot;
  }

  function capture() {
    const rows = [...host.querySelectorAll('.alternative')].map(article => {
      const key = article.dataset.uxRowKey;
      const meta = rowMetadata.get(key);
      if (!meta) fail('An alternative has no recognized edit identity. Keep this screen open for recovery.');
      const record = { ...structuredClone(meta) };
      for (const field of ALTERNATIVE_FIELDS) {
        const control = article.querySelector(`[data-field="${field}"]`);
        if (!control) fail(`Alternative ${key} is missing its ${field} control.`);
        record[field] = control.value;
      }
      return { key, record };
    });
    const checked = host.querySelector('input[name="preferredAlternative"]:checked');
    return validate({ schema: ARCHITECTURE_DRAFT_SCHEMA, fields: captureFields(topForm()), rows,
      preferredKey: checked?.closest('.alternative')?.dataset.uxRowKey || null });
  }

  function buildRows(snapshot) {
    const fragment = doc.createDocumentFragment();
    snapshot.rows.forEach((row, index) => {
      const article = make('article', '', { class: 'alternative', 'data-index': String(index), 'data-ux-row-key': row.key });
      const heading = make('div', '', { class: 'alternative-top' });
      const remove = make('button', 'Remove', { type: 'button', class: 'remove-alternative', 'aria-label': `Remove alternative ${index + 1}` });
      heading.append(make('strong', `Alternative ${index + 1}`), remove);
      const grid = make('div', '', { class: 'form-grid' });
      const labels = { name: 'Name', category: 'Category', cost: 'One-time cost ($)', benefit: 'Forecast annual benefit ($)', feasibility: 'Feasibility (1-5)', risk: 'Risk (1-5)' };
      for (const field of ALTERNATIVE_FIELDS) {
        const label = make('label', labels[field]);
        const control = make(field === 'category' ? 'select' : 'input', '', { required: '', 'data-field': field });
        if (field === 'category') {
          control.append(make('option', 'Select', { value: '' }));
          for (const category of CATEGORIES) control.append(make('option', category, { value: category }));
          // Preserve unknown recorded classifications without silently selecting another.
          if (row.record[field] && !CATEGORIES.includes(row.record[field])) {
            control.append(make('option', `${row.record[field]} (recorded value)`, { value: row.record[field] }));
          }
        } else if (field !== 'name') {
          control.type = 'number';
          control.min = ['cost','benefit'].includes(field) ? '0' : '1';
          control.step = ['cost','benefit'].includes(field) ? '0.01' : '1';
          if (['feasibility','risk'].includes(field)) control.max = '5';
        } else control.placeholder = 'e.g., Simplify existing workflow';
        control.value = row.record[field];
        if (control.value !== row.record[field]) fail(`Cannot restore alternative ${index + 1} ${field} without changing its value.`);
        label.append(control); grid.append(label);
      }
      const preferred = make('label', '', { class: 'full' });
      const radio = make('input', '', { type: 'radio', name: 'preferredAlternative', value: String(index) });
      radio.checked = snapshot.preferredKey === row.key;
      preferred.append(radio, doc.createTextNode(' Preferred alternative'));
      grid.append(preferred); article.append(heading, grid); fragment.append(article);
      remove.addEventListener('click', () => {
        const next = capture();
        next.rows = next.rows.filter(item => item.key !== row.key);
        if (next.preferredKey === row.key) next.preferredKey = null;
        restore(next);
        markStructureEdit();
        const remaining = [...host.querySelectorAll('.alternative [data-field="name"]')];
        (remaining[Math.min(index, remaining.length - 1)] || addButton).focus();
      });
    });
    return fragment;
  }

  function restore(snapshot) {
    validate(snapshot);
    // Construct and validate every row off-DOM before changing the visible form.
    const fragment = buildRows(snapshot);
    restoreFields(topForm(), snapshot.fields);
    rowMetadata = new Map(snapshot.rows.map(row => [row.key, structuredClone(row.record)]));
    host.replaceChildren(fragment);
  }

  function loadRecorded() {
    const record = getRecorded() || {};
    const fields = captureFields(topForm()).map(field => ({ ...field, value: String(record[field.name] ?? '') }));
    const originals = Array.isArray(record.alternatives) ? record.alternatives : [];
    const rows = originals.map((original, index) => ({ key: `recorded-${index}`, record: {
      ...structuredClone(original), ...Object.fromEntries(ALTERNATIVE_FIELDS.map(field => [field, String(original[field] ?? '')]))
    } }));
    const preferred = String(record.preferredAlternative ?? '');
    const index = /^\d+$/.test(preferred) ? Number(preferred) : -1;
    restore({ schema: ARCHITECTURE_DRAFT_SCHEMA, fields, rows, preferredKey: rows[index]?.key || null });
  }

  function recordFromEditor() {
    const snapshot = capture();
    const selected = snapshot.rows.findIndex(row => row.key === snapshot.preferredKey);
    // This returns a NEW object. The caller commits it only on explicit submit.
    return { ...structuredClone(getRecorded() || {}),
      ...Object.fromEntries(snapshot.fields.map(field => [field.name, field.value])),
      alternatives: snapshot.rows.map(row => structuredClone(row.record)),
      preferredAlternative: selected < 0 ? '' : String(selected) };
  }

  function markStructureEdit() {
    form.dispatchEvent(new win.Event('ux-form-structure-change', { bubbles: true }));
  }
  addButton.addEventListener('click', () => {
    const next = capture();
    if (next.rows.length >= MAX_ALTERNATIVES) {
      // Native validation feedback; existing edits are left untouched.
      win.alert(`The editor supports at most ${MAX_ALTERNATIVES} alternatives. Save or export the existing work before restructuring it.`);
      return;
    }
    let key;
    do { key = `draft-${nextRowNumber++}`; } while (next.rows.some(row => row.key === key));
    next.rows.push({ key, record: Object.fromEntries(ALTERNATIVE_FIELDS.map(field => [field, ''])) });
    restore(next);
    markStructureEdit();
    host.querySelector('.alternative:last-child [data-field="name"]').focus();
  });
  const api = { capture, validate, restore, loadRecorded, recordFromEditor, afterCommit: loadRecorded };
  editors.set(form, api);
  loadRecorded();
  return api;
}
