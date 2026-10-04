import { buildDependencyGraph, normalizeGraphNode, normalizeGraphEdge, GRAPH_EDGE_TYPES, DEPENDENCY_DIMENSIONS } from './dependency-graph-model.mjs';
import { assertSafeJSON, isRecord, createGuardedStore } from './ux-safety-model.mjs';
import { isVerified } from './forms-analysis-model.mjs';

export const ARCHITECTURE_KEY = 'roi-ea-application-modernization-m1-v0.1';
export function architectureStore(storage) {
  const store = createGuardedStore({key:ARCHITECTURE_KEY,storage,empty:()=>({}),normalize:validateArchitecture});
  const data = store.read();
  if (store.getState().blocked) throw new Error('Architecture data could not be read. Repair it in the modernization workspace before linking Forms.');
  return {data,save:next=>store.save(validateArchitecture(next))};
}
function validateArchitecture(raw) {
  if (!isRecord(raw)) throw new Error('Invalid architecture workspace.'); assertSafeJSON(raw);
  for (const k of ['applications','dependencies','graphNodes','graphEdges','continuityAnchors','essentialActions']) if (raw[k] !== undefined && (!Array.isArray(raw[k]) || raw[k].some(x=>!isRecord(x)))) throw new Error(`Invalid architecture collection: ${k}`);
  return raw;
}
export function architectureTargets(raw) { return buildDependencyGraph(validateArchitecture(raw)).nodes.filter(x=>x.sourceSystem!=='Forms Analysis'); }
export function addRelationship(form,input,workspace) {
  if (!isVerified(form)) throw new Error('Confirm the current structure before recording a relationship.');
  if (!architectureTargets(workspace).some(x=>x.id===input.targetId)) throw new Error('Select an existing architecture object.');
  if (!GRAPH_EDGE_TYPES.includes(input.edgeType) || input.edgeType==='unknown' || input.edgeType==='authorizes') throw new Error('Select a supported non-authorizing relationship.');
  if (!DEPENDENCY_DIMENSIONS.includes(input.dimension)) throw new Error('Select a dependency dimension.');
  if (input.fieldId && !form.fields.some(x=>x.id===input.fieldId)) throw new Error('Unknown field.');
  if (!String(input.evidence||'').trim()) throw new Error('Record the evidence or source for this relationship.');
  const f=structuredClone(form); f.relationships.push({...input,id:globalThis.crypto.randomUUID(),revision:f.revision,at:new Date().toISOString()});f.updatedAt=new Date().toISOString();return f;
}
/** Explicit, noncanonical projection into existing graph types. Existing objects are preserved. */
export function projectRelationships(workspace,form) {
  validateArchitecture(workspace);
  if (!isVerified(form)) throw new Error('Confirm the current form revision first.');
  const next=structuredClone(workspace), targets=architectureTargets(workspace);
  const relationships=form.relationships.filter(x=>x.revision===form.revision);
  if (!relationships.length) throw new Error('Record a relationship for this revision first.');
  for (const r of relationships) if (!targets.some(x=>x.id===r.targetId)) throw new Error('A linked architecture object is missing. Reconcile the link before projecting.');
  const nodes=new Map((next.graphNodes||[]).map(x=>[x.id,x])),edges=new Map((next.graphEdges||[]).map(x=>[x.id,x]));
  // Revision-qualified projection retains the provenance of earlier snapshots.
  for (const r of relationships) {
    const field=form.fields.find(x=>x.id===r.fieldId), sourceId=`FAC:${form.id}:r${form.revision}:${field?.id||'form'}`;
    nodes.set(sourceId,normalizeGraphNode({id:sourceId,label:field?`${form.name}: ${field.label}`:form.name,nodeType:field?'data':'resource',owner:form.owner,sourceSystem:'Forms Analysis',sourceReference:`${form.id} revision ${form.revision}`,description:'Forms Analysis projection, not a canonical CIF classification or authorization.'}));
    const id=`FAC-LINK:${r.id}`;
    if (!edges.has(id)) edges.set(id,normalizeGraphEdge({id,sourceId,targetId:r.targetId,edgeType:r.edgeType,dimension:r.dimension,sourceSystem:'Forms Analysis',sourceReference:r.evidence,evidenceRefs:[r.evidence],reviewState:'Unreviewed',notes:`Form revision ${form.revision}. Human-recorded relationship; assurance and authority remain separate.`}));
  }
  next.graphNodes=[...nodes.values()];next.graphEdges=[...edges.values()];return next;
}
