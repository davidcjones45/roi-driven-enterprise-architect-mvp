import {
  MODERNIZATION_DIMENSIONS, DIMENSION_LABELS, STRATEGY_CLASSES,
  normalizeApplication, normalizeConstraint, normalizeAlternative,
  normalizeModernizationAssessment, modernizationDecisionView, portfolioSummary
} from './modernization-model.mjs';
import { MODERNIZATION_FIXTURE } from './modernization-fixture.mjs';

const KEY='roi-ea-application-modernization-m1-v0.1';
const empty=()=>({applications:[],constraints:[],alternatives:[],assessments:[],providerAssessments:[]});
const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const pct=v=>`${Math.round(Number(v||0)*100)}%`;
const money=v=>Number(v||0).toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0});

function read(){
  try { return {...empty(),...JSON.parse(localStorage.getItem(KEY)||'{}')}; }
  catch { return empty(); }
}
function write(data){ localStorage.setItem(KEY,JSON.stringify(data)); }
function clone(x){ return JSON.parse(JSON.stringify(x)); }

export function mountModernizationWorkspace(){
  const sidebarLibrary=document.querySelector('#workspace-library > div');
  const nav=document.querySelector('nav[aria-label="Workflow"]');
  const main=document.querySelector('#main-content');
  if(!sidebarLibrary||!nav||!main||document.querySelector('[data-workspace-select="modernization"]')) return;

  const ws=document.createElement('button');
  ws.type='button'; ws.className='workspace-select';
  ws.dataset.workspaceSelect='modernization'; ws.textContent='Application Modernization';
  sidebarLibrary.append(ws);

  const navGroup=document.createElement('div');
  navGroup.className='nav-group';
  navGroup.dataset.navWorkspace='modernization';
  navGroup.hidden=true;
  navGroup.innerHTML=`
    <span class="nav-caption">MODERNIZATION</span>
    <button class="nav-link" data-workspace="modernization" data-view="modernization"><span>AM</span> Modernization workbench</button>`;
  nav.append(navGroup);

  const section=document.createElement('section');
  section.id='modernization';
  section.className='view modernization-workspace';
  section.innerHTML=workspaceHtml();
  const footer=main.querySelector('.application-footer');
  main.insertBefore(section,footer);

  wire(section);
  render(section);
  window.addEventListener('roi-ea-modernization-data-changed',event=>{
    if(event.detail?.key===KEY) render(section);
  });
}

function workspaceHtml(){
  const dimOptions=MODERNIZATION_DIMENSIONS.map(d=>`<option value="${esc(d)}">${esc(DIMENSION_LABELS[d])}</option>`).join('');
  const strategyOptions=STRATEGY_CLASSES.map(x=>`<option value="${x}">${x}</option>`).join('');
  return `
  <div class="section-heading">
    <div><span class="eyebrow">APPLICATION MODERNIZATION / M1</span>
      <h2>Compare modernization paths without making the cloud provider the decision authority.</h2>
      <p>Provider-neutral portfolio, assessment, constraints, candidate strategies, and least-regret next move. Provider recommendations remain advisory evidence.</p>
    </div><span class="status-pill" id="mod-status">Draft</span>
  </div>
  <div class="federated-caveat" role="note"><strong>Decision boundary:</strong> This workspace supports analysis. It does not approve architecture, budget, security exceptions, migration, cutover, or production release.</div>

  <div class="metric-grid" id="mod-summary"></div>

  <div class="modernization-actions card">
    <button type="button" id="mod-load-fixture">Load synthetic Claims example</button>
    <button type="button" class="secondary" id="mod-reset">Reset modernization workspace</button>
  </div>

  <div class="modernization-tabs card" role="tablist" aria-label="Modernization workspace views">
    <button type="button" data-mod-tab="portfolio">Portfolio</button>
    <button type="button" data-mod-tab="assessment">Assessment</button>
    <button type="button" data-mod-tab="constraints">Constraints</button>
    <button type="button" data-mod-tab="alternatives">Alternatives</button>
    <button type="button" data-mod-tab="decision">Decision view</button>
  </div>

  <div data-mod-panel="portfolio">
    <form id="mod-app-form" class="form-grid card">
      <label>Application name<input required name="name"></label>
      <label>Application type<input name="applicationType" placeholder="Business application"></label>
      <label>Business owner<input name="businessOwner"></label>
      <label>Technical owner<input name="technicalOwner"></label>
      <label>Business criticality<select name="businessCriticality"><option>Unknown</option><option>Low</option><option>Moderate</option><option>High</option><option>Mission critical</option></select></label>
      <label>Strategic importance<select name="strategicImportance"><option>Unknown</option><option>Low</option><option>Medium</option><option>High</option></select></label>
      <label>Lifecycle status<input name="lifecycleStatus" placeholder="Strategic, sunset, replacement planned..."></label>
      <label>Expected remaining life<input name="expectedRemainingLife" placeholder="e.g. 10+ years"></label>
      <label class="full">Description<textarea name="description" rows="2"></textarea></label>
      <label class="full">Evidence references<input name="evidenceRefs" placeholder="EVD-001; EVD-002"></label>
      <div class="form-actions full"><button type="submit">Add application</button></div>
    </form>
    <div class="card evidence-table-wrap"><div class="table-scroll"><table class="evidence-table"><thead><tr><th>Application</th><th>Owners</th><th>Criticality</th><th>Lifecycle</th><th>Evidence</th></tr></thead><tbody id="mod-app-rows"></tbody></table></div></div>
  </div>

  <div data-mod-panel="assessment" hidden>
    <form id="mod-assessment-form" class="form-grid card">
      <label>Application<select required name="applicationId" id="mod-assessment-app"></select></label>
      <label>Assessment date<input required type="date" name="assessmentDate"></label>
      <label>Dimension<select required name="dimension">${dimOptions}</select></label>
      <label>Value<input required name="value" placeholder="High, Medium, Low, Long-life..."></label>
      <label>Confidence (0â€“100)<input required type="number" min="0" max="100" name="confidence" value="50"></label>
      <label>Overall confidence (0â€“100)<input type="number" min="0" max="100" name="overallConfidence" value="50"></label>
      <label class="full">Rationale<textarea required name="rationale" rows="2"></textarea></label>
      <label class="full">Evidence references<input name="evidenceRefs" placeholder="EVD-001; EVD-002"></label>
      <label class="full">Explicit assumptions<input name="assumptions" placeholder="Assumption A; Assumption B"></label>
      <label class="full">Least-regret next move<textarea name="leastRegretNextMove" rows="2" placeholder="What should happen next if evidence is insufficient?"></textarea></label>
      <div class="form-actions full"><button type="submit">Save dimension assessment</button></div>
    </form>
    <div class="card" id="mod-assessment-matrix"></div>
  </div>

  <div data-mod-panel="constraints" hidden>
    <form id="mod-constraint-form" class="form-grid card">
      <label>Constraint name<input required name="name"></label>
      <label>Type<select name="type"><option value="HARD">HARD</option><option value="SOFT">SOFT / preference</option></select></label>
      <label class="full">Condition<textarea required name="condition" rows="2"></textarea></label>
      <label>Source<input name="source"></label>
      <label>Authority<input name="authority"></label>
      <label>Evaluation<select name="evaluation"><option>Not assessed</option><option>Satisfied</option><option>Violated</option></select></label>
      <label class="full">Applies to alternative IDs<input name="alternativeIds" placeholder="Leave blank for general; or ALT-...; ALT-..."></label>
      <label class="full">Evidence references<input name="evidenceRefs"></label>
      <div class="form-actions full"><button type="submit">Add constraint</button></div>
    </form>
    <div class="card" id="mod-constraint-list"></div>
  </div>

  <div data-mod-panel="alternatives" hidden>
    <form id="mod-alt-form" class="form-grid card">
      <label>Application<select required name="applicationId" id="mod-alt-app"></select></label>
      <label>Strategy<select required name="strategyClass">${strategyOptions}</select></label>
      <label>Alternative name<input required name="name"></label>
      <label>Provider<input name="provider" value="Provider neutral"></label>
      <label class="full">Description<textarea required name="description" rows="2"></textarea></label>
      <label class="full">Target architecture<textarea name="targetArchitecture" rows="2"></textarea></label>
      <label>One-time cost ($)<input type="number" min="0" name="oneTimeCost"></label>
      <label>Annual run cost ($)<input type="number" min="0" name="annualRunCost"></label>
      <label>Estimated duration<input name="estimatedDuration"></label>
      <label>Confidence (0â€“100)<input type="number" min="0" max="100" name="confidence" value="50"></label>
      <label>Evidence completeness (0â€“100)<input type="number" min="0" max="100" name="evidenceCompleteness" value="50"></label>
      <label class="full">Evidence references<input name="evidenceRefs"></label>
      <div class="form-actions full"><button type="submit">Add candidate alternative</button></div>
    </form>
    <div class="card evidence-table-wrap"><div class="table-scroll"><table class="evidence-table"><thead><tr><th>Alternative</th><th>Strategy</th><th>Target</th><th>Economics</th><th>Confidence</th></tr></thead><tbody id="mod-alt-rows"></tbody></table></div></div>
  </div>

  <div data-mod-panel="decision" hidden>
    <div class="card" id="mod-decision-view"></div>
  </div>`;
}

function wire(root){
  root.querySelectorAll('[data-mod-tab]').forEach(btn=>btn.addEventListener('click',()=>{
    root.querySelectorAll('[data-mod-panel]').forEach(p=>p.hidden=p.dataset.modPanel!==btn.dataset.modTab);
    root.querySelectorAll('[data-mod-tab]').forEach(b=>b.classList.toggle('active',b===btn));
  }));
  root.querySelector('[data-mod-tab="portfolio"]').classList.add('active');

  root.querySelector('#mod-load-fixture').addEventListener('click',()=>{
    write(clone(MODERNIZATION_FIXTURE)); render(root);
  });
  root.querySelector('#mod-reset').addEventListener('click',()=>{
    if(confirm('Reset only the browser-local Application Modernization workspace?')){
      write(empty()); render(root);
    }
  });

  root.querySelector('#mod-app-form').addEventListener('submit',e=>{
    e.preventDefault(); const data=read(); const raw=Object.fromEntries(new FormData(e.currentTarget).entries());
    data.applications.push(normalizeApplication(raw)); write(data); e.currentTarget.reset(); render(root);
  });

  root.querySelector('#mod-constraint-form').addEventListener('submit',e=>{
    e.preventDefault(); const data=read(); const raw=Object.fromEntries(new FormData(e.currentTarget).entries());
    data.constraints.push(normalizeConstraint(raw)); write(data); e.currentTarget.reset(); render(root);
  });

  root.querySelector('#mod-alt-form').addEventListener('submit',e=>{
    e.preventDefault(); const data=read(); const raw=Object.fromEntries(new FormData(e.currentTarget).entries());
    raw.confidence=Number(raw.confidence)/100; raw.evidenceCompleteness=Number(raw.evidenceCompleteness)/100;
    data.alternatives.push(normalizeAlternative(raw));
    let assessment=data.assessments.find(x=>x.applicationId===raw.applicationId);
    if(!assessment){
      assessment=normalizeModernizationAssessment({applicationId:raw.applicationId,assessmentDate:new Date().toISOString().slice(0,10)});
      data.assessments.push(assessment);
    }
    assessment.candidateAlternativeIds=[...new Set([...(assessment.candidateAlternativeIds||[]),data.alternatives.at(-1).id])];
    write(data); e.currentTarget.reset(); render(root);
  });

  root.querySelector('#mod-assessment-form').addEventListener('submit',e=>{
    e.preventDefault(); const data=read(); const raw=Object.fromEntries(new FormData(e.currentTarget).entries());
    let a=data.assessments.find(x=>x.applicationId===raw.applicationId);
    if(!a){ a=normalizeModernizationAssessment({applicationId:raw.applicationId,assessmentDate:raw.assessmentDate}); data.assessments.push(a); }
    a.assessmentDate=raw.assessmentDate;
    a.overallConfidence=Number(raw.overallConfidence)/100;
    a[raw.dimension]={
      value:raw.value,rationale:raw.rationale,evidenceRefs:raw.evidenceRefs,
      assumptions:raw.assumptions,confidence:Number(raw.confidence)/100,
      lastValidated:raw.assessmentDate
    };
    if(raw.leastRegretNextMove) a.leastRegretNextMove=raw.leastRegretNextMove;
    Object.assign(a,normalizeModernizationAssessment(a));
    write(data); render(root);
  });
}

function render(root){
  const data=read(), summary=portfolioSummary(data);
  root.querySelector('#mod-status').textContent=data.applications.length?'In progress':'Draft';
  root.querySelector('#mod-summary').innerHTML=[
    ['Applications',summary.applications],
    ['Assessments',summary.assessments],
    ['Candidate alternatives',summary.alternatives],
    ['Active hard constraints',summary.hardConstraints],
    ['Low-confidence assessments',summary.lowConfidenceAssessments]
  ].map(([label,value])=>`<div class="metric-card"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`).join('');

  const appOptions=`<option value="">Select</option>`+(data.applications||[]).map(a=>`<option value="${esc(a.id)}">${esc(a.name)}</option>`).join('');
  root.querySelector('#mod-assessment-app').innerHTML=appOptions;
  root.querySelector('#mod-alt-app').innerHTML=appOptions;

  root.querySelector('#mod-app-rows').innerHTML=(data.applications||[]).map(raw=>{
    const a=normalizeApplication(raw);
    return `<tr><td><strong>${esc(a.name)}</strong><br><small>${esc(a.applicationType)}</small></td>
      <td>${esc(a.businessOwner)}<br><small>${esc(a.technicalOwner)}</small></td>
      <td>${esc(a.businessCriticality)} / ${esc(a.strategicImportance)}</td>
      <td>${esc(a.lifecycleStatus)}<br><small>${esc(a.expectedRemainingLife)}</small></td>
      <td>${esc(a.evidenceRefs.join(', ')||'None recorded')}</td></tr>`;
  }).join('')||`<tr><td colspan="5">No applications recorded.</td></tr>`;

  root.querySelector('#mod-constraint-list').innerHTML=(data.constraints||[]).map(c=>{
    const x=normalizeConstraint(c);
    return `<div class="decision-item"><strong>${esc(x.type)} â€” ${esc(x.name)}</strong>
      <p>${esc(x.condition)}</p><small>${esc(x.evaluation)} Â· ${esc(x.authority||'Authority not recorded')}</small></div>`;
  }).join('')||'<p>No constraints recorded.</p>';

  root.querySelector('#mod-alt-rows').innerHTML=(data.alternatives||[]).map(raw=>{
    const a=normalizeAlternative(raw);
    return `<tr><td><strong>${esc(a.name)}</strong><br><small>${esc(a.provider)}</small></td>
      <td>${esc(a.strategyClass)}</td><td>${esc(a.targetArchitecture||'Not defined')}</td>
      <td>${money(a.oneTimeCost)} transition<br><small>${money(a.annualRunCost)} annual run</small></td>
      <td>${pct(a.confidence)}<br><small>${pct(a.evidenceCompleteness)} evidence</small></td></tr>`;
  }).join('')||`<tr><td colspan="5">No candidate alternatives recorded.</td></tr>`;

  const assessments=(data.assessments||[]).map(normalizeModernizationAssessment);
  root.querySelector('#mod-assessment-matrix').innerHTML=assessments.map(a=>{
    const app=data.applications.find(x=>x.id===a.applicationId);
    const rows=MODERNIZATION_DIMENSIONS.map(d=>`<tr><td>${esc(DIMENSION_LABELS[d])}</td>
      <td>${esc(a[d].value)}</td><td>${pct(a[d].confidence)}</td>
      <td>${esc(a[d].evidenceRefs.join(', ')||a[d].assumptions.join(', ')||'No evidence/assumption')}</td></tr>`).join('');
    return `<h3>${esc(app?.name||a.applicationId)}</h3>
      <p><strong>Overall confidence:</strong> ${pct(a.overallConfidence)} Â· <strong>Least-regret next move:</strong> ${esc(a.leastRegretNextMove||'Not recorded')}</p>
      <div class="table-scroll"><table class="evidence-table"><thead><tr><th>Dimension</th><th>Value</th><th>Confidence</th><th>Evidence / assumption</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }).join('')||'<p>No assessments recorded.</p>';

  root.querySelector('#mod-decision-view').innerHTML=assessments.map(a=>{
    const app=data.applications.find(x=>x.id===a.applicationId);
    const view=modernizationDecisionView(a,data);
    const viable=view.viableAlternatives.map(x=>`<li><strong>${esc(x.name)}</strong> â€” ${esc(x.strategyClass)} Â· confidence ${pct(x.confidence)}</li>`).join('')||'<li>No viable candidate alternatives recorded.</li>';
    const eliminated=view.eliminatedAlternatives.map(x=>`<li><strong>${esc(x.name)}</strong> â€” eliminated by ${esc(x.constraintResult.violatedConstraintIds.join(', '))}</li>`).join('');
    const providers=(data.providerAssessments||[]).filter(x=>x.applicationId===a.applicationId)
      .map(x=>`<li>${esc(x.provider)}: ${esc(x.strategy)} Â· ${esc(x.status||'Advisory evidence only')} Â· ${pct(x.confidence)}</li>`).join('')||'<li>No provider assessment evidence recorded.</li>';
    return `<article class="decision-item">
      <span class="eyebrow">HUMAN REVIEW REQUIRED</span><h3>${esc(app?.name||a.applicationId)}</h3>
      <p><strong>Least-regret next move:</strong> ${esc(a.leastRegretNextMove||'Not recorded')}</p>
      <p><strong>Overall confidence:</strong> ${pct(a.overallConfidence)}</p>
      <h4>Viable candidate alternatives</h4><ul>${viable}</ul>
      ${eliminated?`<h4>Hard-constraint eliminations</h4><ul>${eliminated}</ul>`:''}
      <h4>Provider-generated assessment evidence</h4><ul>${providers}</ul>
      <p class="quiet-note">No winner is selected by this workspace. Provider evidence, technical feasibility, economics, risk, and organizational readiness remain inputs to accountable human judgment.</p>
    </article>`;
  }).join('')||'<p>Record an application, assessment, and candidate alternatives to build the decision view.</p>';
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',mountModernizationWorkspace,{once:true});
else mountModernizationWorkspace();

