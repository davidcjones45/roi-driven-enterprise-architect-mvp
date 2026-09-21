import { createGuardedStore, isRecord, WorkspaceStorageError } from './ux-safety-model.mjs';

// Deliberately exclude authority/lifecycle forms and append-only engagement forms.
// Saving a presentation draft must never append a lifecycle decision.
export const DRAFT_FORMS = Object.freeze([
  'opportunity-form', 'baseline-form', 'risk-form', 'architecture-form',
  'pilot-form', 'results-form', 'regulatory-form'
]);

export function captureFields(form) {
  return [...form.elements]
    .filter(element => element.name && !['file', 'submit', 'button', 'reset'].includes(element.type))
    .map(element => ({ name: element.name, value: element.value, type: element.type,
      checked: ['checkbox', 'radio'].includes(element.type) ? element.checked : undefined }));
}

export function restoreFields(form, fields) {
  const elements = [...form.elements].filter(element => element.name && !['file', 'submit', 'button', 'reset'].includes(element.type));
  if (elements.length !== fields.length || elements.some((element, i) => element.name !== fields[i].name || element.type !== fields[i].type)) {
    throw new Error('The form structure changed. The saved draft is retained but was not applied. Export it for reconciliation.');
  }
  elements.forEach((element, i) => {
    element.value = fields[i].value;
    if (['checkbox', 'radio'].includes(element.type)) element.checked = fields[i].checked === true;
  });
}

function el(documentRef, tag, text, attributes = {}) {
  const node = documentRef.createElement(tag);
  if (text) node.textContent = text;
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
  return node;
}

/** Adapters are explicit. This component does not own the application's domain data. */
export function installSafetyUI({
  root = document, windowRef = window, key, store, getData, saveRecord,
  undoRemoval = () => {}, now = () => new Date().toISOString(),
  draftStorage = () => windowRef.localStorage, formAdapters = {}
}) {
  const states = new Map();
  let pendingSubmit = null;
  let failedSubmission = null;
  let submitEpoch = 0;
  let notification = '';
  let draftWarning = '';
  const draftStore = createGuardedStore({
    key: `${key}:ux-drafts-v1`, storage: draftStorage, empty: () => ({}),
    normalize(value) {
      if (!isRecord(value)) throw new Error('Invalid draft collection.');
      for (const [id, draft] of Object.entries(value)) {
        if (!DRAFT_FORMS.includes(id) || !isRecord(draft) || typeof draft.baseline !== 'string') {
          throw new Error('Unsupported draft shape.');
        }
        if (Object.hasOwn(draft, 'snapshot')) {
          if (!formAdapters[id]) throw new Error('A stored draft requires an unavailable editor adapter.');
          formAdapters[id].validate(draft.snapshot);
        } else if (!Array.isArray(draft.fields) || draft.fields.length > 300 || draft.fields.some(field => !isRecord(field) || typeof field.name !== 'string' || typeof field.value !== 'string' || typeof field.type !== 'string')) {
          throw new Error('Unsupported draft field.');
        }
        // Legacy architecture field arrays remain exportable; never pretend
        // that their omitted data-field alternatives can be reconstructed.
      }
      return value;
    }
  });
  let drafts = draftStore.read();
  const host = el(root, 'section', '', { class: 'ux-workspace-safety', 'aria-label': 'Local storage and recovery' });
  const notice = el(root, 'p', 'Stored in this browser only. No cloud backup or cross-device sync.', { class: 'ux-local-notice' });
  const status = el(root, 'p', '', { id: 'ux-save-status', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' });
  const storageError = el(root, 'p', '', { class: 'ux-storage-error', role: 'alert', 'aria-atomic': 'true' });
  storageError.hidden = true;
  const actions = el(root, 'div', '', { class: 'ux-safety-actions' });
  const backup = el(root, 'button', 'Export recovery backup', { type: 'button', class: 'secondary' });
  const retry = el(root, 'button', 'Retry saving record', { type: 'button', class: 'secondary' });
  const undo = el(root, 'button', 'Undo latest removal', { type: 'button', class: 'secondary' });
  retry.hidden = true;
  actions.append(backup, retry, undo);
  const feedback = el(root, 'div', '', { class: 'ux-feedback' });
  feedback.hidden = true;
  const message = el(root, 'p', '', { role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' });
  const dismiss = el(root, 'button', 'Dismiss message', { type: 'button', class: 'secondary' });
  feedback.append(message, dismiss);
  host.append(notice, status, storageError, actions, feedback);
  const topbar = root.querySelector('.topbar');
  if (topbar) topbar.after(host);
  else root.querySelector('main').prepend(host);

  function notify(text) {
    notification = String(text);
    message.textContent = notification;
    feedback.hidden = false;
  }
  dismiss.addEventListener('click', () => { feedback.hidden = true; notification = ''; });

  function refresh() {
    const mainState = store.getState(), draftState = draftStore.getState();
    const error = mainState.error || draftState.error;
    const dirty = [...states.values()].filter(state => state.dirty).length;
    status.textContent = error ? 'Attention required: your latest work may not be saved.'
      : dirty ? `${dirty} form${dirty === 1 ? ' has' : 's have'} unsaved edits. Save a draft or submit the section.`
      : mainState.savedAt ? `Assessment record saved locally at ${new Date(mainState.savedAt).toLocaleTimeString()}. Drafts remain separate.`
      : 'No unsaved edits detected in the draft-enabled forms. Submitting a section records its inputs; saving a draft does not.';
    storageError.textContent = error?.message || draftWarning;
    storageError.hidden = !storageError.textContent;
    retry.hidden = !mainState.error || mainState.blocked || mainState.error.code === 'CONFLICT';
    undo.disabled = !(getData().uxRemovalHistory || []).length;
  }

  function reportFailure(error) {
    if (pendingSubmit && states.has(pendingSubmit) && store.getState().error) {
      failedSubmission = { id: pendingSubmit, fields: JSON.stringify(states.get(pendingSubmit).capture()) };
    }
    draftWarning = error instanceof Error ? error.message : String(error);
    refresh();
  }

  function packDraft(id, state, savedAt) {
    const captured = state.capture();
    return { ...(formAdapters[id] ? { snapshot: captured } : { fields: captured }), baseline: state.baseline, savedAt };
  }
  const unpackDraft = draft => Object.hasOwn(draft, 'snapshot') ? draft.snapshot : draft.fields;

  function exportBackup() {
    const memoryDrafts = Object.fromEntries([...states.entries()].filter(([, state]) => state.dirty)
      .map(([id, state]) => [id, { ...packDraft(id, state, null), state: 'unsaved-in-memory' }]));
    const payload = {
      format: 'roi-ea-recovery-backup', version: 1, exportedAt: now(),
      qualification: 'Recovery data only. It does not validate evidence, authorize actions or approve a decision.',
      record: getData(), drafts: { ...drafts, ...memoryDrafts },
      protectedStoredRecord: store.getState().blocked ? store.getState().raw : null,
      protectedStoredDrafts: draftStore.getState().blocked ? draftStore.getState().raw : null
    };
    const url = windowRef.URL.createObjectURL(new windowRef.Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    const link = el(root, 'a', '', { href: url, download: `roi-ea-recovery-${now().replace(/[:.]/g, '-')}.json` });
    root.body.append(link);
    link.click(); link.remove();
    windowRef.setTimeout(() => windowRef.URL.revokeObjectURL(url), 1000);
    notify('Recovery backup download requested. Verify that the file was saved before closing this tab. This is not cloud backup.');
  }
  backup.addEventListener('click', exportBackup);
  retry.addEventListener('click', () => { try { saveRecord(); } catch (error) { reportFailure(error); } });
  undo.addEventListener('click', () => { try { undoRemoval(); refresh(); } catch (error) { reportFailure(error); } });

  function persistDrafts(next) {
    draftStore.save(next);
    drafts = next;
  }
  function saveDraft(formId) {
    const state = states.get(formId);
    if (!state) return false;
    try {
      persistDrafts({ ...drafts, [formId]: packDraft(formId, state, now()) });
      state.dirty = false;
      state.note.textContent = 'Draft saved locally. These edits are not included in assessment inputs, readiness, evidence or authority until you submit this section.';
      draftWarning = '';
      refresh();
      return true;
    } catch (error) { reportFailure(error); return false; }
  }

  function hydrateDrafts() {
    for (const [id, state] of states) {
      state.baseline = JSON.stringify(state.capture());
      state.dirty = false;
      state.note.textContent = 'Incomplete work can be saved as a separate draft. Submitting the section records its inputs.';
      const draft = drafts[id];
      if (!draft) continue;
      if (draft.baseline !== state.baseline) {
        state.note.textContent = 'A saved draft belongs to an earlier record state. It was not restored. Export the backup for reconciliation or discard that draft.';
        continue;
      }
      try {
        state.restore(unpackDraft(draft));
        state.note.textContent = 'Saved draft restored to this form only. It has not updated the assessment record or any review/authority state.';
      } catch (error) { state.note.textContent = error.message; }
    }
    refresh();
  }

  function afterPersist() {
    const retryMatches = failedSubmission && states.has(failedSubmission.id) && failedSubmission.fields === JSON.stringify(states.get(failedSubmission.id).capture());
    const completedId = pendingSubmit || (retryMatches ? failedSubmission.id : null);
    if (completedId && states.has(completedId)) {
      const state = states.get(completedId);
      // Rebase presentation row identities to the newly recorded structure,
      // so a later draft matches that record after a browser restart.
      formAdapters[completedId]?.afterCommit?.();
      state.baseline = JSON.stringify(state.capture());
      state.dirty = false;
      state.note.textContent = 'Section inputs saved locally. Evidence validation and human authority remain separate.';
      if (drafts[completedId]) {
        const next = { ...drafts }; delete next[completedId];
        try { persistDrafts(next); } catch (error) { reportFailure(error); }
      }
    }
    if (!store.getState().error) { failedSubmission = null; draftWarning = ''; }
    refresh();
  }

  for (const id of DRAFT_FORMS) {
    const form = root.getElementById(id);
    if (!form) continue;
    const box = el(root, 'div', '', { class: 'ux-draft-actions full' });
    const note = el(root, 'p', '', { id: `${id}-draft-status`, class: 'ux-draft-status', role: 'status', 'aria-live': 'polite' });
    const save = el(root, 'button', 'Save incomplete draft', { type: 'button', class: 'secondary', 'aria-describedby': note.id });
    const discard = el(root, 'button', 'Discard draft edits', { type: 'button', class: 'secondary' });
    box.append(note, save, discard);
    const formActions = form.querySelector('.form-actions');
    if (formActions) formActions.before(box); else form.append(box);
    const adapter = formAdapters[id];
    const capture = adapter ? () => adapter.capture() : () => captureFields(form);
    const restore = adapter ? value => adapter.restore(value) : value => restoreFields(form, value);
    const validate = adapter ? value => adapter.validate(value) : value => {
      const current = captureFields(form);
      if (!Array.isArray(value) || value.length !== current.length || current.some((field, i) => field.name !== value[i].name || field.type !== value[i].type)) {
        throw new Error('This form has structural edits. Export the recovery backup before reloading.');
      }
    };
    states.set(id, { form, note, capture, restore, validate, baseline: '', dirty: false });
    const dirty = () => {
      const state = states.get(id);
      state.dirty = true;
      note.textContent = 'Unsaved edits. Save an incomplete draft or submit the section.';
      refresh();
    };
    form.addEventListener('input', dirty);
    form.addEventListener('change', dirty);
    form.addEventListener('ux-form-structure-change', dirty);
    save.addEventListener('click', () => saveDraft(id));
    discard.addEventListener('click', () => {
      if (!windowRef.confirm('Discard draft edits for this form and return to the last recorded inputs?')) return;
      const state = states.get(id);
      try {
        const next = { ...drafts }; delete next[id];
        // Check compatibility before changing persistent state.
        const baseline = JSON.parse(state.baseline);
        state.validate(baseline);
        // The supported adapter validates the whole snapshot before restoring.
        // Retain the persistent draft until restoration actually succeeds.
        const current = state.capture();
        state.restore(baseline);
        try { persistDrafts(next); }
        catch (error) { state.restore(current); throw error; }
        state.dirty = false;
        note.textContent = 'Draft discarded. The last recorded inputs are displayed.';
        refresh();
      } catch (error) { reportFailure(error); }
    });
    form.addEventListener('submit', () => {
      pendingSubmit = id;
      // Native events may run microtasks between capture and bubble listeners.
      // Clear at the next task, after the application's synchronous save handler.
      const epoch = ++submitEpoch;
      windowRef.setTimeout(() => { if (submitEpoch === epoch) pendingSubmit = null; }, 0);
    }, true);
  }

  windowRef.addEventListener('beforeunload', event => {
    if ([...states.values()].some(state => state.dirty) || store.getState().error || draftStore.getState().error) {
      event.preventDefault(); event.returnValue = '';
    }
  });
  // Storage exceptions intentionally stop the original save handler before its success toast.
  windowRef.addEventListener('error', event => {
    if (event.error instanceof WorkspaceStorageError) { reportFailure(event.error); event.preventDefault(); }
  });

  function beforeNavigate(view) {
    const active = root.querySelector('.view.active');
    if (!active || active.id === view) return true;
    const pending = [...states.entries()].filter(([, state]) => state.dirty && active.contains(state.form));
    if (!pending.length) return true;
    if (!windowRef.confirm('Save the incomplete draft before leaving this screen? OK saves only a draft; Cancel stays here. Use Discard draft edits to revert.')) return false;
    return pending.every(([id]) => saveDraft(id));
  }
  function beforeReplace() {
    const pending = [...states.entries()].filter(([, state]) => state.dirty);
    if (!pending.length) return true;
    if (!windowRef.confirm('Save incomplete drafts before replacing the assessment? OK retains drafts separately; Cancel leaves your work unchanged.')) return false;
    return pending.every(([id]) => saveDraft(id));
  }
  refresh();
  return { notify, reportFailure, afterPersist, hydrateDrafts, beforeNavigate, beforeReplace, saveDraft, refresh, exportBackup };
}
