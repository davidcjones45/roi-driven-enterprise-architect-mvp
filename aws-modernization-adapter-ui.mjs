// M2 AWS adapter UI.
// Adds an AWS Evidence tab to the existing M1 modernization workspace.
import {
  importAwsRecommendationJson, importAwsDiscoveryCsv,
  discoveryEvidenceSummary, proposalFromAwsRecommendation
} from './aws-modernization-adapter.mjs';

const KEY='roi-ea-application-modernization-m1-v0.1';
const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const pct=v=>v===null||v===undefined?'Not supplied':`${Math.round(Number(v)*100)}%`;
const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch{return {}}};
const write=data=>localStorage.setItem(KEY,JSON.stringify(data));

function ensureShape(data){
  data.applications ||= [];
  data.constraints ||= [];
  data.alternatives ||= [];
  data.assessments ||= [];
  data.providerAssessments ||= [];
  data.providerImports ||= [];
  data.awsDiscoveryImports ||= [];
  return data;
}

function mount(){
  const root=document.querySelector('#modernization.modernization-workspace');
  if(!root || root.querySelector('[data-mod-tab="aws-evidence"]')) return false;

  const tabs=root.querySelector('.modernization-tabs');
  const decision=root.querySelector('[data-mod-panel="decision"]');
  if(!tabs||!decision) return false;

  const button=document.createElement('button');
  button.type='button';
  button.dataset.modTab='aws-evidence';
  button.textContent='AWS evidence';
  tabs.append(button);

  const panel=document.createElement('div');
  panel.dataset.modPanel='aws-evidence';
  panel.hidden=true;
  panel.innerHTML=`
    <div class="card">
      <span class="eyebrow">M2 / AWS PROVIDER ADAPTER</span>
      <h3>Import AWS evidence without converting it into enterprise authority.</h3>
      <p class="quiet-note">Supported M2 inputs: AWS Migration Hub Strategy Recommendations-style JSON/API records and individual AWS Application Discovery / Migration Hub CSV exports. AWS Transform recommendations may be recorded as provider evidence, but M2 does not claim to parse AWS Transform HTML/PDF/PPTX reports.</p>
    </div>

    <form id="aws-rec-import-form" class="form-grid card">
      <label>Source system
        <select name="sourceSystem">
          <option>AWS Migration Hub Strategy Recommendations</option>
          <option>AWS Transform</option>
          <option>Other AWS assessment</option>
        </select>
      </label>
      <label>Source reference<input name="sourceReference" placeholder="Report ID, API call, file name, or controlled reference"></label>
      <label class="full">Recommendation JSON<textarea required name="json" rows="10" placeholder='{"recommendations":[{"applicationId":"APP-...","strategy":"Replatform","targetDestination":"Amazon Elastic Container Service (ECS)"}]}'></textarea></label>
      <div class="form-actions full"><button type="submit">Import recommendation evidence</button></div>
    </form>

    <form id="aws-csv-import-form" class="form-grid card">
      <label class="full">AWS discovery CSV<input required type="file" name="file" accept=".csv,text/csv"></label>
      <p class="quiet-note full">Import the individual CSV files from the AWS discovery export. M2 stores the raw rows as discovery evidence; it does not infer unsupported architecture facts.</p>
      <div class="form-actions full"><button type="submit">Import discovery evidence</button></div>
    </form>

    <div class="card" id="aws-import-summary"></div>
    <div class="card evidence-table-wrap">
      <h3>Provider recommendation evidence</h3>
      <div class="table-scroll"><table class="evidence-table"><thead><tr><th>Application</th><th>AWS strategy</th><th>Canonical mapping</th><th>Destination/tool</th><th>Confidence</th><th>Status</th><th>Action</th></tr></thead><tbody id="aws-rec-rows"></tbody></table></div>
    </div>
    <div class="card evidence-table-wrap">
      <h3>Discovery evidence imports</h3>
      <div class="table-scroll"><table class="evidence-table"><thead><tr><th>File</th><th>Recognized type</th><th>Rows</th><th>Warnings</th></tr></thead><tbody id="aws-discovery-rows"></tbody></table></div>
    </div>`;

  decision.insertAdjacentElement('afterend',panel);

  button.addEventListener('click',()=>{
    root.querySelectorAll('[data-mod-panel]').forEach(p=>p.hidden=p.dataset.modPanel!=='aws-evidence');
    root.querySelectorAll('[data-mod-tab]').forEach(b=>b.classList.toggle('active',b===button));
    render(panel);
  });

  panel.querySelector('#aws-rec-import-form').addEventListener('submit',e=>{
    e.preventDefault();
    const form=Object.fromEntries(new FormData(e.currentTarget).entries());
    let result;
    try{
      result=importAwsRecommendationJson(form.json,{
        sourceSystem:form.sourceSystem,
        sourceReference:form.sourceReference
      });
    }catch(error){
      alert(`AWS recommendation JSON could not be parsed: ${error.message}`);
      return;
    }
    const data=ensureShape(read());
    data.providerImports.push({
      id:`AWSIMP-${Date.now()}`,provider:'AWS',sourceSystem:result.sourceSystem,
      sourceReference:result.sourceReference,importedAt:result.importedAt,
      recommendationIds:result.recommendations.map(x=>x.id),warnings:result.warnings
    });
    const byId=new Map((data.providerAssessments||[]).map(x=>[x.id,x]));
    result.recommendations.forEach(x=>byId.set(x.id,x));
    data.providerAssessments=[...byId.values()];
    for(const rec of result.recommendations){
      const a=data.assessments.find(x=>x.applicationId===rec.applicationId);
      if(a) a.providerAssessmentRefs=[...new Set([...(a.providerAssessmentRefs||[]),rec.id])];
    }
    write(data);
    e.currentTarget.reset();
    render(panel);
  });

  panel.querySelector('#aws-csv-import-form').addEventListener('submit',async e=>{
    e.preventDefault();
    const file=e.currentTarget.elements.file.files?.[0];
    if(!file) return;
    const text=await file.text();
    const result=importAwsDiscoveryCsv(file.name,text);
    const data=ensureShape(read());
    data.awsDiscoveryImports.push(result);
    write(data);
    e.currentTarget.reset();
    render(panel);
  });

  panel.addEventListener('click',e=>{
    const id=e.target?.dataset?.createAwsAlternative;
    if(!id) return;
    const data=ensureShape(read());
    const rec=data.providerAssessments.find(x=>x.id===id);
    if(!rec) return;
    const proposal=proposalFromAwsRecommendation(rec);
    if(!proposal){ alert('This recommendation cannot be mapped to a candidate alternative because application or strategy mapping is missing.'); return; }
    if(!data.applications.some(x=>x.id===proposal.applicationId)){
      alert(`No local application matches ${proposal.applicationId}. Link or create the application before creating an alternative.`);
      return;
    }
    if(!data.alternatives.some(x=>x.id===proposal.id)) data.alternatives.push(proposal);
    let assessment=data.assessments.find(x=>x.applicationId===proposal.applicationId);
    if(assessment){
      assessment.candidateAlternativeIds=[...new Set([...(assessment.candidateAlternativeIds||[]),proposal.id])];
      assessment.providerAssessmentRefs=[...new Set([...(assessment.providerAssessmentRefs||[]),rec.id])];
    }
    write(data);
    render(panel);
    alert('Created an AWS-derived candidate alternative. It remains provider evidence and requires human review.');
  });

  render(panel);
  return true;
}

function render(panel){
  const data=ensureShape(read());
  const summary=discoveryEvidenceSummary(data.awsDiscoveryImports||[]);
  panel.querySelector('#aws-import-summary').innerHTML=`
    <h3>AWS evidence status</h3>
    <p><strong>${data.providerAssessments.length}</strong> recommendation records ·
       <strong>${summary.files}</strong> recognized discovery files ·
       <strong>${summary.records}</strong> discovery rows.</p>
    <p class="quiet-note">No imported AWS record grants implementation authority. Missing confidence remains missing rather than being converted to zero.</p>`;

  panel.querySelector('#aws-rec-rows').innerHTML=(data.providerAssessments||[]).filter(x=>x.provider==='AWS').map(r=>`
    <tr>
      <td>${esc(r.applicationId||'Unresolved')}</td>
      <td>${esc(r.strategy||'Not supplied')}</td>
      <td>${esc(r.canonicalStrategy||'Unmapped')}</td>
      <td>${esc(r.targetDestination||'Not supplied')}<br><small>${esc(r.transformationTool||'No tool supplied')}</small></td>
      <td>${esc(pct(r.confidence))}</td>
      <td>${esc(r.status||'Advisory evidence only')}</td>
      <td><button type="button" class="secondary" data-create-aws-alternative="${esc(r.id)}">Create candidate</button></td>
    </tr>`).join('')||'<tr><td colspan="7">No AWS recommendation evidence imported.</td></tr>';

  panel.querySelector('#aws-discovery-rows').innerHTML=(data.awsDiscoveryImports||[]).map(x=>`
    <tr><td>${esc(x.filename)}</td><td>${esc(x.fileType)}</td><td>${esc(x.records?.length||0)}</td><td>${esc((x.warnings||[]).join('; ')||'None')}</td></tr>`
  ).join('')||'<tr><td colspan="4">No AWS discovery evidence imported.</td></tr>';
}

let attempts=0;
function waitForM1(){
  if(mount()) return;
  if(attempts++<50) setTimeout(waitForM1,100);
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',waitForM1,{once:true});
else waitForM1();
