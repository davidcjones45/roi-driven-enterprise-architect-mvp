import {
  RELIANCE_STATUSES, REASSESSMENT_TRIGGERS, CONSTRAINT_TYPES, CONSTRAINT_VALIDATION_STATUSES,
  migrateContinuityAssuranceWorkspace, normalizeRelianceClaim, evaluateRelianceClaim,
  normalizeConstraintValidation, validateConstrainingDependency, normalizeReassessmentRecord,
  targetedReassessmentScope, designedObservedAssuredView, dependencyAccumulationAnalysis,
  evaluateInterventionOutcome, evaluateSuccessorAssurance, evaluateHumanAgencyGate,
  evaluateGraduation, interactionDivergence, continuityAssuranceSummary
} from './continuity-assurance-model.mjs';
import { continuityAssuranceCifHandoff } from './continuity-assurance-cif-bridge.mjs';

const KEY='roi-ea-application-modernization-m1-v0.1';
const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const list=v=>String(v||'').split(/[;,\n]/).map(x=>x.trim()).filter(Boolean);
const read=()=>{try{return migrateContinuityAssuranceWorkspace(JSON.parse(localStorage.getItem(KEY)||'{}'));}catch{return migrateContinuityAssuranceWorkspace({});}};
const write=data=>{localStorage.setItem(KEY,JSON.stringify(data));window.dispatchEvent(new CustomEvent('roi-ea-modernization-data-changed',{detail:{key:KEY,source:'continuity-assurance-ui.mjs'}}));};
const download=(name,payload)=>{const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.append(a);a.click();a.remove();URL.revokeObjectURL(a.href);};

function optionRows(values){return values.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');}

function html(){return `
  <div class="card ca-boundary"><span class="eyebrow">CIF-S-009 / CIF-AP-002</span><h3>Continuity assurance</h3>
    <p class="quiet-note">Dependency is not justified Reliance. Designed, Observed, and Assured are nonhierarchical analytical views. Imported structure remains evidence, structural prominence remains a screening signal, and action completion does not prove outcome.</p>
    <div class="depgraph-actions"><button type="button" id="ca-export">Export CIF-aligned continuity handoff</button><button type="button" class="secondary" id="ca-refresh">Refresh view</button></div>
  </div>
  <div id="ca-summary" class="depgraph-grid"></div>
  <div class="two-column-grid">
    <form class="card form-grid" id="ca-reliance-form">
      <div class="full"><span class="eyebrow">RELIANCE CLAIM</span><p class="quiet-note">Record what is currently justified as relied upon for an Essential Action, within explicit scope and boundary. A dependency alone never makes this SUPPORTED.</p></div>
      <label>Relying actor/reference<input name="relyingActorRef" required></label>
      <label>Essential Action<select name="essentialActionRef" id="ca-action-select" required></select></label>
      <label class="full">Reliance object references<input name="relianceObjectRefs" placeholder="service; role; resource"></label>
      <label class="full">Dependency references<input name="dependencyRefs" placeholder="dependency edge IDs"></label>
      <label class="full">Evidence references<input name="evidenceRefs" placeholder="evidence IDs"></label>
      <label>Scope<input name="scope" required></label><label>Boundary<input name="boundary" required></label>
      <label>Status<select name="status">${optionRows(RELIANCE_STATUSES)}</select></label><label>Review by<input type="date" name="reviewBy"></label>
      <label class="full">Conditions<input name="conditions" placeholder="operating conditions; assumptions"></label>
      <label class="full">Qualification<textarea name="qualification" rows="2"></textarea></label>
      <div class="full"><button type="submit">Record Reliance Claim</button></div>
    </form>
    <form class="card form-grid" id="ca-reassessment-form">
      <div class="full"><span class="eyebrow">TARGETED REASSESSMENT</span><p class="quiet-note">Reassessment starts with the smallest materially implicated assurance scope. It does not reopen the repository.</p></div>
      <label>Trigger<select name="trigger">${optionRows(REASSESSMENT_TRIGGERS)}</select></label><label>Affected reference<input name="affectedRef" required></label>
      <label class="full">Materiality basis<textarea name="materialityBasis" rows="2" required></textarea></label>
      <label>Scope<input name="scope" required></label><label>Evidence references<input name="evidenceRefs"></label>
      <div class="full"><button type="submit">Add reassessment</button></div>
    </form>
  </div>
  <div class="card"><h3>Core continuity view</h3><div id="ca-reliance-table"></div></div>
  <div class="card"><h3>Designed / Observed / Assured</h3><p class="quiet-note">These perspectives are comparisons, not maturity stages.</p><div id="ca-doa"></div></div>
  <div class="card"><h3>Dependency accumulation lens</h3><div id="ca-accumulation"></div></div>
  <div class="card"><h3>Constraining dependency validation</h3><div id="ca-constraints"></div></div>
  <div class="card"><h3>Intervention / consequence / outcome / residual exposure</h3><div id="ca-outcomes"></div></div>
  <div class="card"><h3>Reassessment queue</h3><div id="ca-reassessments"></div></div>
  <div class="card"><h3>Successor Assurance</h3><div id="ca-successors"></div></div>
  <div class="card" id="ca-human" hidden><h3>Optional Human Agency / Graduation</h3><div id="ca-human-body"></div></div>
  <div class="card"><h3>Human+AI Interaction Divergence</h3><div id="ca-interaction"></div></div>
`;}

function table(headers,rows){if(!rows.length)return '<p class="quiet-note">No records.</p>';return `<table class="depgraph-table"><thead><tr>${headers.map(x=>`<th>${esc(x)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;}

function render(panel){
  const data=read(),summary=continuityAssuranceSummary(data);
  panel.querySelector('#ca-summary').innerHTML=[['Reliance Claims',summary.relianceClaims],['Unqualified supported',summary.supported],['Qualified',summary.qualified],['Unresolved / suspended',summary.unresolved],['Validated constraints',summary.validatedConstraints],['Open reassessments',summary.reassessmentOpen],['Unresolved evidence conflicts',summary.unresolvedEvidenceConflicts]].map(([a,b])=>`<div class="depgraph-metric"><span>${esc(a)}</span><strong>${esc(b)}</strong></div>`).join('');
  const actionSelect=panel.querySelector('#ca-action-select');const prior=actionSelect.value;actionSelect.innerHTML='<option value="">Select Essential Action</option>'+(data.essentialActions||[]).map(a=>`<option value="${esc(a.id)}">${esc(a.label||a.id)}</option>`).join('');if([...actionSelect.options].some(o=>o.value===prior))actionSelect.value=prior;

  const claims=(data.relianceClaims||[]).map(c=>evaluateRelianceClaim(c,data));
  panel.querySelector('#ca-reliance-table').innerHTML=table(['Essential Action','Reliance','Evidence state','Status','Boundary / qualification'],claims.map(x=>[
    esc(x.claim.essentialActionRef),esc([...x.claim.relianceObjectRefs,...x.claim.dependencyRefs].join(', ')||'None recorded'),esc(x.evidenceState),`<strong>${esc(x.effectiveStatus)}</strong>${x.requestedStatus!==x.effectiveStatus?`<br><small>Requested ${esc(x.requestedStatus)}</small>`:''}`,
    `${esc(x.claim.boundary)}${x.claim.qualification?`<br><small>${esc(x.claim.qualification)}</small>`:''}`
  ]));

  const doa=designedObservedAssuredView(data);
  panel.querySelector('#ca-doa').innerHTML=table(['Subject','Designed','Observed','Assured','Comparison'],doa.rows.map(r=>[esc(r.subjectRef),esc(r.DESIGNED.length),esc(r.OBSERVED.length),esc(r.ASSURED.length),esc(r.comparison.join(', ')||'No recorded divergence')]));

  const a=dependencyAccumulationAnalysis(data);
  panel.querySelector('#ca-accumulation').innerHTML=`<div class="depgraph-grid"><div class="depgraph-metric"><span>Breadth</span><strong>${a.breadth.nodeCount} / ${a.breadth.edgeCount}</strong><small>nodes / edges</small></div><div class="depgraph-metric"><span>Recorded depth</span><strong>${a.depth.maximumRecordedDependencyDepth}</strong></div><div class="depgraph-metric"><span>Concentration candidates</span><strong>${a.concentration.length}</strong></div><div class="depgraph-metric"><span>Common dependencies</span><strong>${a.commonality.length}</strong></div><div class="depgraph-metric"><span>Fragmented actions</span><strong>${a.fragmentation.length}</strong></div><div class="depgraph-metric"><span>Opacity</span><strong>${a.opacity.unresolvedEdgeCount+a.opacity.unknownDimensionCount}</strong></div></div><p class="quiet-note">No composite score is calculated. Opacity is epistemic, not a dependency-accumulation score.</p>`;

  const constraints=(data.constraintValidations||[]).map(x=>validateConstrainingDependency(x,data));
  panel.querySelector('#ca-constraints').innerHTML=table(['Dependency','Essential Action','Type','Recorded / effective','Evidence / limitation'],constraints.map(x=>[esc(x.record.candidateDependencyRef),esc(x.record.affectedEssentialActionRef),esc(x.record.constraintType),`${esc(x.record.validationStatus)} / <strong>${esc(x.effectiveValidationStatus)}</strong>`,esc(x.issues.join(' ')||x.record.limitations||'Validated local finding; CIF canonicalization not implied.')]));

  const outcomes=(data.interventionOutcomes||[]).map(x=>evaluateInterventionOutcome(x,data));
  panel.querySelector('#ca-outcomes').innerHTML=table(['Intervention','Action complete','Outcome','Evidence state','Residual exposure'],outcomes.map(x=>[esc(x.record.interventionRef),x.record.actionCompleted?'Yes':'No',esc(x.outcomeStatus),esc(x.evidenceState),esc((x.residualExposure||[]).map(y=>typeof y==='string'?y:y.description||y.type||'Exposure').join(', ')||'None recorded')]));

  panel.querySelector('#ca-reassessments').innerHTML=table(['Trigger','Affected','Targeted scope','Status','Disposition'],(data.reassessmentRecords||[]).map(r=>{const x=targetedReassessmentScope(r,data);return [esc(x.record.trigger),esc(x.record.affectedRef),esc(x.affectedRefs.join(', ')),esc(x.record.status),esc(x.record.disposition||'Open')];}));
  panel.querySelector('#ca-successors').innerHTML=table(['Predecessor','Successor','Status','Gaps','Reassessment'],(data.successorAssuranceRecords||[]).map(r=>{const x=evaluateSuccessorAssurance(r);return [esc(x.record.predecessorRef),esc(x.record.successorRef),`<strong>${esc(x.status)}</strong>`,esc(x.record.unresolvedGaps.join(', ')||'None recorded'),x.requiresReassessment?'Required':'Not required'];}));

  const humanEnabled=data.continuityAssuranceFeatures?.humanCentered===true||(data.humanAgencyReviews||[]).length||(data.graduationRecords||[]).length;
  panel.querySelector('#ca-human').hidden=!humanEnabled;
  if(humanEnabled){const gates=(data.humanAgencyReviews||[]).map(evaluateHumanAgencyGate),grads=(data.graduationRecords||[]).map(evaluateGraduation);panel.querySelector('#ca-human-body').innerHTML=`<h4>Human Agency Gates</h4>${table(['Affected','Status','Unresolved','Authorization'],gates.map(x=>[esc(x.affectedHumanRefs.join(', ')),esc(x.status),esc(x.unresolved.join(', ')||x.unresolvedConflicts.join(', ')||'None'),x.technicalCapabilityCreatesAuthorization?'Yes':'No']))}<h4>Graduation</h4>${table(['Prior support','Proposed support','Status','Re-entry path'],grads.map(x=>[esc(x.priorSupport),esc(x.proposedSupport),esc(x.status),esc(x.reEntryPath)]))}`;}

  const divs=(data.interactionDivergenceRecords||[]).map(interactionDivergence);
  panel.querySelector('#ca-interaction').innerHTML=table(['Reliance Claim','Type','Differences','Material','Trigger'],divs.map(x=>[esc(x.relianceClaimRef),esc(x.subtype),esc(x.differences.map(y=>y.dimension).join(', ')||'None'),x.material?'Yes':'No',esc(x.reassessmentTrigger||'None')]));
}

function mount(){
  const root=document.querySelector('#modernization.modernization-workspace');
  if(!root||root.querySelector('[data-mod-tab="continuity-assurance"]'))return false;
  const tabs=root.querySelector('.modernization-tabs');const dep=root.querySelector('[data-mod-panel="dependency-graph"]');const decision=root.querySelector('[data-mod-panel="decision"]');if(!tabs||(!dep&&!decision))return false;
  const btn=document.createElement('button');btn.type='button';btn.dataset.modTab='continuity-assurance';btn.textContent='Continuity assurance';tabs.append(btn);
  const panel=document.createElement('div');panel.dataset.modPanel='continuity-assurance';panel.hidden=true;panel.innerHTML=html();(dep||decision).insertAdjacentElement('afterend',panel);
  btn.addEventListener('click',()=>{root.querySelectorAll('[data-mod-panel]').forEach(p=>p.hidden=p.dataset.modPanel!=='continuity-assurance');root.querySelectorAll('[data-mod-tab]').forEach(b=>b.classList.toggle('active',b===btn));render(panel);});
  panel.querySelector('#ca-refresh').addEventListener('click',()=>render(panel));
  panel.querySelector('#ca-export').addEventListener('click',()=>download('continuity-assurance-cif-handoff-v0.1.json',continuityAssuranceCifHandoff(read())));
  panel.querySelector('#ca-reliance-form').addEventListener('submit',e=>{e.preventDefault();const data=read(),raw=Object.fromEntries(new FormData(e.currentTarget).entries());raw.relianceObjectRefs=list(raw.relianceObjectRefs);raw.dependencyRefs=list(raw.dependencyRefs);raw.evidenceRefs=list(raw.evidenceRefs);raw.conditions=list(raw.conditions);raw.createdAt=new Date().toISOString();raw.updatedAt=raw.createdAt;data.relianceClaims.push(normalizeRelianceClaim(raw));write(data);e.currentTarget.reset();render(panel);});
  panel.querySelector('#ca-reassessment-form').addEventListener('submit',e=>{e.preventDefault();const data=read(),raw=Object.fromEntries(new FormData(e.currentTarget).entries());raw.evidenceRefs=list(raw.evidenceRefs);raw.createdAt=new Date().toISOString();data.reassessmentRecords.push(normalizeReassessmentRecord(raw));write(data);e.currentTarget.reset();render(panel);});
  window.addEventListener('roi-ea-modernization-data-changed',()=>{if(!panel.hidden)render(panel);});
  return true;
}

let attempts=0;function wait(){if(mount())return;if(attempts++<100)setTimeout(wait,100);}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wait,{once:true});else wait();
