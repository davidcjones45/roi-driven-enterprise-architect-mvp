import {
  GRAPH_NODE_TYPES, GRAPH_EDGE_TYPES, DEPENDENCY_DIMENSIONS,
  normalizeGraphNode, normalizeGraphEdge, normalizeContinuityAnchor, normalizeEssentialAction,
  analyzeDependencyGraph, createDependencyGraphSnapshot, compareDependencyGraphSnapshots,
  upsertDependencyFindingReview, normalizeDependencyFindingReview, dependencyFindingToConsultingRecord,
  DEPENDENCY_MITIGATION_TYPES, DEPENDENCY_MITIGATION_STATUSES, normalizeDependencyMitigation,
  previewDependencyMitigation, applyValidatedDependencyMitigation
} from './dependency-graph-model.mjs';
import { parseAndValidateBpmn } from './bpmn-import-pipeline.mjs';
import { bpmnImportToDependencyGraph } from './bpmn-dependency-adapter.mjs';
import { microsoftGraphOrgToDependencyGraph } from './ms-graph-org-adapter.mjs';

const KEY='roi-ea-application-modernization-m1-v0.1';
const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch{return {}}};
const ensure=data=>{
  data.applications||=[]; data.dependencies||=[];
  data.graphNodes||=[]; data.graphEdges||=[];
  data.continuityAnchors||=[]; data.essentialActions||=[];
  data.dependencyGraphImports||=[]; data.dependencyGraphSnapshots||=[];
  return data;
};
const write=data=>{
  localStorage.setItem(KEY,JSON.stringify(data));
  window.dispatchEvent(new CustomEvent('roi-ea-modernization-data-changed',{detail:{key:KEY,source:'dependency-graph-ui.mjs'}}));
};
const list=value=>String(value||'').split(/[;,\n]/).map(v=>v.trim()).filter(Boolean);
const mergeById=(existing,incoming)=>{
  const map=new Map((existing||[]).map(x=>[x.id,x]));
  (incoming||[]).forEach(x=>map.set(x.id,{...map.get(x.id),...x}));
  return [...map.values()];
};

function injectStyles(){
  if(document.querySelector('#dependency-graph-v01-styles'))return;
  const style=document.createElement('style');
  style.id='dependency-graph-v01-styles';
  style.textContent=`
    .depgraph-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}
    .depgraph-metric{border:1px solid #d5dde4;border-radius:8px;padding:12px;background:#fff}
    .depgraph-metric strong{display:block;font-size:1.5rem;margin-top:4px}
    .depgraph-svg-wrap{overflow:auto;border:1px solid #d5dde4;border-radius:8px;background:#fff;min-height:420px}
    .depgraph-svg{min-width:900px;width:100%;height:520px}
    .depgraph-node{cursor:default}
    .depgraph-node rect{fill:#f7fafc;stroke:#45657a;stroke-width:1.3}
    .depgraph-node text{font:12px system-ui,sans-serif;fill:#173247}
    .depgraph-edge{stroke:#8a9daa;stroke-width:1.2;opacity:.75}
    .depgraph-edge.shared-domain{stroke-width:2.3;stroke-dasharray:7 3}
    .depgraph-edge.reviewed-cross-source{stroke-width:2.4}
    .depgraph-edge-label{font:10px system-ui,sans-serif;fill:#617484}
    .depgraph-node.essential-dependency rect{stroke-width:2.2}
    .depgraph-node.constraining-candidate rect{stroke-width:3.2;stroke-dasharray:9 3}
    .depgraph-node.shared-failure-node rect{stroke-dasharray:3 2}
    .depgraph-legend{display:flex;flex-wrap:wrap;gap:12px;margin:8px 0 12px;font-size:.82rem}
    .depgraph-legend span{border:1px solid #c9d4dc;border-radius:999px;padding:3px 8px;background:#fff}
    .depgraph-node.source-bpmn rect{stroke-dasharray:7 3}
    .depgraph-node.source-microsoft-graph rect{stroke-dasharray:2 2}
    .depgraph-node.source-mixed rect{stroke-width:2.4;stroke-dasharray:8 2 2 2}
    .depgraph-provenance-badge{display:inline-block;border:1px solid #b9c8d2;border-radius:999px;padding:2px 7px;margin:2px 4px 2px 0;font-size:.78rem;background:#f8fbfc}
    .depgraph-table{width:100%;border-collapse:collapse}.depgraph-table th,.depgraph-table td{border:1px solid #d5dde4;padding:7px;text-align:left;vertical-align:top}
    .depgraph-table th{background:#eef3f6}
    .depgraph-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
    .depgraph-warning{border-left:4px solid #b67922;padding:9px 12px;background:#fbf6ed}
  `;
  document.head.append(style);
}

function mount(){
  const root=document.querySelector('#modernization.modernization-workspace');
  if(!root||root.querySelector('[data-mod-tab="dependency-graph"]'))return false;
  injectStyles();
  const tabs=root.querySelector('.modernization-tabs');
  const decision=root.querySelector('[data-mod-panel="decision"]');
  if(!tabs||!decision)return false;

  const btn=document.createElement('button');
  btn.type='button'; btn.dataset.modTab='dependency-graph'; btn.textContent='Dependency graph';
  tabs.append(btn);

  const panel=document.createElement('div');
  panel.dataset.modPanel='dependency-graph'; panel.hidden=true; panel.innerHTML=html();
  decision.insertAdjacentElement('afterend',panel);

  btn.addEventListener('click',()=>{
    root.querySelectorAll('[data-mod-panel]').forEach(p=>p.hidden=p.dataset.modPanel!=='dependency-graph');
    root.querySelectorAll('[data-mod-tab]').forEach(b=>b.classList.toggle('active',b===btn));
    render(panel);
  });

  panel.querySelector('#dg-anchor-form').addEventListener('submit',e=>{
    e.preventDefault(); const data=ensure(read());
    const raw=Object.fromEntries(new FormData(e.currentTarget).entries());
    data.continuityAnchors.push(normalizeContinuityAnchor(raw)); write(data); e.currentTarget.reset(); render(panel);
  });

  panel.querySelector('#dg-action-form').addEventListener('submit',e=>{
    e.preventDefault(); const data=ensure(read());
    const raw=Object.fromEntries(new FormData(e.currentTarget).entries());
    raw.dependencyNodeIds=list(raw.dependencyNodeIds); raw.fallbackNodeIds=list(raw.fallbackNodeIds);
    raw.toleranceMinutes=raw.toleranceMinutes===''?null:Number(raw.toleranceMinutes);
    data.essentialActions.push(normalizeEssentialAction(raw)); write(data); e.currentTarget.reset(); render(panel);
  });

  panel.querySelector('#dg-node-form').addEventListener('submit',e=>{
    e.preventDefault(); const data=ensure(read()); const raw=Object.fromEntries(new FormData(e.currentTarget).entries());
    data.graphNodes.push(normalizeGraphNode(raw)); write(data); e.currentTarget.reset(); render(panel);
  });

  panel.querySelector('#dg-edge-form').addEventListener('submit',e=>{
    e.preventDefault(); const data=ensure(read()); const raw=Object.fromEntries(new FormData(e.currentTarget).entries());
    raw.toleranceMinutes=raw.toleranceMinutes===''?null:Number(raw.toleranceMinutes);
    raw.confidence=raw.confidence===''?null:Number(raw.confidence)/100;
    data.graphEdges.push(normalizeGraphEdge(raw)); write(data); e.currentTarget.reset(); render(panel);
  });

  panel.querySelector('#dg-reviewed-cross-source-form').addEventListener('submit',e=>{
    e.preventDefault();
    const data=ensure(read()); const analysis=analyzeDependencyGraph(data,{minimumInbound:3,minimumDependencies:4}); const graph=analysis.graph;
    const raw=Object.fromEntries(new FormData(e.currentTarget).entries());
    const source=graph.nodes.find(n=>n.id===raw.sourceId), target=graph.nodes.find(n=>n.id===raw.targetId);
    if(!source||!target){alert('Select two recorded graph nodes.');return;}
    const sources=n=>[...new Set((n.provenance||[]).map(p=>p.sourceType).filter(Boolean))];
    const a=sources(source), b=sources(target), overlap=b.some(x=>a.includes(x));
    if(!a.length||!b.length||overlap){
      alert('This dedicated form is for explicit relationships between nodes from different recorded sources. Use Manual graph enrichment for same-source relationships.');
      return;
    }
    raw.confidence=raw.confidence===''?null:Number(raw.confidence)/100;
    raw.sourceSystem='Reviewed cross-source';
    raw.reviewState='Reviewed';
    raw.reviewedAt=new Date().toISOString();
    raw.provenance=[{sourceType:'Manual Review',sourceId:`${raw.sourceId}->${raw.targetId}`,sourceReference:raw.sourceReference||''}];
    data.graphEdges.push(normalizeGraphEdge(raw));
    write(data); e.currentTarget.reset(); render(panel);
  });

  panel.querySelector('#dg-bpmn-input').addEventListener('change',async e=>{
    const file=e.target.files?.[0]; if(!file)return;
    try{
      const model=await parseAndValidateBpmn({fileName:file.name,mediaType:file.type,data:await file.arrayBuffer(),importedAt:new Date().toISOString()});
      if(model.status==='REJECTED') throw new Error(model.diagnostics.map(x=>x.message).join(' ')||'BPMN import rejected.');
      const projection=bpmnImportToDependencyGraph(model); const data=ensure(read());
      data.graphNodes=mergeById(data.graphNodes,projection.nodes); data.graphEdges=mergeById(data.graphEdges,projection.edges);
      data.dependencyGraphImports.push({type:'BPMN',importedAt:new Date().toISOString(),fileName:file.name,source:projection.source,unresolved:projection.unresolved.length});
      write(data); render(panel); alert(`BPMN dependency projection imported: ${projection.nodes.length} nodes, ${projection.edges.length} edges, ${projection.unresolved.length} unresolved relationship(s).`);
    }catch(err){alert(`BPMN dependency import failed closed: ${err instanceof Error?err.message:String(err)}`);} finally{e.target.value='';}
  });

  panel.querySelector('#dg-msgraph-input').addEventListener('change',async e=>{
    const file=e.target.files?.[0]; if(!file)return;
    try{
      const payload=JSON.parse(await file.text()); const projection=microsoftGraphOrgToDependencyGraph(payload); const data=ensure(read());
      data.graphNodes=mergeById(data.graphNodes,projection.nodes); data.graphEdges=mergeById(data.graphEdges,projection.edges);
      data.dependencyGraphImports.push({type:'Microsoft Graph',importedAt:new Date().toISOString(),fileName:file.name,source:projection.source,unresolved:projection.unresolved.length});
      write(data); render(panel); alert(`Microsoft Graph organization projection imported: ${projection.nodes.length} people, ${projection.edges.length} reporting relationships, ${projection.unresolved.length} unresolved relationship(s).`);
    }catch(err){alert(`Microsoft Graph import rejected: ${err instanceof Error?err.message:String(err)}`);} finally{e.target.value='';}
  });

  panel.querySelector('#dg-source-filter').addEventListener('change',()=>render(panel));

  panel.querySelector('#dg-export').addEventListener('click',()=>{
    const data=ensure(read()); const analysis=analyzeDependencyGraph(data,{minimumInbound:3,minimumDependencies:4});
    const payload={exportedAt:new Date().toISOString(),profile:'AIHS-DEPENDENCY-GRAPH-V0.8',...analysis};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}); const a=document.createElement('a');
    a.href=URL.createObjectURL(blob); a.download='dependency-graph-v0.8.json'; a.click(); URL.revokeObjectURL(a.href);
  });

  panel.querySelector('#dg-snapshot-create').addEventListener('click',()=>{
    const data=ensure(read());
    const label=panel.querySelector('#dg-snapshot-label').value.trim() || `Dependency graph ${new Date().toLocaleString()}`;
    const note=panel.querySelector('#dg-snapshot-note').value.trim();
    const snapshot=createDependencyGraphSnapshot(data,{label,note,capturedAt:new Date().toISOString()},{minimumInbound:3,minimumDependencies:4});
    data.dependencyGraphSnapshots.push(snapshot); write(data);
    panel.querySelector('#dg-snapshot-label').value=''; panel.querySelector('#dg-snapshot-note').value='';
    render(panel);
  });

  panel.querySelector('#dg-snapshot-compare').addEventListener('click',()=>{
    renderSnapshotComparison(panel);
  });

  panel.querySelector('#dg-snapshot-export').addEventListener('click',()=>{
    const data=ensure(read()); const a=panel.querySelector('#dg-snapshot-prior').value, b=panel.querySelector('#dg-snapshot-current').value;
    const prior=data.dependencyGraphSnapshots.find(x=>x.id===a), current=data.dependencyGraphSnapshots.find(x=>x.id===b);
    if(!prior||!current){ alert('Select two snapshots first.'); return; }
    const payload=compareDependencyGraphSnapshots(prior,current);
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}); const link=document.createElement('a');
    link.href=URL.createObjectURL(blob); link.download='dependency-graph-comparison-v0.1.json'; link.click(); URL.revokeObjectURL(link.href);
  });

  panel.querySelector('#dg-reset').addEventListener('click',()=>{
    if(!confirm('Clear current dependency-graph enrichment, continuity anchors, and essential actions? Existing modernization applications, dependencies, and saved snapshots are preserved.'))return;
    const data=ensure(read()); data.graphNodes=[]; data.graphEdges=[]; data.continuityAnchors=[]; data.essentialActions=[]; data.dependencyGraphImports=[]; write(data); render(panel);
  });


  panel.querySelector('#dg-load-demo').addEventListener('click',()=>{
    const data=ensure(read()); const demo=dependencyDemo();
    data.graphNodes=demo.graphNodes; data.graphEdges=demo.graphEdges;
    data.continuityAnchors=demo.continuityAnchors; data.essentialActions=demo.essentialActions;
    data.dependencyGraphSnapshots=[];
    write(data); render(panel);
    alert('Synthetic dependency diagnostic demo loaded. All findings remain illustrative and advisory.');
  });

  panel.querySelector('#dg-fit-view').addEventListener('click',()=>render(panel));


  panel.querySelector('#dg-finding-review-form').addEventListener('submit',e=>{
    e.preventDefault();
    const data=ensure(read()); const analysis=analyzeDependencyGraph(data,{minimumInbound:3,minimumDependencies:4});
    const raw=Object.fromEntries(new FormData(e.currentTarget).entries());
    const candidate=analysis.findingsSummary.find(x=>x.candidateId===raw.candidateId);
    if(!candidate){alert('Select a current dependency finding candidate.');return;}
    raw.reviewedAt=new Date().toISOString();
    data.dependencyFindingReviews=upsertDependencyFindingReview(data.dependencyFindingReviews,candidate,raw);
    write(data); render(panel);
  });

  panel.querySelector('#dg-promote-finding').addEventListener('click',()=>{
    const data=ensure(read()); const analysis=analyzeDependencyGraph(data,{minimumInbound:3,minimumDependencies:4});
    const candidateId=panel.querySelector('#dg-finding-candidate').value;
    const candidate=analysis.findingsSummary.find(x=>x.candidateId===candidateId);
    const review=(data.dependencyFindingReviews||[]).map(normalizeDependencyFindingReview).find(x=>x.candidateId===candidateId);
    if(!candidate||!review){alert('Record an Accept or Revise disposition first.');return;}
    try{
      const finding=dependencyFindingToConsultingRecord(candidate,review);
      window.dispatchEvent(new CustomEvent('roi-ea-dependency-finding-promote',{detail:{finding,candidate,review}}));
    }catch(error){alert(error.message);}
  });

  panel.querySelector('#dg-export-finding-handoff').addEventListener('click',()=>{
    const data=ensure(read()); const analysis=analyzeDependencyGraph(data,{minimumInbound:3,minimumDependencies:4});
    const candidateId=panel.querySelector('#dg-finding-candidate').value;
    const candidate=analysis.findingsSummary.find(x=>x.candidateId===candidateId);
    const review=(data.dependencyFindingReviews||[]).map(normalizeDependencyFindingReview).find(x=>x.candidateId===candidateId);
    if(!candidate||!review){alert('Record a candidate disposition before export.');return;}
    const payload={profile:'AIHS-DEPENDENCY-FINDING-HANDOFF-V0.1',exportedAt:new Date().toISOString(),candidate,review};
    if(['Accept','Revise'].includes(review.disposition)){
      try{payload.consultingFinding=dependencyFindingToConsultingRecord(candidate,review);}catch{}
    }
    download('dependency-finding-handoff.json',payload);
  });


  panel.querySelector('#dg-preview-mitigation').addEventListener('click',()=>{
    const data=ensure(read()); const form=panel.querySelector('#dg-mitigation-form');
    const raw=Object.fromEntries(new FormData(form).entries());
    raw.confidence=raw.confidence===''?null:Number(raw.confidence)/100;
    raw.estimatedCost=raw.estimatedCost===''?null:Number(raw.estimatedCost);
    if(raw.validatedAt)raw.validatedAt=new Date(raw.validatedAt).toISOString();
    const preview=previewDependencyMitigation(data,raw,{minimumInbound:3,minimumDependencies:4});
    panel.dataset.mitigationPreview=JSON.stringify(preview);
    renderMitigationPreview(panel,preview);
  });

  panel.querySelector('#dg-mitigation-form').addEventListener('submit',e=>{
    e.preventDefault();
    const data=ensure(read()); const raw=Object.fromEntries(new FormData(e.currentTarget).entries());
    raw.confidence=raw.confidence===''?null:Number(raw.confidence)/100;
    raw.estimatedCost=raw.estimatedCost===''?null:Number(raw.estimatedCost);
    if(raw.validatedAt)raw.validatedAt=new Date(raw.validatedAt).toISOString();
    const normalized=normalizeDependencyMitigation(raw);
    data.dependencyMitigations=[...(data.dependencyMitigations||[]).filter(x=>x.id!==normalized.id),normalized];
    write(data); render(panel);
  });

  panel.querySelector('#dg-apply-mitigation').addEventListener('click',()=>{
    const data=ensure(read()); const raw=Object.fromEntries(new FormData(panel.querySelector('#dg-mitigation-form')).entries());
    raw.confidence=raw.confidence===''?null:Number(raw.confidence)/100;
    raw.estimatedCost=raw.estimatedCost===''?null:Number(raw.estimatedCost);
    if(raw.validatedAt)raw.validatedAt=new Date(raw.validatedAt).toISOString();
    try{
      const next=applyValidatedDependencyMitigation(data,raw);
      write(ensure(next)); render(panel);
      alert('Validated mitigation applied to the working dependency graph. This records architecture intent; it does not establish implementation or control effectiveness.');
    }catch(error){alert(error.message);}
  });

  render(panel); return true;
}


function dependencyDemo(){
  return {
    continuityAnchors:[
      {id:'CA-ORDERS',label:'Continue priority-order fulfillment',description:'Synthetic demo continuity anchor',owner:'COO'},
      {id:'CA-CUSTOMER',label:'Maintain customer access',description:'Synthetic demo continuity anchor',owner:'CIO'},
    ],
    essentialActions:[
      {id:'EA-AUTH',label:'Authenticate customers',anchorId:'CA-CUSTOMER',essentiality:'Essential',toleranceMinutes:15,dependencyNodeIds:['DEMO-IDP'],fallbackNodeIds:[],bufferDescription:'',recoveryDescription:''},
      {id:'EA-FULFILL',label:'Release priority orders',anchorId:'CA-ORDERS',essentiality:'Essential',toleranceMinutes:60,dependencyNodeIds:['DEMO-ERP','DEMO-IDP','DEMO-OPS'],fallbackNodeIds:['DEMO-MANUAL'],bufferDescription:'Four-hour approved-order queue',recoveryDescription:'Manual reduced-volume release procedure.'},
      {id:'EA-NOTIFY',label:'Notify customers of material changes',anchorId:'CA-ORDERS',essentiality:'Essential',toleranceMinutes:120,dependencyNodeIds:['DEMO-CRM','DEMO-MSG','DEMO-OPS','DEMO-LEGAL'],fallbackNodeIds:[],bufferDescription:'',recoveryDescription:''},
    ],
    graphNodes:[
      {id:'DEMO-IDP',label:'Enterprise identity provider',nodeType:'external-service',sourceSystem:'Manual',tags:['Synthetic demo']},
      {id:'DEMO-ERP',label:'Order management platform',nodeType:'application',sourceSystem:'Modernization',tags:['Synthetic demo']},
      {id:'DEMO-CRM',label:'Customer CRM',nodeType:'application',sourceSystem:'Modernization',tags:['Synthetic demo']},
      {id:'DEMO-MSG',label:'Messaging gateway',nodeType:'external-service',sourceSystem:'Manual',tags:['Synthetic demo']},
      {id:'DEMO-OPS',label:'Operations analyst role',nodeType:'role',sourceSystem:'Microsoft Graph',tags:['Synthetic demo']},
      {id:'DEMO-LEGAL',label:'Customer-notice review',nodeType:'activity',sourceSystem:'BPMN',tags:['Synthetic demo']},
      {id:'DEMO-MANUAL',label:'Manual reduced-volume procedure',nodeType:'process',sourceSystem:'Manual',tags:['Synthetic demo']},
    ],
    graphEdges:[
      {id:'DEMO-E1',sourceId:'DEMO-ERP',targetId:'DEMO-IDP',edgeType:'depends-on',dimension:'technical',criticality:'Mission critical',sharedFailureDomain:'PRIMARY-CLOUD-REGION',reviewState:'Reviewed',reviewer:'Synthetic reviewer',reviewedAt:'2026-09-27T12:00:00.000Z',reviewNote:'Illustrative reviewed edge',evidenceRefs:['DEMO-EVD-1'],sourceSystem:'Reviewed cross-source'},
      {id:'DEMO-E2',sourceId:'DEMO-CRM',targetId:'DEMO-IDP',edgeType:'depends-on',dimension:'technical',criticality:'High',sharedFailureDomain:'PRIMARY-CLOUD-REGION',sourceSystem:'Manual'},
      {id:'DEMO-E3',sourceId:'DEMO-MSG',targetId:'DEMO-IDP',edgeType:'depends-on',dimension:'technical',criticality:'High',sharedFailureDomain:'PRIMARY-CLOUD-REGION',sourceSystem:'Manual'},
      {id:'DEMO-E4',sourceId:'DEMO-OPS',targetId:'DEMO-ERP',edgeType:'uses-service',dimension:'human',sourceSystem:'Manual'},
      {id:'DEMO-E5',sourceId:'DEMO-LEGAL',targetId:'DEMO-CRM',edgeType:'depends-on',dimension:'process',reviewState:'Reviewed',reviewer:'Synthetic reviewer',reviewedAt:'2026-09-27T12:00:00.000Z',reviewNote:'Illustrative BPMN-to-application relationship',evidenceRefs:['DEMO-EVD-2'],sourceSystem:'Reviewed cross-source'},
      {id:'DEMO-E6',sourceId:'DEMO-OPS',targetId:'DEMO-MSG',edgeType:'uses-service',dimension:'human',sourceSystem:'Manual'},
    ]
  };
}

function html(){
  const nodeTypes=GRAPH_NODE_TYPES.map(x=>`<option>${esc(x)}</option>`).join('');
  const edgeTypes=GRAPH_EDGE_TYPES.map(x=>`<option>${esc(x)}</option>`).join('');
  const dims=DEPENDENCY_DIMENSIONS.map(x=>`<option>${esc(x)}</option>`).join('');
  return `
  <div class="card">
    <span class="eyebrow">DEPENDENCY GRAPH / V0.8</span>
    <h3>Preserve essential action by making dependencies visible.</h3>
    <p class="quiet-note">This workspace combines existing modernization dependencies with manually recorded, BPMN-derived, and Microsoft Graph-derived structure. Imported structure is evidence, not operating truth. The application does not infer authority, process effectiveness, or organizational accountability from a graph.</p>
  </div>
  <div class="depgraph-grid" id="dg-summary"></div>
  <div class="card depgraph-actions">
    <label>BPMN XML<input id="dg-bpmn-input" type="file" accept=".bpmn,.xml,application/xml,text/xml,application/bpmn+xml"></label>
    <label>Microsoft Graph org JSON<input id="dg-msgraph-input" type="file" accept=".json,application/json"></label>
    <button type="button" id="dg-export">Export analysis JSON</button>
    <button type="button" class="secondary" id="dg-load-demo">Load synthetic dependency demo</button>
    <button type="button" class="secondary" id="dg-fit-view">Fit graph to view</button>
    <button type="button" class="secondary" id="dg-reset">Clear graph enrichment</button>
  </div>
  <div class="card">
    <span class="eyebrow">CROSS-SOURCE VIEW / V0.1</span>
    <h3>Provenance-aware graph merge</h3>
    <p class="quiet-note">BPMN, Microsoft Graph, modernization records, and manual enrichment remain distinguishable after they are combined. Source identity is evidence context, not proof of correctness or authority.</p>
    <div class="depgraph-grid">
      <label>Visualization source filter<select id="dg-source-filter"><option value="">All recorded sources</option></select></label>
      <div id="dg-source-summary"></div>
    </div>
    <div class="two-column-grid">
      <div><h4>Cross-source connections</h4><div id="dg-cross-source"></div></div>
      <div><h4>Multi-source records</h4><div id="dg-multi-source"></div></div>
    </div>
    <details><summary><strong>Add reviewed cross-source relationship</strong></summary>
      <p class="quiet-note">Use only when evidence supports a relationship between nodes originating from different recorded sources. This records human review; it does not infer authority or operating truth.</p>
      <form id="dg-reviewed-cross-source-form" class="form-grid">
        <label>Source node<select required name="sourceId" id="dg-cross-source-source"></select></label>
        <label>Target node<select required name="targetId" id="dg-cross-source-target"></select></label>
        <label>Relationship<select name="edgeType">${edgeTypes}</select></label>
        <label>Dimension<select name="dimension">${dims}</select></label>
        <label>Reviewer<input required name="reviewer" placeholder="Named consultant or accountable reviewer"></label>
        <label>Confidence (0-100)<input type="number" min="0" max="100" name="confidence"></label>
        <label>Shared failure domain<input name="sharedFailureDomain" placeholder="Only if supported by evidence"></label>
        <label>Source reference<input name="sourceReference" placeholder="Interview, document, controlled ID"></label>
        <label class="full">Evidence references<input required name="evidenceRefs" placeholder="EVD-001; source record"></label>
        <label class="full">Review note<textarea required name="reviewNote" rows="2" placeholder="Why the relationship is supported and its limitations"></textarea></label>
        <div class="full"><button type="submit">Record reviewed cross-source edge</button></div>
      </form>
      <div id="dg-reviewed-cross-source"></div>
    </details>
  </div>
  <details class="card"><summary><strong>Continuity Anchors & Essential Actions</strong></summary>
    <div class="two-column-grid">
      <form id="dg-anchor-form" class="form-grid">
        <label>Continuity Anchor name<input required name="label" placeholder="e.g. Critical patient care"></label>
        <label>Owner<input name="owner"></label>
        <label class="full">Description<textarea name="description" rows="2"></textarea></label>
        <label class="full">Evidence references<input name="evidenceRefs" placeholder="EVD-001; source document"></label>
        <div class="full"><button type="submit">Add Continuity Anchor</button></div>
      </form>
      <form id="dg-action-form" class="form-grid">
        <label>Essential Action<input required name="label" placeholder="e.g. Maintain ICU monitoring"></label>
        <label>Continuity Anchor<select name="anchorId" id="dg-action-anchor"></select></label>
        <label>Owner<input name="owner"></label>
        <label>Tolerance (minutes)<input type="number" min="0" name="toleranceMinutes"></label>
        <label class="full">Dependency node IDs<input name="dependencyNodeIds" placeholder="GRID; IDP; VENDOR-X"></label>
        <label class="full">Fallback node IDs<input name="fallbackNodeIds" placeholder="GENERATOR; MANUAL-PROCEDURE"></label>
        <label class="full">Buffer / reserve<textarea name="bufferDescription" rows="2"></textarea></label>
        <label class="full">Recovery path<textarea name="recoveryDescription" rows="2"></textarea></label>
        <div class="full"><button type="submit">Add Essential Action</button></div>
      </form>
    </div>
    <div id="dg-anchor-action-list"></div>
  </details>
  <details class="card"><summary><strong>Manual graph enrichment</strong></summary>
    <div class="two-column-grid">
      <form id="dg-node-form" class="form-grid">
        <label>Node label<input required name="label"></label><label>Type<select name="nodeType">${nodeTypes}</select></label>
        <label>Owner<input name="owner"></label><label>Source<input name="sourceReference"></label>
        <label class="full">Description<textarea name="description" rows="2"></textarea></label>
        <div class="full"><button type="submit">Add graph node</button></div>
      </form>
      <form id="dg-edge-form" class="form-grid">
        <label>Source node<select required name="sourceId" id="dg-edge-source"></select></label><label>Target node<select required name="targetId" id="dg-edge-target"></select></label>
        <label>Relationship<select name="edgeType">${edgeTypes}</select></label><label>Dimension<select name="dimension">${dims}</select></label>
        <label>Criticality<select name="criticality"><option>Unknown</option><option>Low</option><option>Moderate</option><option>High</option><option>Mission critical</option></select></label>
        <label>Confidence (0-100)<input type="number" min="0" max="100" name="confidence"></label>
        <label>Tolerance (minutes)<input type="number" min="0" name="toleranceMinutes"></label><label>Shared failure domain<input name="sharedFailureDomain"></label>
        <label class="full">Failure impact<textarea name="failureImpact" rows="2"></textarea></label>
        <div class="full"><button type="submit">Add graph edge</button></div>
      </form>
    </div>
  </details>
  <div class="card">
    <span class="eyebrow">GRAPH HISTORY / V0.1</span>
    <h3>Persist and compare dependency states</h3>
    <p class="quiet-note">Snapshots preserve the recorded graph and candidate analysis at a point in time. A changed graph is a reassessment signal, not proof of increased or reduced risk.</p>
    <div class="depgraph-grid">
      <label>Snapshot label<input id="dg-snapshot-label" placeholder="e.g. Pre-modernization baseline"></label>
      <label>Note<input id="dg-snapshot-note" placeholder="Reason for capture or material change"></label>
    </div>
    <div class="depgraph-actions"><button type="button" id="dg-snapshot-create">Capture snapshot</button></div>
    <div id="dg-snapshot-history"></div>
    <div class="depgraph-grid">
      <label>Prior snapshot<select id="dg-snapshot-prior"></select></label>
      <label>Current snapshot<select id="dg-snapshot-current"></select></label>
    </div>
    <div class="depgraph-actions"><button type="button" id="dg-snapshot-compare">Compare snapshots</button><button type="button" class="secondary" id="dg-snapshot-export">Export comparison JSON</button></div>
    <div id="dg-snapshot-comparison"></div>
  </div>
  <div class="card"><h3>Dependency topology</h3>
    <p class="quiet-note">Diagnostic emphasis is derived from recorded Essential Actions, candidate constraining dependencies, reviewed cross-source relationships, and shared failure domains. It remains advisory.</p>
    <div class="depgraph-legend"><span>Thick border: Essential Action dependency</span><span>Dashed heavy border: candidate constraining dependency</span><span>Dotted border: shared failure-domain node</span><span>Heavy edge: reviewed cross-source relationship</span></div>
    <div class="form-grid"><label>Node focus<select id="dg-node-focus"><option value="">All nodes</option></select></label></div>
    <div class="depgraph-svg-wrap"><svg id="dg-svg" class="depgraph-svg" viewBox="0 0 1100 520" role="img" aria-label="Dependency graph visualization"></svg></div>
    <h4>Essential Action dependency coverage</h4><div id="dg-essential-coverage"></div>
  </div>
  <div class="two-column-grid">
    <div class="card"><h3>Concentration candidates</h3><div id="dg-concentration"></div></div>
    <div class="card"><h3>Constraining dependency candidates</h3><div id="dg-constraining"></div></div>
  </div>
  <div class="two-column-grid">
    <div class="card"><h3>Fragmentation candidates</h3><div id="dg-fragmentation"></div></div>
    <div class="card"><h3>Shared failure-domain candidates</h3><div id="dg-shared-failure"></div></div>
  </div>
  <div class="card"><h3>Consulting findings summary</h3><p class="quiet-note">Review candidates derived from recorded structure; not final findings, risk ratings, or recommendations.</p><div id="dg-findings"></div></div>
  <div class="card"><h3>Candidate review & handoff</h3>
    <p class="quiet-note">Disposition is a consultant action. Accepted/revised candidates may be handed to the existing local Consulting Findings register when a consulting engagement is open; otherwise export the handoff JSON.</p>
    <form id="dg-finding-review-form" class="form-grid">
      <label>Candidate<select required name="candidateId" id="dg-finding-candidate"></select></label>
      <label>Disposition<select required name="disposition"><option>Pending review</option><option>Accept</option><option>Revise</option><option>Reject</option><option>Defer</option></select></label>
      <label>Reviewer<input required name="reviewer" placeholder="Named consultant"></label>
      <label>Finding owner<input name="owner" placeholder="Required for promotion"></label>
      <label>Severity<select name="severity"><option>Observation</option><option>Low</option><option selected>Moderate</option><option>High</option><option>Decision-critical</option></select></label>
      <label>Decision impact<select name="decisionImpact"><option>Informational</option><option selected>Material</option><option>Decision-blocking</option></select></label>
      <label class="full">Required action<textarea name="requiredAction" rows="2" placeholder="Required for promotion"></textarea></label>
      <label class="full">Revised statement<textarea name="revisedStatement" rows="2" placeholder="Use when disposition is Revise"></textarea></label>
      <label class="full">Review note<textarea required name="note" rows="2" placeholder="Basis, evidence, and limitations of the disposition"></textarea></label>
      <div class="full"><button type="submit">Record disposition</button> <button type="button" class="secondary" id="dg-promote-finding">Send accepted/revised finding to Consulting register</button> <button type="button" class="secondary" id="dg-export-finding-handoff">Export finding handoff JSON</button></div>
    </form>
    <div id="dg-finding-reviews"></div>
  </div>
  <div class="card"><h3>Dependency mitigation scenario</h3>
    <p class="quiet-note">Model candidate buffers, redundancy, substitution, fallback, coordination, or recovery before changing the working graph. Scenario output is structural evidence only; it does not prove feasibility, implementation, control effectiveness, or reduced risk.</p>
    <form id="dg-mitigation-form" class="form-grid">
      <label>Target type<select name="targetType"><option>Essential Action</option><option>Dependency Node</option></select></label>
      <label>Target<select required name="targetId" id="dg-mitigation-target"></select></label>
      <label>Mitigation type<select required name="type">${DEPENDENCY_MITIGATION_TYPES.map(x=>`<option>${x}</option>`).join('')}</select></label>
      <label>Status<select required name="status">${DEPENDENCY_MITIGATION_STATUSES.map(x=>`<option>${x}</option>`).join('')}</select></label>
      <label>Owner<input required name="owner"></label>
      <label>Replacement / fallback node<select name="replacementNodeId" id="dg-mitigation-replacement"></select></label>
      <label>Confidence (0-100)<input type="number" min="0" max="100" name="confidence"></label>
      <label>Estimated cost<input type="number" min="0" step="0.01" name="estimatedCost"></label>
      <label>Estimated effort<input name="estimatedEffort" placeholder="e.g. 2 weeks"></label>
      <label>Linked dependency finding<input name="linkedFindingCandidateId" placeholder="Optional DGF-..."></label>
      <label class="full">Description<textarea required name="description" rows="2"></textarea></label>
      <label class="full">Expected effect<textarea name="expectedEffect" rows="2"></textarea></label>
      <label class="full">Evidence references<input name="evidenceRefs" placeholder="EVD-001; source record"></label>
      <label class="full">Source reference<input name="sourceReference"></label>
      <label>Validated by<input name="validatedBy"></label>
      <label>Validated at<input type="datetime-local" name="validatedAt"></label>
      <label class="full">Notes<textarea name="notes" rows="2"></textarea></label>
      <div class="full"><button type="button" id="dg-preview-mitigation">Preview structural scenario</button> <button type="submit">Save mitigation record</button> <button type="button" class="secondary" id="dg-apply-mitigation">Apply validated mitigation to working graph</button></div>
    </form>
    <div id="dg-mitigation-preview"></div>
    <div id="dg-mitigation-records"></div>
  </div>
  <div class="two-column-grid">
    <div class="card"><h3>Graph quality / unresolved structure</h3><div id="dg-issues"></div></div>
    <div class="card"><h3>Imported structure</h3><div id="dg-imports"></div></div>
  </div>`;
}


function renderMitigationPreview(panel,preview){
  const target=panel.querySelector('#dg-mitigation-preview');
  if(!preview){target.innerHTML='<p class="quiet-note">No mitigation scenario previewed.</p>';return;}
  if(!preview.valid){
    target.innerHTML=`<div class="federated-caveat"><strong>Scenario cannot be evaluated.</strong><ul>${preview.issues.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`;
    return;
  }
  const e=preview.structuralEffect;
  target.innerHTML=`<h4>Structural scenario preview</h4>
    <p><strong>Candidate constraining dependencies:</strong> ${e.constrainingCandidatesBefore} → ${e.constrainingCandidatesAfter}</p>
    <p><strong>Relieved candidate nodes:</strong> ${esc(e.relievedCandidateNodeIds.join(', ')||'None')}</p>
    <p><strong>New candidate nodes:</strong> ${esc(e.newCandidateNodeIds.join(', ')||'None')}</p>
    <p class="quiet-note">${esc(e.interpretation)}</p>`;
}

function render(panel){
  const data=ensure(read()); const analysis=analyzeDependencyGraph(data,{minimumInbound:3,minimumDependencies:4}); const graph=analysis.graph;
  panel.querySelector('#dg-summary').innerHTML=[
    ['Graph nodes',graph.nodes.length],['Graph edges',graph.edges.length],['Continuity Anchors',graph.continuityAnchors.length],['Essential Actions',graph.essentialActions.length],
    ['Concentration candidates',analysis.concentrationCandidates.length],['Constraining candidates',analysis.constrainingDependencyCandidates.length]
  ].map(([l,v])=>`<div class="depgraph-metric"><span>${esc(l)}</span><strong>${esc(v)}</strong></div>`).join('');

  const sourceFilter=panel.querySelector('#dg-source-filter');
  const priorSource=sourceFilter.value;
  const sourceTypes=analysis.sourceSummary.map(x=>x.sourceType);
  sourceFilter.innerHTML='<option value="">All recorded sources</option>'+sourceTypes.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');
  if(sourceTypes.includes(priorSource))sourceFilter.value=priorSource;
  panel.querySelector('#dg-source-summary').innerHTML=analysis.sourceSummary.length
    ? analysis.sourceSummary.map(x=>`<span class="depgraph-provenance-badge">${esc(x.sourceType)}: ${x.nodes} nodes / ${x.edges} edges</span>`).join('')
    : '<span class="quiet-note">No source provenance recorded.</span>';
  panel.querySelector('#dg-cross-source').innerHTML=analysis.crossSourceConnections.length
    ? `<ul>${analysis.crossSourceConnections.slice(0,30).map(x=>`<li><strong>${esc(x.sourceId)}</strong> → <strong>${esc(x.targetId)}</strong><br><small>${esc(x.sourceSources.join(', '))} → ${esc(x.targetSources.join(', '))} · ${esc(x.dimension)}</small></li>`).join('')}</ul>`
    : '<p class="quiet-note">No explicit cross-source edges recorded. Add a reviewed edge between imported structures when the relationship is supported by evidence.</p>';
  panel.querySelector('#dg-multi-source').innerHTML=analysis.multiSourceNodes.length
    ? `<ul>${analysis.multiSourceNodes.slice(0,30).map(x=>`<li><strong>${esc(x.node.label||x.node.id)}</strong> — ${esc(x.sources.join(', '))}</li>`).join('')}</ul>`
    : '<p class="quiet-note">No node currently carries provenance from more than one source.</p>';

  const anchorOpts='<option value="">Select</option>'+graph.continuityAnchors.map(a=>`<option value="${esc(a.id)}">${esc(a.label)}</option>`).join('');
  panel.querySelector('#dg-action-anchor').innerHTML=anchorOpts;
  const nodeOpts='<option value="">Select</option>'+graph.nodes.map(n=>`<option value="${esc(n.id)}">${esc(n.label)} [${esc(n.nodeType)}]</option>`).join('');
  panel.querySelector('#dg-edge-source').innerHTML=nodeOpts; panel.querySelector('#dg-edge-target').innerHTML=nodeOpts;
  panel.querySelector('#dg-cross-source-source').innerHTML=nodeOpts; panel.querySelector('#dg-cross-source-target').innerHTML=nodeOpts;
  panel.querySelector('#dg-reviewed-cross-source').innerHTML=analysis.reviewedCrossSourceConnections.length
    ? `<h4>Reviewed cross-source relationships</h4><table class="depgraph-table"><thead><tr><th>Relationship</th><th>Sources</th><th>Reviewer</th><th>Evidence / note</th></tr></thead><tbody>${analysis.reviewedCrossSourceConnections.map(x=>`<tr><td><strong>${esc(x.sourceId)}</strong> → <strong>${esc(x.targetId)}</strong><br><small>${esc(x.edgeType)} · ${esc(x.dimension)}</small></td><td>${esc(x.sourceSources.join(', '))} → ${esc(x.targetSources.join(', '))}</td><td>${esc(x.reviewer||'Not recorded')}<br><small>${esc(x.reviewedAt||'')}</small></td><td>${esc(x.evidenceRefs.join(', ')||'No evidence reference')}<br><small>${esc(x.reviewNote||'No review note')}</small></td></tr>`).join('')}</tbody></table>`
    : '<p class="quiet-note">No explicitly reviewed cross-source relationships recorded.</p>';

  panel.querySelector('#dg-anchor-action-list').innerHTML=`<h4>Recorded anchors</h4>${graph.continuityAnchors.length?`<ul>${graph.continuityAnchors.map(a=>`<li><strong>${esc(a.label)}</strong> — ${esc(a.description||'No description')}</li>`).join('')}</ul>`:'<p class="quiet-note">No Continuity Anchors recorded.</p>'}
  <h4>Recorded Essential Actions</h4>${graph.essentialActions.length?`<table class="depgraph-table"><thead><tr><th>Action</th><th>Anchor</th><th>Dependencies</th><th>Fallback / buffer / recovery</th></tr></thead><tbody>${graph.essentialActions.map(a=>`<tr><td><strong>${esc(a.label)}</strong><br><small>Tolerance: ${esc(a.toleranceMinutes??'Not recorded')} min</small></td><td>${esc(graph.continuityAnchors.find(x=>x.id===a.anchorId)?.label||a.anchorId||'Not linked')}</td><td>${esc(a.dependencyNodeIds.join(', ')||'None recorded')}</td><td>${esc(a.fallbackNodeIds.join(', ')||a.bufferDescription||a.recoveryDescription||'None recorded')}</td></tr>`).join('')}</tbody></table>`:'<p class="quiet-note">No Essential Actions recorded.</p>'}`;

  panel.querySelector('#dg-concentration').innerHTML=analysis.concentrationCandidates.length?`<ul>${analysis.concentrationCandidates.map(x=>`<li><strong>${esc(x.node?.label||x.nodeId)}</strong> — ${x.inbound} inbound dependencies</li>`).join('')}</ul>`:'<p class="quiet-note">No concentration candidates at the current threshold (3 inbound dependencies).</p>';
  panel.querySelector('#dg-constraining').innerHTML=analysis.constrainingDependencyCandidates.length?`<ul>${analysis.constrainingDependencyCandidates.map(x=>`<li><strong>${esc(graph.nodes.find(n=>n.id===x.nodeId)?.label||x.nodeId)}</strong> — ${x.unmitigatedActionIds.length} essential action(s) without recorded fallback, buffer, or recovery.</li>`).join('')}</ul>`:'<p class="quiet-note">No candidate constraining dependencies found from recorded Essential Actions.</p>';
  panel.querySelector('#dg-fragmentation').innerHTML=analysis.fragmentationCandidates.length?`<ul>${analysis.fragmentationCandidates.map(x=>`<li><strong>${esc(x.action.label)}</strong> — ${x.action.dependencyNodeIds.length} recorded dependencies; status ${esc(x.status)}.</li>`).join('')}</ul>`:'<p class="quiet-note">No Essential Actions currently cross the fragmentation threshold (4 dependencies).</p>';
  panel.querySelector('#dg-shared-failure').innerHTML=analysis.sharedFailureDomainCandidates.length?`<ul>${analysis.sharedFailureDomainCandidates.map(x=>`<li><strong>${esc(x.domain)}</strong> — ${x.edgeIds.length} dependency edges, ${x.nodeIds.length} nodes${x.essentialActionIds.length?`, ${x.essentialActionIds.length} Essential Action(s)`:''}.<br><small>${esc(x.dimensions.join(', '))}</small></li>`).join('')}</ul>`:'<p class="quiet-note">No shared failure-domain candidates recorded. Populate shared failure domains only when supported by evidence.</p>';
  panel.querySelector('#dg-issues').innerHTML=analysis.issues.length?`<ul>${analysis.issues.slice(0,40).map(x=>`<li>${esc(x.message)}</li>`).join('')}</ul>`:'<p>No unresolved graph-edge structure detected.</p>';
  panel.querySelector('#dg-findings').innerHTML=analysis.findingsSummary.length
    ? `<table class="depgraph-table"><thead><tr><th>Candidate</th><th>Subject</th><th>Statement</th><th>Limitation</th></tr></thead><tbody>${analysis.findingsSummary.map(x=>`<tr><td><strong>${esc(x.type)}</strong><br><small>${esc(x.severity)}</small></td><td>${esc(x.subjectId)}</td><td>${esc(x.statement)}</td><td>${esc(x.limitation)}</td></tr>`).join('')}</tbody></table>`
    : '<p class="quiet-note">No structural review candidates are currently derived from the recorded graph.</p>';
  const candidateSelect=panel.querySelector('#dg-finding-candidate'), priorCandidate=candidateSelect.value;
  candidateSelect.innerHTML='<option value="">Select candidate</option>'+analysis.findingsSummary.map(x=>`<option value="${esc(x.candidateId)}">${esc(x.type)} · ${esc(x.subjectId)}</option>`).join('');
  if(analysis.findingsSummary.some(x=>x.candidateId===priorCandidate))candidateSelect.value=priorCandidate;
  const reviewMap=new Map((data.dependencyFindingReviews||[]).map(x=>[x.candidateId||x.id,normalizeDependencyFindingReview(x)]));
  panel.querySelector('#dg-finding-reviews').innerHTML=reviewMap.size
    ? `<table class="depgraph-table"><thead><tr><th>Candidate</th><th>Disposition</th><th>Reviewer</th><th>Owner / action</th><th>Note</th></tr></thead><tbody>${[...reviewMap.values()].map(x=>`<tr><td>${esc(x.candidateId)}</td><td><strong>${esc(x.disposition)}</strong><br><small>${esc(x.severity)} / ${esc(x.decisionImpact)}</small></td><td>${esc(x.reviewer||'Not recorded')}<br><small>${esc(x.reviewedAt||'')}</small></td><td>${esc(x.owner||'Not recorded')}<br><small>${esc(x.requiredAction||'No required action')}</small></td><td>${esc(x.note||'No note')}</td></tr>`).join('')}</tbody></table>`
    : '<p class="quiet-note">No dependency finding candidate dispositions recorded.</p>';
  panel.querySelector('#dg-essential-coverage').innerHTML=analysis.essentialDependencyCoverage.length
    ? `<table class="depgraph-table"><thead><tr><th>Continuity Anchor</th><th>Essential Action</th><th>Dependency</th><th>Mitigation recorded</th><th>Tolerance</th></tr></thead><tbody>${analysis.essentialDependencyCoverage.map(x=>`<tr><td>${esc(x.anchorLabel)}</td><td>${esc(x.actionLabel)}</td><td><strong>${esc(x.node?.label||x.nodeId)}</strong><br><small>${esc(x.node?.nodeType||'Missing node')}</small></td><td>${x.mitigated?'Yes':'No'}${x.fallbackNodeIds.length?`<br><small>Fallback: ${esc(x.fallbackNodeIds.join(', '))}</small>`:''}</td><td>${esc(x.toleranceMinutes??'Not recorded')}</td></tr>`).join('')}</tbody></table>`
    : '<p class="quiet-note">No Essential Action dependency coverage is recorded yet.</p>';

  const mitigationTarget=panel.querySelector('#dg-mitigation-target');
  const mitigationReplacement=panel.querySelector('#dg-mitigation-replacement');
  const targetType=panel.querySelector('#dg-mitigation-form [name="targetType"]').value;
  const priorMitigationTarget=mitigationTarget.value, priorReplacement=mitigationReplacement.value;
  const targetOptions=targetType==='Dependency Node'
    ? graph.nodes.map(n=>`<option value="${esc(n.id)}">${esc(n.label)} [${esc(n.nodeType)}]</option>`).join('')
    : graph.essentialActions.map(a=>`<option value="${esc(a.id)}">${esc(a.label)}</option>`).join('');
  mitigationTarget.innerHTML='<option value="">Select target</option>'+targetOptions;
  if([...mitigationTarget.options].some(o=>o.value===priorMitigationTarget))mitigationTarget.value=priorMitigationTarget;
  mitigationReplacement.innerHTML='<option value="">Select when required</option>'+graph.nodes.map(n=>`<option value="${esc(n.id)}">${esc(n.label)} [${esc(n.nodeType)}]</option>`).join('');
  if([...mitigationReplacement.options].some(o=>o.value===priorReplacement))mitigationReplacement.value=priorReplacement;
  panel.querySelector('#dg-mitigation-form [name="targetType"]').onchange=()=>render(panel);

  const mitigations=(data.dependencyMitigations||[]).map(normalizeDependencyMitigation);
  panel.querySelector('#dg-mitigation-records').innerHTML=mitigations.length
    ? `<h4>Recorded mitigation candidates</h4><table class="depgraph-table"><thead><tr><th>Mitigation</th><th>Target</th><th>Status</th><th>Owner</th><th>Evidence</th></tr></thead><tbody>${mitigations.map(m=>`<tr><td><strong>${esc(m.type)}</strong><br><small>${esc(m.description)}</small></td><td>${esc(m.targetType)} · ${esc(m.targetId)}</td><td>${esc(m.status)}<br><small>${esc(m.validatedBy||'Not validated')}</small></td><td>${esc(m.owner||'Not recorded')}</td><td>${esc(m.evidenceRefs.join(', ')||m.sourceReference||'None recorded')}</td></tr>`).join('')}</tbody></table>`
    : '<p class="quiet-note">No dependency mitigation candidates recorded.</p>';
  let mitigationPreview=null;
  try{mitigationPreview=panel.dataset.mitigationPreview?JSON.parse(panel.dataset.mitigationPreview):null;}catch{}
  renderMitigationPreview(panel,mitigationPreview);

  renderSnapshotHistory(panel,data);
  panel.querySelector('#dg-imports').innerHTML=data.dependencyGraphImports.length?`<table class="depgraph-table"><thead><tr><th>Type</th><th>File</th><th>Imported</th><th>Unresolved</th></tr></thead><tbody>${data.dependencyGraphImports.map(x=>`<tr><td>${esc(x.type)}</td><td>${esc(x.fileName)}</td><td>${esc(x.importedAt)}</td><td>${esc(x.unresolved)}</td></tr>`).join('')}</tbody></table>`:'<p class="quiet-note">No BPMN or Microsoft Graph structure imported into the dependency graph yet.</p>';
  const focus=panel.querySelector('#dg-node-focus'); const priorFocus=focus.value;
  focus.innerHTML='<option value="">All nodes</option>'+graph.nodes.map(n=>`<option value="${esc(n.id)}">${esc(n.label)}</option>`).join('');
  if(graph.nodes.some(n=>n.id===priorFocus))focus.value=priorFocus;
  focus.onchange=()=>renderSvg(panel.querySelector('#dg-svg'),graph,sourceFilter.value,analysis,focus.value);
  renderSvg(panel.querySelector('#dg-svg'),graph,sourceFilter.value,analysis,focus.value);
}

function renderSnapshotHistory(panel,data){
  const snapshots=data.dependencyGraphSnapshots||[];
  const history=panel.querySelector('#dg-snapshot-history');
  history.innerHTML=snapshots.length?`<table class="depgraph-table"><thead><tr><th>Snapshot</th><th>Captured</th><th>Nodes / edges</th><th>Candidate findings</th></tr></thead><tbody>${snapshots.map(s=>`<tr><td><strong>${esc(s.label)}</strong><br><small>${esc(s.note||'No note')}</small></td><td>${esc(s.capturedAt)}</td><td>${s.graph?.nodes?.length||0} / ${s.graph?.edges?.length||0}</td><td>Concentration ${s.analysis?.concentrationCandidates?.length||0}; constraining ${s.analysis?.constrainingDependencyCandidates?.length||0}; fragmentation ${s.analysis?.fragmentationCandidates?.length||0}</td></tr>`).join('')}</tbody></table>`:'<p class="quiet-note">No dependency graph snapshots captured.</p>';
  const options='<option value="">Select</option>'+snapshots.map(s=>`<option value="${esc(s.id)}">${esc(s.label)} — ${esc(s.capturedAt)}</option>`).join('');
  const prior=panel.querySelector('#dg-snapshot-prior'), current=panel.querySelector('#dg-snapshot-current');
  const priorValue=prior.value, currentValue=current.value;
  prior.innerHTML=options; current.innerHTML=options;
  if(snapshots.some(s=>s.id===priorValue))prior.value=priorValue; else if(snapshots.length>1)prior.value=snapshots.at(-2).id;
  if(snapshots.some(s=>s.id===currentValue))current.value=currentValue; else if(snapshots.length)current.value=snapshots.at(-1).id;
  renderSnapshotComparison(panel);
}

function renderSnapshotComparison(panel){
  const data=ensure(read()); const target=panel.querySelector('#dg-snapshot-comparison');
  const prior=data.dependencyGraphSnapshots.find(x=>x.id===panel.querySelector('#dg-snapshot-prior').value);
  const current=data.dependencyGraphSnapshots.find(x=>x.id===panel.querySelector('#dg-snapshot-current').value);
  if(!prior||!current){target.innerHTML='<p class="quiet-note">Capture and select two snapshots to compare dependency change.</p>';return;}
  if(prior.id===current.id){target.innerHTML='<p class="quiet-note">Select two different snapshots.</p>';return;}
  const c=compareDependencyGraphSnapshots(prior,current);
  const changed=c.recordChanges;
  const listIds=ids=>ids.length?esc(ids.join(', ')):'None';
  target.innerHTML=`<div class="depgraph-warning"><strong>Reassessment signal only.</strong> Graph changes and candidate findings require human interpretation against Continuity Anchors and Essential Actions.</div>
    <div class="depgraph-grid">
      <div class="depgraph-metric"><span>Node delta</span><strong>${esc(c.accumulation.nodeDelta)}</strong></div>
      <div class="depgraph-metric"><span>Edge delta</span><strong>${esc(c.accumulation.edgeDelta)}</strong></div>
      <div class="depgraph-metric"><span>New concentration</span><strong>${c.newlyConcentratedNodeIds.length}</strong></div>
      <div class="depgraph-metric"><span>New constraining</span><strong>${c.newlyConstrainingNodeIds.length}</strong></div>
    </div>
    <table class="depgraph-table"><thead><tr><th>Change</th><th>Added</th><th>Removed / relieved</th><th>Changed</th></tr></thead><tbody>
      <tr><td>Nodes</td><td>${listIds(changed.nodes.added)}</td><td>${listIds(changed.nodes.removed)}</td><td>${listIds(changed.nodes.changed)}</td></tr>
      <tr><td>Edges</td><td>${listIds(changed.edges.added)}</td><td>${listIds(changed.edges.removed)}</td><td>${listIds(changed.edges.changed)}</td></tr>
      <tr><td>Concentration candidates</td><td>${listIds(c.newlyConcentratedNodeIds)}</td><td>${listIds(c.concentrationRelievedNodeIds)}</td><td>Not applicable</td></tr>
      <tr><td>Constraining candidates</td><td>${listIds(c.newlyConstrainingNodeIds)}</td><td>${listIds(c.constrainingRelievedNodeIds)}</td><td>Not applicable</td></tr>
      <tr><td>Fragmentation candidates</td><td>${listIds(c.newlyFragmentedActionIds)}</td><td>${listIds(c.fragmentationRelievedActionIds)}</td><td>Not applicable</td></tr>
    </tbody></table>`;
}

function renderSvg(svg,graph,sourceFilter='',analysis={},focusNodeId=''){
  const provenanceSources=n=>[...new Set((n.provenance||[]).map(p=>p.sourceType).filter(Boolean))];
  const sourceMatch=n=>!sourceFilter || provenanceSources(n).includes(sourceFilter) || n.sourceSystem===sourceFilter;
  const sourceNodes=(graph.nodes||[]).filter(sourceMatch);
  let nodes=sourceNodes;
  if(focusNodeId){
    const neighborIds=new Set([focusNodeId]);
    for(const e of graph.edges||[]){
      if(e.sourceId===focusNodeId)neighborIds.add(e.targetId);
      if(e.targetId===focusNodeId)neighborIds.add(e.sourceId);
    }
    nodes=sourceNodes.filter(n=>neighborIds.has(n.id));
  }
  nodes=nodes.slice(0,80);
  const visibleIds=new Set(nodes.map(n=>n.id));
  const edges=(graph.edges||[]).filter(e=>visibleIds.has(e.sourceId)&&visibleIds.has(e.targetId));
  const constrainingIds=new Set((analysis.constrainingDependencyCandidates||[]).map(x=>x.nodeId));
  const essentialDependencyIds=new Set((graph.essentialActions||[]).flatMap(a=>a.dependencyNodeIds||[]));
  const sharedFailureNodeIds=new Set((analysis.sharedFailureDomainCandidates||[]).flatMap(x=>x.nodeIds||[]));
  const reviewedCrossSourceEdgeIds=new Set((analysis.reviewedCrossSourceConnections||[]).map(x=>x.edgeId));
  const coverageByNode=new Map();
  for(const row of analysis.essentialDependencyCoverage||[]){
    if(!coverageByNode.has(row.nodeId))coverageByNode.set(row.nodeId,[]);
    coverageByNode.get(row.nodeId).push(row);
  }
  svg.innerHTML='';
  if(!nodes.length){svg.innerHTML='<text x="30" y="50" fill="#617484">No graph nodes match the current source filter.</text>';return;}
  const types=[...new Set(nodes.map(n=>n.nodeType))]; const rows=Math.max(1,types.length); const pos=new Map();
  types.forEach((type,row)=>{
    const group=nodes.filter(n=>n.nodeType===type); const y=55+row*(410/Math.max(1,rows-1||1));
    group.forEach((n,i)=>{const x=80+i*(920/Math.max(1,group.length-1||1));pos.set(n.id,{x,y});});
  });
  const ns='http://www.w3.org/2000/svg';
  for(const e of edges){
    const a=pos.get(e.sourceId),b=pos.get(e.targetId);if(!a||!b)continue;
    const line=document.createElementNS(ns,'line');line.setAttribute('x1',a.x);line.setAttribute('y1',a.y);line.setAttribute('x2',b.x);line.setAttribute('y2',b.y);
    line.setAttribute('class',`depgraph-edge${e.sharedFailureDomain?' shared-domain':''}${reviewedCrossSourceEdgeIds.has(e.id)?' reviewed-cross-source':''}`);
    const edgeTitle=[];
    if(e.sharedFailureDomain)edgeTitle.push(`Shared failure domain: ${e.sharedFailureDomain}`);
    if(reviewedCrossSourceEdgeIds.has(e.id))edgeTitle.push(`Reviewed cross-source relationship by ${e.reviewer||'recorded reviewer'}`);
    if(edgeTitle.length){const title=document.createElementNS(ns,'title');title.textContent=edgeTitle.join('\n');line.append(title);}
    svg.append(line);
  }
  for(const n of nodes){
    const p=pos.get(n.id);const g=document.createElementNS(ns,'g');
    const sources=provenanceSources(n); const sourceClass=(sources.length>1?'mixed':(sources[0]||n.sourceSystem||'unknown')).toLowerCase().replace(/[^a-z0-9]+/g,'-');
    const emphasis=[
      essentialDependencyIds.has(n.id)?'essential-dependency':'',
      constrainingIds.has(n.id)?'constraining-candidate':'',
      sharedFailureNodeIds.has(n.id)?'shared-failure-node':'',
    ].filter(Boolean).join(' ');
    g.setAttribute('class',`depgraph-node source-${sourceClass}${emphasis?` ${emphasis}`:''}`);
    const rect=document.createElementNS(ns,'rect');rect.setAttribute('x',p.x-68);rect.setAttribute('y',p.y-25);rect.setAttribute('width','136');rect.setAttribute('height','50');rect.setAttribute('rx','7');
    const text=document.createElementNS(ns,'text');text.setAttribute('x',p.x);text.setAttribute('y',p.y-7);text.setAttribute('text-anchor','middle');const label=(n.label||n.id).length>18?(n.label||n.id).slice(0,17)+'…':(n.label||n.id);text.textContent=label;
    const sub=document.createElementNS(ns,'text');sub.setAttribute('x',p.x);sub.setAttribute('y',p.y+6);sub.setAttribute('text-anchor','middle');sub.setAttribute('font-size','9');sub.textContent=n.nodeType;
    const prov=document.createElementNS(ns,'text');prov.setAttribute('x',p.x);prov.setAttribute('y',p.y+18);prov.setAttribute('text-anchor','middle');prov.setAttribute('font-size','8');const provText=(sources.length?sources:[n.sourceSystem||'Unknown']).join('+');prov.textContent=provText.length>22?provText.slice(0,21)+'…':provText;
    const title=document.createElementNS(ns,'title');
    const coverage=(coverageByNode.get(n.id)||[]).map(x=>`${x.anchorLabel} / ${x.actionLabel}${x.mitigated?' (mitigation recorded)':' (no mitigation recorded)'}`);
    title.textContent=`${n.label||n.id}\nType: ${n.nodeType}\nSource: ${(sources.length?sources:[n.sourceSystem||'Unknown']).join(', ')}\nReference: ${n.sourceReference||'Not recorded'}${coverage.length?`\nEssential Action coverage:\n- ${coverage.join('\n- ')}`:''}${constrainingIds.has(n.id)?'\nCandidate constraining dependency: human validation required':''}`;
    g.append(rect,text,sub,prov,title);svg.append(g);
  }
}

let attempts=0;function wait(){if(mount())return;if(attempts++<80)setTimeout(wait,100);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wait,{once:true});else wait();
