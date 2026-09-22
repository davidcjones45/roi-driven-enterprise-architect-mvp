import { decisionPackage, renderDecisionPackageHtml } from './modernization-decision-package-model.mjs';

const KEY='roi-ea-application-modernization-m1-v0.1';
const EVENT='roi-ea-modernization-data-changed';
const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch{return {}}};
const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

function download(name,content,type){
  const blob=new Blob([content],{type});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download=name;document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),0);
}

function buildPackage(panel){
  const form=panel.querySelector('#m7-meta-form');
  const metadata=Object.fromEntries(new FormData(form).entries());
  return decisionPackage(read(),metadata);
}

function mount(){
  const root=document.querySelector('#modernization.modernization-workspace');
  if(!root||root.querySelector('[data-mod-tab="decision-package"]')) return false;
  const tabs=root.querySelector('.modernization-tabs');
  const decision=root.querySelector('[data-mod-panel="decision"]');
  if(!tabs||!decision) return false;

  const button=document.createElement('button');
  button.type='button';button.dataset.modTab='decision-package';button.textContent='Decision package';
  tabs.append(button);

  const panel=document.createElement('div');
  panel.dataset.modPanel='decision-package';panel.hidden=true;
  panel.innerHTML=html();
  decision.insertAdjacentElement('afterend',panel);

  button.addEventListener('click',()=>{
    root.querySelectorAll('[data-mod-panel]').forEach(p=>p.hidden=p.dataset.modPanel!=='decision-package');
    root.querySelectorAll('[data-mod-tab]').forEach(b=>b.classList.toggle('active',b===button));
    render(panel);
  });

  panel.querySelector('#m7-refresh').addEventListener('click',()=>render(panel));
  panel.querySelector('#m7-download-json').addEventListener('click',()=>{
    const pkg=buildPackage(panel);
    download('modernization-decision-package.json',JSON.stringify(pkg,null,2),'application/json');
  });
  panel.querySelector('#m7-download-html').addEventListener('click',()=>{
    const pkg=buildPackage(panel);
    download('modernization-decision-package.html',renderDecisionPackageHtml(pkg),'text/html');
  });
  panel.querySelector('#m7-print').addEventListener('click',()=>{
    const pkg=buildPackage(panel);
    const w=window.open('','_blank');
    if(!w){alert('Pop-up blocked. Allow pop-ups to print the package.');return}
    w.document.open();w.document.write(renderDecisionPackageHtml(pkg));w.document.close();w.focus();
    setTimeout(()=>w.print(),250);
  });

  window.addEventListener(EVENT,event=>{
    if(event.detail?.key===KEY&&!panel.hidden) render(panel);
  });

  render(panel);
  return true;
}

function html(){
  return `<div class="card"><span class="eyebrow">M7 / DECISION PACKAGE & SERVICE DELIVERY BLUEPRINT</span><h3>Turn modernization evidence into a client-ready, auditable decision package.</h3><p class="quiet-note">This layer summarizes existing evidence. It does not select a provider, choose a winning alternative, approve funding, or authorize migration.</p></div><form id="m7-meta-form" class="form-grid card"><label>Package title<input name="title" value="Application Modernization Decision Package"></label><label>Client / design partner<input name="client" value="Client / design partner"></label><label>Prepared by<input name="preparedBy" value="ROI-Driven Enterprise Architect"></label><label>Prepared date<input name="preparedAt" type="date"></label></form><div class="modernization-actions card"><button type="button" id="m7-refresh">Refresh package</button><button type="button" class="secondary" id="m7-download-json">Download JSON</button><button type="button" class="secondary" id="m7-download-html">Download HTML</button><button type="button" class="secondary" id="m7-print">Open print view</button></div><div id="m7-summary" class="card"></div><div id="m7-preview" class="card"></div>`;
}

function render(panel){
  const form=panel.querySelector('#m7-meta-form');
  if(!form.elements.preparedAt.value) form.elements.preparedAt.value=new Date().toISOString().slice(0,10);
  const pkg=buildPackage(panel);

  panel.querySelector('#m7-summary').innerHTML=`<h3>Package readiness summary</h3><div class="metric-grid"><div class="metric-card"><span>Applications</span><strong>${pkg.executiveSummary.applications}</strong></div><div class="metric-card"><span>Alternatives</span><strong>${pkg.executiveSummary.alternatives}</strong></div><div class="metric-card"><span>Providers</span><strong>${pkg.executiveSummary.providers.length}</strong></div><div class="metric-card"><span>Candidate waves</span><strong>${pkg.executiveSummary.candidateWaves}</strong></div><div class="metric-card"><span>Capacity constraints</span><strong>${pkg.executiveSummary.capacityConstraints}</strong></div><div class="metric-card"><span>Unresolved questions</span><strong>${pkg.executiveSummary.unresolvedQuestionCount}</strong></div></div><p class="quiet-note">${esc(pkg.executiveSummary.authorityBoundary)}</p>`;

  const rows=pkg.applications.map(a=>`<tr><td><strong>${esc(a.application.name)}</strong></td><td>${esc(a.portfolioState?.state||'NOT ASSESSED')}</td><td>${esc(a.candidateWave?.id||'None')}</td><td>${a.assessment?.overallConfidence??'Not assessed'}%</td><td>${esc(a.assessment?.leastRegretNextMove||'Not recorded')}</td></tr>`).join('');
  const actions=pkg.portfolio.nextActions.map(x=>`<li>${esc(x.applicationId||x.capacityType)} - ${esc(x.action)}</li>`).join('');
  const providers=pkg.providerSummary.providers.join(', ')||'None';
  panel.querySelector('#m7-preview').innerHTML=`<h3>Decision package preview</h3><p><strong>Provider evidence:</strong> ${esc(providers)}</p><div class="table-scroll"><table class="evidence-table"><thead><tr><th>Application</th><th>Portfolio state</th><th>Candidate wave</th><th>Assessment confidence</th><th>Least-regret next move</th></tr></thead><tbody>${rows||'<tr><td colspan="5">No applications recorded.</td></tr>'}</tbody></table></div><h4>Next portfolio actions</h4><ul>${actions||'<li>No blocking portfolio actions derived from current records.</li>'}</ul><h4>Unresolved questions</h4><p>${pkg.unresolvedQuestions.length} unresolved item(s) derived from current evidence.</p><h4>Service delivery blueprint</h4><ol>${pkg.serviceDeliveryBlueprint.map(x=>`<li><strong>${esc(x.stage)}</strong> - ${esc(x.purpose)}</li>`).join('')}</ol><p class="quiet-note">Use Download HTML or Open print view for the full package.</p>`;
}

let attempts=0;
function wait(){if(mount())return;if(attempts++<60)setTimeout(wait,100)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wait,{once:true});else wait();
