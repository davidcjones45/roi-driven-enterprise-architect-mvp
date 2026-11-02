import { createGuardedStore } from './ux-safety-model.mjs';
import { normalizeFormsWorkspace, normalizeForm } from './forms-analysis-model.mjs';
export const FORMS_KEY = 'roi-ea-forms-analysis-v1';
export function parseFormsRecovery(text) {
  if (typeof text !== 'string' || text.length > 10000000) throw new Error('Forms recovery JSON exceeds the supported size.');
  const raw = JSON.parse(text);
  if (!raw || Array.isArray(raw) || raw.schemaVersion !== 1 || !Array.isArray(raw.forms) || Object.keys(raw).some(k=>!['schemaVersion','forms'].includes(k))) throw new Error('Select a supported Forms recovery workspace (schema version 1).');
  // Recovery must retain stable identities and revisions, never manufacture them.
  for (const f of raw.forms) {
    if (!f || typeof f.id !== 'string' || !f.id.trim() || !Number.isSafeInteger(f.revision) || f.revision < 1 || typeof f.name !== 'string' || !f.name.trim()) throw new Error('Invalid recovery form identity, name or revision.');
    for (const key of ['sections','fields','findings','recommendations','decisions','verifications','relationships']) {
      if (!Array.isArray(f[key]) || f[key].some(x=>!x || typeof x.id !== 'string' || !x.id.trim())) throw new Error(`Invalid recovery ${key} identities.`);
      if (new Set(f[key].map(x=>x.id.trim())).size !== f[key].length) throw new Error(`Duplicate recovery ${key} IDs.`);
    }
  }
  const normalized = normalizeFormsWorkspace(raw);
  function check(source, target) {
    for (const [key,value] of Object.entries(source)) {
      if (value && typeof value === 'object') check(value,target[key]);
      else if (value !== target[key] && !(typeof value === 'string' && value.trim() === target[key])) throw new Error(`Invalid recovery value: ${key}.`);
    }
  }
  check(raw,normalized);
  return normalized;
}
export function createFormsStore(storage) {
  const store = createGuardedStore({key:FORMS_KEY,storage,empty:()=>({schemaVersion:1,forms:[]}),normalize:normalizeFormsWorkspace});
  let data = store.read();
  const reviews = new WeakMap();
  const checkRestore = candidate => {
    if (store.getState().blocked) throw new Error('Stored Forms data is protected from overwrite. Reconcile it before restoring.');
    if (candidate.forms.some(f=>data.forms.some(x=>x.id===f.id))) throw new Error('Restore conflict: a form ID already exists. No forms were restored.');
  };
  return {
    list: () => structuredClone(data.forms),
    state: () => store.getState(),
    recovery: () => store.getState().raw || JSON.stringify(data),
    reviewRecovery(text) {
      const candidate = parseFormsRecovery(text); checkRestore(candidate);
      if (!candidate.forms.length) throw new Error('Recovery contains no forms to restore.');
      const review = {forms:candidate.forms.map(f=>({id:f.id,name:f.name,revision:f.revision,sections:f.sections.length,fields:f.fields.length,findings:f.findings.length,recommendations:f.recommendations.length,verifications:f.verifications.length,relationships:f.relationships.length,decisions:f.decisions.length}))};
      reviews.set(review,{candidate,raw:store.getState().raw}); return review;
    },
    restoreRecovery(review, confirmed=false) {
      const pending = reviews.get(review);
      if (!pending || confirmed !== true) throw new Error('Review the recovery and explicitly confirm restore.');
      reviews.delete(review);
      if (store.getState().raw !== pending.raw) throw new Error('Forms changed since review. Review the recovery again.');
      checkRestore(pending.candidate);
      const next = {...data,forms:[...data.forms,...pending.candidate.forms]};
      store.save(next); data = next;
      return pending.candidate.forms.length;
    },
    save(form) {
      const next = structuredClone(data), normalized = normalizeForm(form);
      const index = next.forms.findIndex(x=>x.id===normalized.id);
      if (index < 0) next.forms.push(normalized); else next.forms[index] = normalized;
      store.save(next); data = next; return normalized;
    }
  };
}
