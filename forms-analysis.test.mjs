import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as m from './forms-analysis-model.mjs';
import {createFormsStore,FORMS_KEY} from './forms-analysis-store.mjs';
import {architectureTargets,addRelationship,projectRelationships} from './forms-analysis-bridge.mjs';
import {formsExample} from './forms-analysis-fixture.mjs';
import {reportHtml} from './forms-analysis-ui.mjs';
const memory=()=>{const rows=new Map();return {getItem:k=>rows.get(k)??null,setItem:(k,v)=>rows.set(k,v)};};
const ready=()=>{let f=m.createForm({name:'Test form'},'# Customer\nAccount\nNotes');f=m.verifyStructure(f,'Reviewer');return f;};
function proposed(treatment='Rename') {let f=ready();f=m.addFinding(f,{fieldId:f.fields[0].id,lens:'User burden',statement:'Ambiguous label'});return m.addRecommendation(f,{findingId:f.findings[0].id,treatment,rationale:'Clarify intent',benefit:'Fewer questions'});}
test('manual and text import preserve unknown facts and provenance',()=>{
  const f=m.createForm({name:'Intake'},'# Contact\nEmail address\nSignature');assert.equal(f.fields.length,2);assert.equal(f.fields[0].type,'Unknown');assert.equal(f.fields[0].required,'Unknown');assert.equal(f.fields[0].provenance,'Parsed text, unverified');assert.equal(m.statusOf(f),'Needs verification');assert.throws(()=>m.runQuickScan(f),/Confirm/);assert.throws(()=>m.createForm({name:'x'},'a'.repeat(100001)),/exceeds/);
});
test('field/metadata/section edits invalidate verification and retain prior evidence',()=>{
  let f=proposed();const id=f.fields[0].id;f=m.recordDecision(f,f.recommendations[0].id,{status:'Accepted',reviewer:'Owner',rationale:'Confirmed',specification:'Account ID'});const before=f.decisions[0];f=m.saveField(f,{...f.fields[0],label:'Changed'},id);assert.equal(m.isVerified(f),false);assert.deepEqual(f.decisions[0],before);assert.equal(m.futureState(f).fields[0].label,'Changed');assert.equal(m.futureState(f).actions.length,0);assert.throws(()=>m.recordDecision(f,f.recommendations[0].id,{}),/Confirm/);f=m.verifyStructure(f,'Owner');assert.throws(()=>m.recordDecision(f,f.recommendations[0].id,{}),/earlier revision/);assert.equal(m.exportForm(f).recommendationsRegister[0].status,'Stale');assert.equal(m.isVerified(m.updateMetadata(f,{name:'New'})),false);assert.equal(m.isVerified(m.saveSection(f,'New section')),false);
});
test('guarded store reload preserves whole workflow and unrelated storage',()=>{
  const storage=memory();storage.setItem('other','untouched');const store=createFormsStore(()=>storage);const f=formsExample();store.save(f);assert.deepEqual(createFormsStore(()=>storage).list()[0],f);assert.equal(storage.getItem('other'),'untouched');assert.equal(store.list()[0].decisions.length,2);
});
test('malformed and unsupported stored work is protected from overwrite',()=>{
  for(const raw of ['broken','null','[]','{"schemaVersion":2,"forms":[]}','{"forms":"bad"}','{"forms":[{"fields":null}]}']){const storage=memory();storage.setItem(FORMS_KEY,raw);const store=createFormsStore(()=>storage);assert.equal(store.state().blocked,true);assert.throws(()=>store.save(ready()));assert.equal(storage.getItem(FORMS_KEY),raw);assert.equal(store.recovery(),raw);}
});
test('partial data stays unknown and dangerous properties / duplicate IDs fail closed',()=>{
  const f=m.normalizeFormsWorkspace({forms:[{name:'Partial'}]}).forms[0];assert.equal(f.fields.length,0);assert.equal(m.statusOf(f),'Needs verification');assert.throws(()=>m.normalizeFormsWorkspace(JSON.parse('{"__proto__":{}}')),/Unsupported/);assert.throws(()=>m.normalizeFormsWorkspace({forms:[{id:'a'},{id:'a'}]}),/Duplicate/);assert.throws(()=>m.normalizeForm({fields:[{sectionId:'missing'}]}),/missing section/);
});
test('quota failure and another-tab conflict do not publish an unsaved record',()=>{
  const storage=memory(),a=createFormsStore(()=>storage),b=createFormsStore(()=>storage);a.save(ready());assert.throws(()=>b.save(ready()),/Another tab/);assert.equal(b.list().length,0);const failing=createFormsStore(()=>({getItem:()=>null,setItem:()=>{throw new Error('Quota');}}));assert.throws(()=>failing.save(ready()),/not saved/);assert.equal(failing.list().length,0);
});
test('scan is idempotent, covers all lenses with recorded signals, never auto-approves',()=>{
  let f=formsExample();f.decisions=[];f=m.runQuickScan(f);assert.deepEqual(new Set(f.findings.map(x=>x.lens)),new Set(m.LENSES));const next=m.runQuickScan(f);assert.equal(next.findings.length,f.findings.length);assert.equal(next.recommendations.length,f.recommendations.length);assert.equal(m.futureState(next).actions.length,0);assert.ok(next.findings.every(x=>x.origin==='Deterministic heuristic'));assert.ok(next.recommendations.filter(r=>f.fields.find(x=>x.id===r.fieldId)?.justification==='Historical / unknown').every(r=>r.treatment!=='Remove'));
});
test('human statuses are append-only and modifications retain original proposals',()=>{
  let f=proposed();const r=structuredClone(f.recommendations[0]);assert.throws(()=>m.recordDecision(f,r.id,{status:'Accepted',reviewer:'',rationale:'x',specification:'y'}),/Reviewer/);assert.throws(()=>m.recordDecision(f,r.id,{status:'Accepted',reviewer:'Owner',rationale:'x'}),/specification/);
  for(const status of ['Rejected','Deferred','Modified'])f=m.recordDecision(f,r.id,{status,reviewer:'Owner',rationale:'Reviewed',treatment:'Clarify',specification:'Enter the customer account ID.'});assert.equal(f.decisions.length,3);assert.deepEqual(f.recommendations[0],r);assert.equal(m.futureState(f).fields[0].instructions,'Enter the customer account ID.');assert.equal(m.futureState(f).fields[0].label,'Account');assert.equal(m.effectiveDecision(f,r.id).status,'Modified');
});
test('future state applies only accepted current decisions and supports remove and merge',()=>{
  let f=proposed('Merge');f=m.recordDecision(f,f.recommendations[0].id,{status:'Accepted',reviewer:'Owner',rationale:'Same meaning confirmed',specification:'Capture once in Notes',targetFieldId:f.fields[1].id});assert.equal(m.futureState(f).fields.length,1);assert.equal(m.futureState(f).removedFields[0].mergedInto,f.fields[1].id);f=m.recordDecision(f,f.recommendations[0].id,{status:'Deferred',reviewer:'Owner',rationale:'Need downstream review'});assert.equal(m.futureState(f).fields.length,2);
});
test('conflicting field decisions and unsafe merge targets are rejected',()=>{
  let f=proposed();const first=f.recommendations[0];f=m.recordDecision(f,first.id,{status:'Accepted',reviewer:'Owner',rationale:'Reviewed',specification:'Customer account ID'});f=m.addRecommendation(f,{findingId:f.findings[0].id,treatment:'Remove',rationale:'Hypothesis',benefit:'Less entry'});assert.throws(()=>m.recordDecision(f,f.recommendations.at(-1).id,{status:'Accepted',reviewer:'Owner',rationale:'x'}),/already has/);
  f=proposed('Merge');assert.throws(()=>m.recordDecision(f,f.recommendations[0].id,{status:'Accepted',reviewer:'Owner',rationale:'x',specification:'Merge',targetFieldId:f.fields[0].id}),/different existing/);
});
test('architecture bridge reuses existing nodes, retains graph, and grants no authority',()=>{
  const workspace={graphNodes:[{id:'crm',label:'CRM',nodeType:'application'}],graphEdges:[],custom:'keep'};let f=ready();f=addRelationship(f,{fieldId:f.fields[0].id,targetId:'crm',edgeType:'depends-on',dimension:'technical',evidence:'Owner interview'},workspace);assert.equal(architectureTargets(workspace).length,1);const next=projectRelationships(workspace,f);assert.equal(next.custom,'keep');assert.equal(next.graphNodes.length,2);assert.equal(next.graphEdges.length,1);assert.equal(next.graphEdges[0].reviewState,'Unreviewed');assert.equal(projectRelationships(next,f).graphEdges.length,1);assert.equal(workspace.graphEdges.length,0);assert.throws(()=>addRelationship(f,{targetId:'crm',edgeType:'authorizes'},workspace),/non-authorizing/);assert.throws(()=>projectRelationships({graphNodes:[]},f),/missing/);
});
test('exports contain complete history and escape untrusted markup in printable report',()=>{
  const f=formsExample();f.name='<img src=x onerror=alert(1)>';const pkg=m.exportForm(f);assert.equal(pkg.acceptedDecisionRegister.length,1);assert.equal(pkg.decisionHistory.length,2);assert.equal(pkg.futureState.actions.length,1);assert.equal(pkg.modernizationBacklog.length,1);assert.ok(pkg.fieldDictionary.length);const html=reportHtml(f);assert.ok(!html.includes('<img'));assert.match(html,/&lt;img/);assert.match(html,/Human decision history/);
});
test('Forms is wired into existing navigation and shell, not an independent application',async()=>{
  const html=await readFile(new URL('./index.html',import.meta.url),'utf8'),app=await readFile(new URL('./app.js',import.meta.url),'utf8');assert.match(html,/data-workspace-select="forms">Forms/);assert.match(html,/data-workspace="forms" data-view="forms"/);assert.match(html,/id="forms" class="view"/);assert.match(app,/mountFormsWorkspace\(\)/);assert.match(app,/if\(activeWorkspace==='forms'\)/);
});
test('accepted field treatments produce explicit future specifications without mutating current fields',()=>{
  for(const [treatment,property] of [['Rename','label'],['Clarify','instructions'],['Validate','validation'],['Conditionally display','conditionalLogic'],['Structure free text','instructions']]) {
    let f=proposed(treatment);const before=structuredClone(f.fields);f=m.recordDecision(f,f.recommendations[0].id,{status:'Accepted',reviewer:'Owner',rationale:'Evidence reviewed',specification:'Concrete approved specification'});assert.equal(m.futureState(f).fields[0][property],'Concrete approved specification');assert.deepEqual(f.fields,before);
  }
  let f=proposed('Remove');f=m.recordDecision(f,f.recommendations[0].id,{status:'Accepted',reviewer:'Owner',rationale:'Downstream owner confirmed no use'});assert.equal(m.futureState(f).fields.length,1);assert.equal(m.futureState(f).removedFields.length,1);
});
test('unsupported form-level field edits and invalid stored lineage cannot masquerade as decisions',()=>{
  let f=ready();f=m.addFinding(f,{lens:'Process burden',statement:'Approval queue',fieldId:''});assert.throws(()=>m.addRecommendation(f,{findingId:f.findings[0].id,treatment:'Rename',rationale:'x',benefit:'y'}),/selected field/);
  const sample=formsExample();sample.decisions[0].revision=999;assert.throws(()=>m.normalizeForm(sample),/revision/);const other=formsExample();other.verifications=[];assert.throws(()=>m.normalizeForm(other),/human decision/);
});
test('manual findings preserve evidence and constraint separately from proposed automation',()=>{
  let f=ready();f=m.addFinding(f,{fieldId:f.fields[0].id,lens:'System coupling',statement:'Repeated copying',evidence:'Interview 17',constraint:'Integration',confidence:'Medium'});f=m.addRecommendation(f,{findingId:f.findings[0].id,treatment:'Automate',rationale:'Test data reuse',benefit:'Less manual entry'});assert.equal(f.findings[0].constraint,'Integration');assert.equal(f.recommendations[0].origin,'User observation');assert.equal(f.recommendations[0].evidence,'Interview 17');assert.equal(m.futureState(f).actions.length,0);
});
test('500-field bound can be scanned idempotently with non-Latin labels preserved',()=>{
  let f=m.createForm({name:'Large form'},Array.from({length:500},(_,i)=>`Field ${i}`).join('\n'));f=m.verifyStructure(f,'Reviewer');f=m.runQuickScan(f);assert.ok(f.findings.length>=500);assert.equal(m.runQuickScan(f).findings.length,f.findings.length);assert.throws(()=>m.saveField(f,{label:'Extra',sectionId:f.sections[0].id}),/Maximum/);
  let unicode=m.createForm({name:'Unicode'},'姓名\n地址');unicode=m.runQuickScan(m.verifyStructure(unicode,'Reviewer'));assert.equal(unicode.findings.filter(x=>x.scanKey.endsWith(':duplicate')).length,0);
});
