import { assertSafeJSON, isRecord } from './ux-safety-model.mjs';

export const FORM_TYPES = ['Unknown', 'Text', 'Long text', 'Number', 'Date', 'Email', 'Phone', 'Choice', 'Boolean', 'Signature'];
export const JUSTIFICATIONS = ['Historical / unknown', 'Business process', 'Identity verification', 'Regulatory requirement', 'Policy / control', 'Reporting', 'Analytics', 'Downstream system', 'Workflow', 'Other'];
export const LENSES = ['User burden', 'Data quality', 'Process burden', 'System coupling', 'Control / compliance', 'Modernization opportunity', 'Constraint / dependency'];
export const TREATMENTS = ['Retain', 'Remove', 'Merge', 'Rename', 'Clarify', 'Prefill', 'Derive', 'Lookup', 'Automate', 'Conditionally display', 'Validate', 'Structure free text', 'Retrieve authoritative data', 'Route differently', 'Require human review'];
export const CONSTRAINTS = ['Insufficient evidence', 'Form', 'Field', 'Approval', 'Actor', 'Workflow step', 'System', 'Integration', 'External dependency', 'Policy / control'];
export const DECISIONS = ['Accepted', 'Rejected', 'Modified', 'Deferred'];
export const CAPABILITIES = ['canDerive', 'canPrefill', 'directInput', 'canEliminate', 'canCondition', 'humanVerification'];
export const uid = () => globalThis.crypto.randomUUID();
const stamp = () => new Date().toISOString();
const str = (v, fallback = '') => typeof v === 'string' ? v.trim() : fallback;
const required = (v, label) => { const s = str(v); if (!s) throw new Error(`${label} is required.`); return s; };
const list = (v, label) => { if (v === undefined) return []; if (!Array.isArray(v) || v.some(x => !isRecord(x))) throw new Error(`Invalid ${label} collection.`); return v; };
const member = (v, options, fallback) => options.includes(v) ? v : fallback;
const unique = (items, label) => { if (new Set(items.map(x => x.id)).size !== items.length) throw new Error(`Duplicate ${label} IDs.`); };
const FIELD_TEXT = ['label','instructions','validation','conditionalLogic','approval','sourceSystem','businessRule','notes','purpose','downstreamUse','evidence','controlJustification','dependencies'];
const META_TEXT = ['name','purpose','organization','owner','process','system','sourceVersion','notes'];

export function normalizeField(raw = {}) {
  if (!isRecord(raw)) throw new Error('Invalid field.');
  const f = { ...raw, id: str(raw.id) || uid(), sectionId: str(raw.sectionId), type: member(raw.type, FORM_TYPES, 'Unknown'), required: member(raw.required, ['Unknown','Yes','No'], 'Unknown'), justification: member(raw.justification, JUSTIFICATIONS, 'Historical / unknown'), provenance: member(raw.provenance, ['User entered','Parsed text, unverified'], 'User entered') };
  for (const k of FIELD_TEXT) f[k] = str(raw[k]);
  for (const k of CAPABILITIES) f[k] = member(raw[k], ['Unknown','Yes','No'], 'Unknown');
  return f;
}

export function normalizeForm(raw) {
  if (!isRecord(raw)) throw new Error('Invalid form record.');
  assertSafeJSON(raw);
  const f = { ...raw, id: str(raw.id) || uid(), revision: Number.isSafeInteger(raw.revision) && raw.revision > 0 ? raw.revision : 1,
    createdAt: str(raw.createdAt), updatedAt: str(raw.updatedAt), sample: raw.sample === true };
  for (const k of META_TEXT) f[k] = str(raw[k]);
  f.sections = list(raw.sections, 'sections').map(s => ({...s, id: str(s.id) || uid(), name: str(s.name, 'Untitled section')}));
  unique(f.sections, 'section');
  f.fields = list(raw.fields, 'fields').map(normalizeField); unique(f.fields, 'field');
  for (const field of f.fields) if (field.sectionId && !f.sections.some(s => s.id === field.sectionId)) throw new Error('Field references a missing section.');
  for (const k of ['findings','recommendations','decisions','verifications','relationships']) f[k] = list(raw[k], k);
  for (const k of ['findings','recommendations','decisions','relationships']) { if (f[k].some(x => !str(x.id))) throw new Error(`Missing ${k} ID.`); unique(f[k], k); }
  for (const k of ['findings','recommendations','decisions','verifications','relationships']) {
    if (f[k].some(x => !Number.isSafeInteger(x.revision) || x.revision < 1 || x.revision > f.revision)) throw new Error(`Invalid ${k} revision.`);
  }
  for (const v of f.verifications) if (!str(v.reviewer)) throw new Error('Verification requires a reviewer.');
  for (const finding of f.findings) {
    if (!LENSES.includes(finding.lens) || !str(finding.statement) || (finding.fieldId && !f.fields.some(x => x.id === finding.fieldId))) throw new Error('Invalid finding or field reference.');
  }
  for (const r of f.recommendations) {
    if (!TREATMENTS.includes(r.treatment) || !f.findings.some(x => x.id === r.findingId && x.revision === r.revision && (x.fieldId || '') === (r.fieldId || '')) || !isRecord(r.currentState) || (r.fieldId && !f.fields.some(x => x.id === r.fieldId))) throw new Error('Invalid recommendation references or treatment.');
  }
  for (const d of f.decisions) {
    if (!DECISIONS.includes(d.status) || !f.recommendations.some(r => r.id === d.recommendationId && r.revision === d.revision) || !f.verifications.some(v=>v.revision===d.revision) || !str(d.reviewer) || !str(d.rationale) || !TREATMENTS.includes(d.treatment)) throw new Error('Invalid human decision.');
    const recommendation=f.recommendations.find(r=>r.id===d.recommendationId);
    if (d.status!=='Modified' && d.treatment!==recommendation.treatment) throw new Error('Decision treatment does not match its recommendation.');
    if (['Accepted','Modified'].includes(d.status)) {
      if (!['Retain','Remove','Require human review'].includes(d.treatment) && !str(d.specification)) throw new Error('Approved decision is missing its specification.');
      if (d.treatment==='Merge' && (!f.fields.some(x=>x.id===d.targetFieldId) || d.targetFieldId===recommendation.fieldId)) throw new Error('Invalid approved merge target.');
    }
  }
  return f;
}
export function normalizeFormsWorkspace(raw = {}) {
  if (!isRecord(raw) || (raw.schemaVersion !== undefined && raw.schemaVersion !== 1)) throw new Error('Unsupported Forms workspace version.');
  assertSafeJSON(raw);
  const forms = list(raw.forms, 'forms').map(normalizeForm); unique(forms, 'form');
  return {...raw, schemaVersion: 1, forms};
}
export function createForm(metadata = {}, pastedText = '') {
  required(metadata.name, 'Form name');
  if (pastedText.length > 100000) throw new Error('Pasted text exceeds 100,000 characters. Split the form into smaller imports.');
  const now = stamp();
  const f = normalizeForm({...metadata, id: uid(), createdAt: now, updatedAt: now, sections: [], fields: []});
  let section = {id: uid(), name: 'General'}; f.sections.push(section);
  for (const line of pastedText.split(/\r?\n/).map(x => x.trim()).filter(Boolean)) {
    if (line.startsWith('# ')) { section = {id: uid(), name: line.slice(2).trim() || 'Untitled section'}; f.sections.push(section); }
    else f.fields.push(normalizeField({label: line, sectionId: section.id, provenance: 'Parsed text, unverified'}));
  }
  if (f.fields.length > 500) throw new Error('A form supports up to 500 fields. Split this import.');
  return f;
}
function changed(f) { return {...f, revision: f.revision + 1, updatedAt: stamp()}; }
export function updateMetadata(form, values) {
  const f = structuredClone(form); required(values.name, 'Form name');
  for (const k of META_TEXT) if (k in values) f[k] = str(values[k]);
  return changed(f);
}
export function saveSection(form, name, id = '') {
  const f = structuredClone(form); name = required(name, 'Section name');
  if (id) { const s = f.sections.find(x => x.id === id); if (!s) throw new Error('Section no longer exists.'); s.name = name; }
  else f.sections.push({id: uid(), name});
  return changed(f);
}
export function saveField(form, values, id = '') {
  const f = structuredClone(form); required(values.label, 'Field label');
  const old = id ? f.fields.find(x => x.id === id) : null;
  if (id && !old) throw new Error('Field no longer exists.');
  const field = normalizeField({...old, ...values, provenance:'User entered', id: old?.id || uid()});
  if (!f.sections.some(s => s.id === field.sectionId)) throw new Error('Select a valid section.');
  if (old) f.fields[f.fields.indexOf(old)] = field; else { if (f.fields.length >= 500) throw new Error('Maximum 500 fields per form.'); f.fields.push(field); }
  return changed(f);
}
export function isVerified(f) { return f.verifications.some(v => v.revision === f.revision && str(v.reviewer)); }
export function verifyStructure(form, reviewer) {
  if (!form.fields.length || form.fields.some(f => !f.label)) throw new Error('Add labeled fields before confirming structure.');
  const f = structuredClone(form); f.verifications.push({id: uid(), revision: f.revision, reviewer: required(reviewer, 'Reviewer name'), at: stamp()}); f.updatedAt = stamp(); return f;
}
function needVerified(f) { if (!isVerified(f)) throw new Error('Confirm the current structure before analysis or decisions.'); }
export function statusOf(f) { if (!isVerified(f)) return 'Needs verification'; if (f.decisions.some(d => d.revision === f.revision)) return 'Decisions recorded'; if (f.findings.some(x => x.revision === f.revision)) return 'Analyzed'; return 'Verified'; }

export function addFinding(form, input) {
  needVerified(form);
  if (!LENSES.includes(input.lens)) throw new Error('Select an analysis lens.');
  if (input.fieldId && !form.fields.some(x => x.id === input.fieldId)) throw new Error('Unknown finding field.');
  const f = structuredClone(form);
  f.findings.push({...input, id: uid(), revision: f.revision, statement: required(input.statement, 'Finding'), evidence: str(input.evidence), constraint: member(input.constraint, CONSTRAINTS, 'Insufficient evidence'), confidence: member(input.confidence, ['Low','Medium','High'], 'Low'), origin: input.origin === 'Deterministic heuristic' ? input.origin : 'User observation', at: stamp()});
  f.updatedAt = stamp(); return f;
}
export function addRecommendation(form, input) {
  needVerified(form);
  const finding = form.findings.find(x => x.id === input.findingId && x.revision === form.revision);
  if (!finding) throw new Error('Choose a finding from the current revision.');
  if (!TREATMENTS.includes(input.treatment)) throw new Error('Select a valid treatment.');
  if (!finding.fieldId && !['Retain','Automate','Route differently','Require human review'].includes(input.treatment)) throw new Error('This treatment requires a selected field.');
  const f = structuredClone(form), field = f.fields.find(x => x.id === finding.fieldId);
  f.recommendations.push({id: uid(), revision: f.revision, findingId: finding.id, fieldId: finding.fieldId || '', currentState: field ? structuredClone(field) : {name:f.name}, treatment: input.treatment, rationale: required(input.rationale,'Rationale'), evidence: str(input.evidence || finding.evidence), benefit: required(input.benefit,'Expected benefit'), dependencies: str(input.dependencies), confidence: member(input.confidence, ['Low','Medium','High'], 'Low'), specification: str(input.specification), targetFieldId: str(input.targetFieldId), origin: finding.origin, at: stamp()});
  f.updatedAt = stamp(); return f;
}
export function runQuickScan(form) {
  needVerified(form); const f = structuredClone(form);
  const scanKeys = new Set(f.findings.map(x=>x.scanKey));
  const labelKey = x=>x.label.toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
  const counts = new Map();
  for (const field of f.fields) counts.set(labelKey(field),(counts.get(labelKey(field))||0)+1);
  function propose(field, code, lens, statement, treatment, rationale, benefit) {
    const key = `${f.revision}:${field?.id || 'form'}:${code}`;
    if (scanKeys.has(key)) return;
    scanKeys.add(key);
    const evidence=field ? `Recorded field: ${field.label}${field.evidence ? '; supplied source: '+field.evidence : ''}` : `Recorded field count: ${f.fields.length}`;
    const shared={revision:f.revision,fieldId:field?.id||'',evidence,confidence:'Low',origin:'Deterministic heuristic',at:stamp()};
    const finding={...shared,id:uid(),scanKey:key,lens,statement,constraint:'Insufficient evidence'};
    f.findings.push(finding);
    f.recommendations.push({...shared,id:uid(),findingId:finding.id,treatment,rationale,benefit,currentState:field?structuredClone(field):{name:f.name},dependencies:field?.dependencies||'',specification:'',targetFieldId:''});
  }
  if (f.fields.length > 30) propose(null,'count','User burden',`${f.fields.length} fields warrant a burden review. Count alone does not establish excess.`,'Require human review','Assess actual completion effort and necessity.','A measured basis for simplification.');
  for (const field of form.fields) {
    if (labelKey(field) && counts.get(labelKey(field)) > 1) propose(field,'duplicate','Data quality','Repeated label may indicate duplicate capture.','Require human review','Verify semantic equivalence and downstream use before merging.','Avoid redundant data capture where equivalence is confirmed.');
    if (field.label.length < 3 || !field.instructions) propose(field,'clarity','User burden','A short label or missing instructions may need clarification.','Clarify','Test whether users understand the expected value.','Reduce avoidable questions and correction.');
    if (['Email','Phone','Number','Date'].includes(field.type) && !field.validation) propose(field,'validation','Data quality','No validation rule is recorded for this typed field.','Validate','Confirm the accepted format and exceptions.','Improve consistency at entry.');
    if (field.type === 'Long text') propose(field,'structure','Data quality','Long text may contain information suitable for structured entry.','Structure free text','Check whether bounded choices preserve the needed meaning.','Support consistent reporting.');
    if (field.canPrefill === 'Yes' || field.canDerive === 'Yes') propose(field,'reuse','Modernization opportunity','The practitioner marked a data reuse opportunity. ',field.canPrefill === 'Yes' ? 'Prefill' : 'Derive','Validate the source, freshness and correction path.','Reduce manual entry.');
    if (field.businessRule && field.directInput === 'Yes') propose(field,'automation','Modernization opportunity','A recorded business rule and manual input warrant an automation review.','Automate','Check deterministic execution, exceptions and accountable oversight.','Reduce repeatable manual work where appropriate.');
    if (field.canCondition === 'Yes') propose(field,'conditional','Modernization opportunity','The practitioner marked a conditional display opportunity.','Conditionally display','Specify the condition and check every branch.','Reduce irrelevant input.');
    if (field.approval) propose(field,'approval','Process burden','An approval or signature is recorded. Its necessity and waiting time need review.','Require human review','An approval can be a valid control. Measure delays before changing it.','Separate control value from avoidable waiting.');
    if (field.sourceSystem || field.dependencies) propose(field,'coupling','System coupling','Recorded source or dependency needs an availability and integration review.','Require human review','Identify authoritative data and failure handling.','Expose integration constraints.');
    if (['Regulatory requirement','Policy / control','Identity verification'].includes(field.justification)) propose(field,'control','Control / compliance',field.evidence ? 'Supporting evidence is recorded but applicability needs qualified review.' : 'A control justification has no supporting evidence recorded.','Require human review','A category does not establish legal obligation or control effectiveness.','Maintain traceable control justification.');
    if (field.justification === 'Historical / unknown') propose(field,'unknown','Constraint / dependency','No current justification has been identified.','Require human review','Unknown justification is not evidence that a field is unnecessary.','Resolve uncertainty with the owner.');
  }
  f.updatedAt=stamp(); return f;
}
export function effectiveDecision(f, recommendationId) { return f.decisions.filter(d => d.recommendationId === recommendationId && d.revision === f.revision).at(-1) || null; }
export function recordDecision(form, recommendationId, input) {
  needVerified(form);
  const r = form.recommendations.find(r => r.id === recommendationId && r.revision === form.revision);
  if (!r) throw new Error('Recommendation is missing or belongs to an earlier revision.');
  if (!DECISIONS.includes(input.status)) throw new Error('Choose a human decision.');
  const treatment = input.status === 'Modified' ? input.treatment : r.treatment;
  if (!TREATMENTS.includes(treatment)) throw new Error('Choose the modified treatment.');
  if (!r.fieldId && !['Retain','Automate','Route differently','Require human review'].includes(treatment)) throw new Error('This treatment requires a selected field.');
  const approved = ['Accepted','Modified'].includes(input.status);
  const specification = str(input.specification || r.specification), targetFieldId = str(input.targetFieldId || r.targetFieldId);
  if (approved && !['Retain','Remove','Require human review'].includes(treatment) && !specification) throw new Error('An approved change needs a concrete future-state specification.');
  if (approved && treatment === 'Merge' && (!form.fields.some(x => x.id === targetFieldId) || targetFieldId === r.fieldId)) throw new Error('Select a different existing field as the merge target.');
  if (approved && r.fieldId && form.recommendations.some(x => x.id !== r.id && x.fieldId === r.fieldId && ['Accepted','Modified'].includes(effectiveDecision(form,x.id)?.status))) throw new Error('This field already has an approved treatment. Defer it before approving a replacement.');
  if (approved && ['Remove','Merge'].includes(treatment) && form.decisions.some(d => d.targetFieldId === r.fieldId && effectiveDecision(form,d.recommendationId)?.id === d.id && ['Accepted','Modified'].includes(d.status))) throw new Error('This field is the target of an approved merge. Revise that decision first.');
  if (approved && treatment === 'Merge' && form.recommendations.some(x => x.fieldId === targetFieldId && ['Remove','Merge'].includes(effectiveDecision(form,x.id)?.treatment) && ['Accepted','Modified'].includes(effectiveDecision(form,x.id)?.status))) throw new Error('The merge target must remain in the future state.');
  const f = structuredClone(form);
  f.decisions.push({id:uid(),recommendationId,revision:f.revision,status:input.status,treatment,specification,targetFieldId,reviewer:required(input.reviewer,'Reviewer name'),rationale:required(input.rationale,'Decision rationale'),at:stamp()}); f.updatedAt = stamp(); return f;
}
export function futureState(f) {
  const applied = f.recommendations.filter(r => r.revision === f.revision).map(r => ({r,d:effectiveDecision(f,r.id)})).filter(x => ['Accepted','Modified'].includes(x.d?.status));
  const fields = f.fields.map(field => {
    const item = applied.find(x => x.r.fieldId === field.id), out = {...field,disposition:'Unchanged',approvedSpecification:'',decisionId:''};
    if (!item) return out;
    const {d} = item; Object.assign(out,{disposition:d.treatment,approvedSpecification:d.specification,decisionId:d.id});
    if (d.treatment === 'Rename') out.label = d.specification;
    if (d.treatment === 'Clarify') out.instructions = d.specification;
    if (d.treatment === 'Validate') out.validation = d.specification;
    if (d.treatment === 'Conditionally display') out.conditionalLogic = d.specification;
    if (d.treatment === 'Structure free text') {out.type='Choice';out.instructions=d.specification;}
    if (d.treatment === 'Merge') out.mergedInto = d.targetFieldId;
    return out;
  });
  return {fields:fields.filter(x => !['Remove','Merge'].includes(x.disposition)),removedFields:fields.filter(x => ['Remove','Merge'].includes(x.disposition)),actions:applied.map(({r,d})=>({...d,fieldId:r.fieldId,benefit:r.benefit,dependencies:r.dependencies})),boundary:'Approved design specification only. No implementation or operational authority is conferred.'};
}
export function exportForm(f) {
  return {schemaVersion:1,exportedAt:stamp(),form:structuredClone(f),inventory:{id:f.id,name:f.name,owner:f.owner,process:f.process,system:f.system,status:statusOf(f),revision:f.revision},fieldDictionary:f.fields,findingsRegister:f.findings,recommendationsRegister:f.recommendations.map(r=>({...r,status:r.revision!==f.revision?'Stale':effectiveDecision(f,r.id)?.status || 'Proposed'})),decisionHistory:f.decisions,acceptedDecisionRegister:f.recommendations.map(r=>effectiveDecision(f,r.id)).filter(d=>['Accepted','Modified'].includes(d?.status)),futureState:futureState(f),businessRules:f.fields.filter(x=>x.businessRule).map(x=>({fieldId:x.id,rule:x.businessRule})),integrationRequirements:f.fields.filter(x=>x.sourceSystem || x.dependencies).map(x=>({fieldId:x.id,source:x.sourceSystem,dependencies:x.dependencies})),modernizationBacklog:futureState(f).actions,dependencyRelationships:f.relationships};
}
