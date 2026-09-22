// M3 dependency and candidate-wave UI for the M1/M2 modernization workspace.
import {
  DEPENDENCY_TYPES, COUPLING_LEVELS, CRITICALITY_LEVELS,
  normalizeDependency, dependencyIssues, candidateTransitionWaves, blastRadius
} from './modernization-dependency-model.mjs';
import { M3_DEPENDENCY_FIXTURE } from './modernization-dependency-fixture.mjs';
import { awsDiscoveryDependencies } from './aws-dependency-adapter.mjs';

const KEY='roi-ea-application-modernization-m1-v0.1';
const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const pct=v=>v===null||v===undefined?'Not supplied':`${Math.round(Number(v)*100)}%`;
const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch{return {}}};
const write=data=>localStorage.setItem(KEY,JSON.stringify(data));
const ensure=data=>{
  data.applications||=[]; data.dependencies||=[]; data.awsDiscoveryImports||=[];
  data.candidateTransitionWaves||=null; return data;
};

function mount(){
  const root=document.querySelector('#modernization.modernization-workspace');
  if(!root||root.querySelector('[data-mod-tab="dependencies"]')) return false;
  const tabs=root.querySelector('.modernization-tabs');
  const decision=root.querySelector('[data-mod-panel="decision"]');
  if(!tabs||!decision)return false;

  const btn=document.createElement('button');
  btn.type='button'; btn.dataset.modTab='dependencies'; btn.textContent='Dependencies & waves';
  tabs.append(btn);

  const panel=document.createElement('div');
  panel.dataset.modPanel='dependencies'; panel.hidden=true;
  panel.innerHTML=html();
  decision.insertAdjacentElement('afterend',panel);

  btn.addEventListener('click',()=>{
    root.querySelectorAll('[data-mod-panel]').forEach(p=>p.hidden=p.dataset.modPanel!=='dependencies');
    root.querySelectorAll('[data-mod-tab]').forEach(b=>b.classList.toggle('active',b===btn));
    render(panel);
  });

  panel.querySelector('#dep-form').addEventListener('submit',e=>{
    e.preventDefault();
    const data=ensure(read());
    const raw=Object.fromEntries(new FormData(e.currentTarget).entries());
    raw.confidence=raw.confidence===''?null:Number(raw.confidence)/100;
    data.dependencies.push(normalizeDependency(raw));
    data.candidateTransitionWaves=null;
    write(data); e.currentTarget.reset(); render(panel);
  });

  panel.querySelector('#dep-load-fixture').addEventListener('click',()=>{
    const data=ensure(read());
    const byId=new Map(data.applications.map(x=>[x.id,x]));
    M3_DEPENDENCY_FIXTURE.applications.forEach(x=>byId.set(x.id,{...byId.get(x.id),...x}));
    data.applications=[...byId.values()];
    data.dependencies=M3_DEPENDENCY_FIXTURE.dependencies.map(normalizeDependency);
    data.candidateTransitionWaves=null;
    write(data); render(panel);
    alert('Synthetic dependency fixture loaded. Candidate waves have not yet been generated.');
  });

  panel.querySelector('#dep-import-aws').addEventListener('click',()=>{
    const data=ensure(read());
    const result=awsDiscoveryDependencies(data.awsDiscoveryImports||[]);
    const byId=new Map(data.dependencies.map(x=>[x.id,x]));
    result.dependencies.forEach(x=>byId.set(x.id,x));
    data.dependencies=[...byId.values()];
    data.awsDependencyUnresolved=result.unresolved;
    data.candidateTransitionWaves=null;
    write(data); render(panel);
    alert(`AWS dependency evidence processed: ${result.dependencies.length} mapped, ${result.unresolved.length} unresolved.`);
  });

  panel.querySelector('#dep-generate-waves').addEventListener('click',()=>{
    const data=ensure(read());
    data.candidateTransitionWaves=candidateTransitionWaves(data);
    write(data); render(panel);
  });

  panel.querySelector('#dep-blast-app').addEventListener('change',()=>renderBlast(panel));
  panel.querySelector('#dep-blast-depth').addEventListener('change',()=>renderBlast(panel));

  render(panel);
  return true;
}

function html(){
  const types=DEPENDENCY_TYPES.map(x=>`<option>${x}</option>`).join('');
  const coupling=COUPLING_LEVELS.map(x=>`<option>${x}</option>`).join('');
  const criticality=CRITICALITY_LEVELS.map(x=>`<option>${x}</option>`).join('');
  return `
    <div class="card">
      <span class="eyebrow">M3 / DEPENDENCY & TRANSITION-WAVE ANALYSIS</span>
      <h3>Make coupling, uncertainty, and sequencing visible before constructing migration waves.</h3>
      <p class="quiet-note">Candidate waves are analysis artifacts only. Strong coupling may suggest co-migration; sequencing rules may suggest precedence. Cycles, unresolved endpoints, weak evidence, business windows, and capacity constraints require human resolution.</p>
    </div>
    <div class="modernization-actions card">
      <button type="button" id="dep-load-fixture">Load synthetic dependency fixture</button>
      <button type="button" class="secondary" id="dep-import-aws">Normalize imported AWS connection evidence</button>
      <button type="button" id="dep-generate-waves">Generate candidate waves</button>
    </div>
    <form id="dep-form" class="form-grid card">
      <label>Source application<select required name="sourceId" id="dep-source-app"></select></label>
      <label>Target application<select required name="targetId" id="dep-target-app"></select></label>
      <label>Dependency type<select name="dependencyType">${types}</select></label>
      <label>Direction<select name="direction"><option>DIRECTED</option><option>BIDIRECTIONAL</option><option>UNDIRECTED</option></select></label>
      <label>Criticality<select name="criticality">${criticality}</select></label>
      <label>Migration coupling<select name="migrationCoupling">${coupling}</select></label>
      <label>Confidence (0–100)<input type="number" min="0" max="100" name="confidence"></label>
      <label>Resolution state<select name="resolutionState"><option>Resolved</option><option>Partially resolved</option><option>Unresolved</option></select></label>
      <label>Sequencing rule<select name="sequencingRule"><option>None</option><option>SOURCE_BEFORE_TARGET</option><option>TARGET_BEFORE_SOURCE</option></select></label>
      <label>Source reference<input name="sourceReference"></label>
      <label class="full">Evidence references<input name="evidenceRefs" placeholder="EVD-001; EVD-002"></label>
      <label class="full">Failure impact / notes<textarea name="failureImpact" rows="2"></textarea></label>
      <div class="form-actions full"><button type="submit">Add dependency</button></div>
    </form>
    <div class="card evidence-table-wrap">
      <h3>Dependency register</h3>
      <div class="table-scroll"><table class="evidence-table"><thead><tr><th>Source → target</th><th>Type</th><th>Criticality / coupling</th><th>Confidence</th><th>Sequencing</th><th>Evidence state</th></tr></thead><tbody id="dep-rows"></tbody></table></div>
    </div>
    <div class="card" id="dep-unresolved"></div>
    <div class="card">
      <h3>Blast-radius view</h3>
      <div class="form-grid">
        <label>Application<select id="dep-blast-app"></select></label>
        <label>Depth<select id="dep-blast-depth"><option value="1">1 hop</option><option value="2">2 hops</option><option value="3">3 hops</option></select></label>
      </div>
      <div id="dep-blast-result"></div>
    </div>
    <div class="card" id="dep-wave-results"></div>`;
}

function appOptions(data){
  return `<option value="">Select</option>`+data.applications.map(a=>`<option value="${esc(a.id)}">${esc(a.name||a.id)}</option>`).join('');
}
function render(panel){
  const data=ensure(read());
  const options=appOptions(data);
  panel.querySelector('#dep-source-app').innerHTML=options;
  panel.querySelector('#dep-target-app').innerHTML=options;
  const blast=panel.querySelector('#dep-blast-app');
  const previous=blast.value;
  blast.innerHTML=options;
  if(data.applications.some(x=>x.id===previous))blast.value=previous;

  panel.querySelector('#dep-rows').innerHTML=data.dependencies.map(raw=>{
    const d=normalizeDependency(raw);
    const issues=dependencyIssues(d,{applications:data.applications}).issues;
    return `<tr><td><strong>${esc(d.sourceId||'Unresolved')}</strong> → <strong>${esc(d.targetId||'Unresolved')}</strong></td>
      <td>${esc(d.dependencyType)}<br><small>${esc(d.direction)}</small></td>
      <td>${esc(d.criticality)} / ${esc(d.migrationCoupling)}</td>
      <td>${esc(pct(d.confidence))}</td>
      <td>${esc(d.sequencingRule||'None')}</td>
      <td>${issues.length?`<strong>${issues.length} review issue(s)</strong><br><small>${esc(issues.join(' '))}</small>`:'Resolved for current analysis'}</td></tr>`;
  }).join('')||'<tr><td colspan="6">No dependencies recorded.</td></tr>';

  const awsUnresolved=data.awsDependencyUnresolved||[];
  panel.querySelector('#dep-unresolved').innerHTML=`<h3>Unresolved provider evidence</h3>
    <p>${awsUnresolved.length} AWS-discovered connection(s) currently lack unique application endpoint mapping.</p>
    ${awsUnresolved.length?`<ul>${awsUnresolved.slice(0,20).map(x=>`<li>${esc(x.unresolvedSourceResource||'?')} → ${esc(x.unresolvedTargetResource||'?')}: ${esc(x.reason)}</li>`).join('')}</ul>`:''}`;

  renderBlast(panel);
  renderWaves(panel,data);
}
function renderBlast(panel){
  const data=ensure(read());
  const app=panel.querySelector('#dep-blast-app').value;
  const depth=Number(panel.querySelector('#dep-blast-depth').value||1);
  const target=panel.querySelector('#dep-blast-result');
  if(!app){target.innerHTML='<p class="quiet-note">Select an application to inspect dependency blast radius.</p>';return;}
  const result=blastRadius(app,data.dependencies,depth);
  target.innerHTML=result.affected.length
    ? `<ul>${result.affected.map(x=>`<li>${esc(x.applicationId)} — depth ${x.depth}, via ${esc(x.viaDependencyId)}</li>`).join('')}</ul>`
    : '<p>No connected applications were found within the selected depth.</p>';
}
function renderWaves(panel,data){
  const result=data.candidateTransitionWaves;
  const target=panel.querySelector('#dep-wave-results');
  if(!result){target.innerHTML='<h3>Candidate transition waves</h3><p class="quiet-note">No analysis generated yet.</p>';return;}
  const waves=result.candidateWaves.map(w=>`<article class="decision-item"><h4>${esc(w.id)} · sequence layer ${esc(w.sequenceLayer??'Unresolved')}</h4>
    <p><strong>Applications:</strong> ${esc(w.applicationIds.join(', '))}</p>
    <p>${esc(w.rationale)}</p>
    <p><strong>Dependency confidence:</strong> ${esc(pct(w.averageDependencyConfidence))} · <strong>Unresolved dependencies:</strong> ${w.unresolvedDependencyCount}</p>
    <small>${esc(w.status)}</small></article>`).join('');
  target.innerHTML=`<h3>Candidate transition waves</h3>
    ${result.sequencingCycle?'<div class="federated-caveat"><strong>Sequencing cycle detected.</strong> No sequence layer is authoritative until the cycle is resolved.</div>':''}
    ${waves||'<p>No candidate groups produced.</p>'}
    <p class="quiet-note">Coupling threshold: ${esc(result.couplingThreshold.join(', '))}. Authority state: ${esc(result.authorityState)}.</p>`;
}

let attempts=0;
function wait(){if(mount())return;if(attempts++<60)setTimeout(wait,100);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wait,{once:true});else wait();
