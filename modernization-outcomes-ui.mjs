import {
  CUTOVER_OUTCOMES, normalizeOutcome, outcomeIssues, outcomeVariance,
  forecastErrorSummary, confidenceObservation, learningSummary
} from './modernization-outcomes-model.mjs';
import { M8_OUTCOME_FIXTURE } from './modernization-outcomes-fixture.mjs';

const KEY='roi-ea-application-modernization-m1-v0.1';
const EVENT='roi-ea-modernization-data-changed';
const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const money=v=>v===null||v===undefined?'Not recorded':Number(v).toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0});
const pct=v=>v===null||v===undefined?'Not comparable':`${(Number(v)*100).toFixed(1)}%`;
const number=v=>v===null||v===undefined?'Not recorded':Number(v).toLocaleString('en-US',{maximumFractionDigits:2});
const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch{return {}}};
const write=data=>{localStorage.setItem(KEY,JSON.stringify(data));window.dispatchEvent(new CustomEvent(EVENT,{detail:{key:KEY,source:'modernization-outcomes-ui.mjs'}}));};
const ensure=data=>{data.applications||=[];data.alternatives||=[];data.economicLines||=[];data.modernizationOutcomes||=[];return data;};

function mount(){
  const root=document.querySelector('#modernization.modernization-workspace');
  if(!root||root.querySelector('[data-mod-tab="outcomes"]')) return false;
  const tabs=root.querySelector('.modernization-tabs');
  const decision=root.querySelector('[data-mod-panel="decision"]');
  if(!tabs||!decision) return false;

  const button=document.createElement('button');
  button.type='button';button.dataset.modTab='outcomes';button.textContent='Outcomes & learning';
  tabs.append(button);

  const panel=document.createElement('div');
  panel.dataset.modPanel='outcomes';panel.hidden=true;
  panel.innerHTML=html();
  decision.insertAdjacentElement('afterend',panel);

  button.addEventListener('click',()=>{
    root.querySelectorAll('[data-mod-panel]').forEach(p=>p.hidden=p.dataset.modPanel!=='outcomes');
    root.querySelectorAll('[data-mod-tab]').forEach(b=>b.classList.toggle('active',b===button));
    render(panel);
  });

  panel.querySelector('#m8-outcome-form').addEventListener('submit',e=>{
    e.preventDefault();
    const data=ensure(read());
    const raw=Object.fromEntries(new FormData(e.currentTarget).entries());
    raw.rollbackOccurred=e.currentTarget.elements.rollbackOccurred.checked;
    const outcome=normalizeOutcome(raw,data);
    const issues=outcomeIssues(outcome,data).issues;
    if(issues.length){
      alert(`Outcome has ${issues.length} review issue(s): ${issues.join(' ')}`);
    }
    const byId=new Map(data.modernizationOutcomes.map(x=>[x.id,x]));
    byId.set(outcome.id,outcome);
    data.modernizationOutcomes=[...byId.values()];
    write(data);e.currentTarget.reset();render(panel);
  });

  panel.querySelector('#m8-load-fixture').addEventListener('click',()=>{
    const data=ensure(read());
    const outcome=normalizeOutcome(M8_OUTCOME_FIXTURE,data);
    const byId=new Map(data.modernizationOutcomes.map(x=>[x.id,x]));
    byId.set(outcome.id,outcome);
    data.modernizationOutcomes=[...byId.values()];
    write(data);render(panel);
    alert('Synthetic outcome evidence loaded. It is historical acceptance-test data, not a real migration result.');
  });

  panel.querySelector('#m8-app').addEventListener('change',()=>syncAlternatives(panel));
  window.addEventListener(EVENT,event=>{
    if(event.detail?.key===KEY&&!panel.hidden) render(panel);
  });

  render(panel);
  return true;
}

function html(){
  return `<div class="card"><span class="eyebrow">M8 / OUTCOME MEASUREMENT & INSTITUTIONAL LEARNING</span><h3>Compare forecast to actual delivery without turning history into an automatic future decision.</h3><p class="quiet-note">Outcome evidence is descriptive. Historical provider or strategy performance must not automatically select a future provider, architecture, or migration path.</p></div><div class="modernization-actions card"><button type="button" id="m8-load-fixture">Load synthetic outcome fixture</button></div><form id="m8-outcome-form" class="form-grid card"><label>Application<select required name="applicationId" id="m8-app"></select></label><label>Implemented alternative<select required name="alternativeId" id="m8-alt"></select></label><label>Completion date<input required type="date" name="completedAt"></label><label>Cutover outcome<select name="cutoverOutcome">${CUTOVER_OUTCOMES.map(x=>`<option>${esc(x)}</option>`).join('')}</select></label><label><input type="checkbox" name="rollbackOccurred"> Rollback occurred</label><label>Incident count<input type="number" min="0" name="incidentCount"></label><label>Downtime minutes<input type="number" min="0" step=".1" name="downtimeMinutes"></label><label>Dependency surprises<input type="number" min="0" name="dependencySurpriseCount"></label><label>Planned duration months<input type="number" min="0" step=".1" name="plannedDurationMonths"></label><label>Actual duration months<input type="number" min="0" step=".1" name="actualDurationMonths"></label><label>Planned engineering hours<input type="number" min="0" step=".1" name="plannedEngineeringHours"></label><label>Actual engineering hours<input type="number" min="0" step=".1" name="actualEngineeringHours"></label><label>Planned transition cost<input type="number" min="0" step=".01" name="plannedTransitionCost"></label><label>Actual transition cost<input type="number" min="0" step=".01" name="actualTransitionCost"></label><label>Planned annual run cost<input type="number" min="0" step=".01" name="plannedAnnualRunCost"></label><label>Actual annual run cost<input type="number" min="0" step=".01" name="actualAnnualRunCost"></label><label>Planned annual benefit<input type="number" min="0" step=".01" name="plannedAnnualBenefit"></label><label>Actual annual benefit<input type="number" min="0" step=".01" name="actualAnnualBenefit"></label><label>Forecast confidence (0-100)<input type="number" min="0" max="100" name="forecastConfidence"></label><label>Evidence completeness (0-100)<input type="number" min="0" max="100" name="evidenceCompleteness"></label><label class="full">Architecture deviation<textarea name="architectureDeviation" rows="2"></textarea></label><label class="full">Dependency surprises detail<textarea name="dependencySurprises" rows="2"></textarea></label><label class="full">Lessons learned<textarea name="lessonsLearned" rows="3"></textarea></label><label class="full">Evidence references<input name="evidenceRefs"></label><label>Source<input name="source"></label><label>Source owner<input name="sourceOwner"></label><div class="form-actions full"><button type="submit">Record outcome</button></div></form><div class="card evidence-table-wrap"><h3>Forecast versus actual</h3><div class="table-scroll"><table class="evidence-table"><thead><tr><th>Application / alternative</th><th>Cutover</th><th>Duration variance</th><th>Transition cost variance</th><th>Run cost variance</th><th>Benefit variance</th><th>Forecast error</th></tr></thead><tbody id="m8-outcome-rows"></tbody></table></div></div><div class="card" id="m8-learning"></div>`;
}

function appOptions(data){
  return '<option value="">Select</option>'+data.applications.map(a=>`<option value="${esc(a.id)}">${esc(a.name||a.id)}</option>`).join('');
}

function syncAlternatives(panel){
  const data=ensure(read());
  const app=panel.querySelector('#m8-app').value;
  panel.querySelector('#m8-alt').innerHTML='<option value="">Select</option>'+data.alternatives.filter(x=>x.applicationId===app).map(x=>`<option value="${esc(x.id)}">${esc(x.name||x.id)}</option>`).join('');
}

function render(panel){
  const data=ensure(read());
  const appSelect=panel.querySelector('#m8-app');
  const previous=appSelect.value;
  appSelect.innerHTML=appOptions(data);
  if(data.applications.some(x=>x.id===previous)) appSelect.value=previous;
  syncAlternatives(panel);

  panel.querySelector('#m8-outcome-rows').innerHTML=data.modernizationOutcomes.map(raw=>{
    const o=normalizeOutcome(raw,data);
    const v=outcomeVariance(o,data);
    const error=forecastErrorSummary(o,data);
    return `<tr><td><strong>${esc(o.applicationId)}</strong><br><small>${esc(o.alternativeName||o.alternativeId)} / ${esc(o.provider)}</small></td><td>${esc(o.cutoverOutcome)}<br><small>${o.rollbackOccurred?'Rollback recorded':'No rollback recorded'}; ${o.incidentCount} incident(s)</small></td><td>${number(v.duration.absolute)} months<br><small>${pct(v.duration.percent)}</small></td><td>${money(v.transitionCost.absolute)}<br><small>${pct(v.transitionCost.percent)}</small></td><td>${money(v.annualRunCost.absolute)}<br><small>${pct(v.annualRunCost.percent)}</small></td><td>${money(v.annualBenefit.absolute)}<br><small>${pct(v.annualBenefit.percent)}</small></td><td>${pct(error.meanAbsolutePercentageError)}<br><small>${error.comparableMetrics} comparable metric(s)</small></td></tr>`;
  }).join('')||'<tr><td colspan="7">No outcome evidence recorded.</td></tr>';

  const learning=learningSummary(data.modernizationOutcomes,data);
  const rows=learning.groups.map(x=>`<tr><td>${esc(x.provider)}</td><td>${esc(x.strategyClass)}</td><td>${x.outcomeCount}</td><td>${pct(x.avgTransitionCostVariancePercent)}</td><td>${pct(x.avgRunCostVariancePercent)}</td><td>${pct(x.avgBenefitVariancePercent)}</td><td>${pct(x.avgForecastAbsoluteError)}</td><td>${x.rollbackCount} rollback(s); ${x.incidentCount} incident(s); ${x.dependencySurpriseCount} dependency surprise(s)</td></tr>`).join('');
  panel.querySelector('#m8-learning').innerHTML=`<h3>Institutional learning summary</h3><div class="table-scroll"><table class="evidence-table"><thead><tr><th>Provider</th><th>Strategy</th><th>Outcomes</th><th>Transition cost variance</th><th>Run cost variance</th><th>Benefit variance</th><th>Mean forecast absolute error</th><th>Delivery observations</th></tr></thead><tbody>${rows||'<tr><td colspan="8">No historical outcomes available.</td></tr>'}</tbody></table></div><p class="quiet-note">${esc(learning.authorityState)}</p>`;
}

let attempts=0;
function wait(){if(mount())return;if(attempts++<60)setTimeout(wait,100)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wait,{once:true});else wait();
