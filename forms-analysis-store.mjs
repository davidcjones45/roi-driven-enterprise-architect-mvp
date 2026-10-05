import { createGuardedStore } from './ux-safety-model.mjs';
import { normalizeFormsWorkspace, normalizeForm } from './forms-analysis-model.mjs';
export const FORMS_KEY = 'roi-ea-forms-analysis-v1';
export function createFormsStore(storage) {
  const store = createGuardedStore({key:FORMS_KEY,storage,empty:()=>({schemaVersion:1,forms:[]}),normalize:normalizeFormsWorkspace});
  let data = store.read();
  return {
    list: () => structuredClone(data.forms),
    state: () => store.getState(),
    recovery: () => store.getState().raw || JSON.stringify(data),
    save(form) {
      const next = structuredClone(data), normalized = normalizeForm(form);
      const index = next.forms.findIndex(x=>x.id===normalized.id);
      if (index < 0) next.forms.push(normalized); else next.forms[index] = normalized;
      store.save(next); data = next; return normalized;
    }
  };
}
