import {
  GRAPH_NODE_TYPES, GRAPH_EDGE_TYPES, DEPENDENCY_DIMENSIONS,
  normalizeGraphNode, normalizeGraphEdge, normalizeContinuityAnchor, normalizeEssentialAction,
  analyzeDependencyGraph, createDependencyGraphSnapshot, compareDependencyGraphSnapshots
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
    .depgraph-edge-label{font:10px system-ui,sans-serif;fill:#617484}
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

  panel.querySelector('#dg-export').addEventListener('click',()=>{
    const data=ensure(read()); const analysis=analyzeDependencyGraph(data,{minimumInbound:3,minimumDependencies:4});
    const payload={exportedAt:new Date().toISOString(),profile:'AIHS-DEPENDENCY-GRAPH-V0.3',...analysis};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}); const a=document.createElement('a');
    a.href=URL.createObjectURL(blob); a.download='dependency-graph-v0.3.json'; a.click(); URL.revokeObjectURL(a.href);
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

  render(panel); return true;
}

function html(){
  const nodeTypes=GRAPH_NODE_TYPES.map(x=>`<option>${esc(x)}</option>`).join('');
  const edgeTypes=GRAPH_EDGE_TYPES.map(x=>`<option>${esc(x)}</option>`).join('');
  const dims=DEPENDENCY_DIMENSIONS.map(x=>`<option>${esc(x)}</option>`).join('');
  return `
  <div class="card">
    <span class="eyebrow">DEPENDENCY GRAPH / V0.3</span>
    <h3>Preserve essential action by making dependencies visible.</h3>
    <p class="quiet-note">This workspace combines existing modernization dependencies with manually recorded, BPMN-derived, and Microsoft Graph-derived structure. Imported structure is evidence, not operating truth. The application does not infer authority, process effectiveness, or organizational accountability from a graph.</p>
  </div>
  <div class="depgraph-grid" id="dg-summary"></div>
  <div class="card depgraph-actions">
    <label>BPMN XML<input id="dg-bpmn-input" type="file" accept=".bpmn,.xml,application/xml,text/xml,application/bpmn+xml"></label>
    <label>Microsoft Graph org JSON<input id="dg-msgraph-input" type="file" accept=".json,application/json"></label>
    <button type="button" id="dg-export">Export analysis JSON</button>
    <button type="button" class="secondary" id="dg-reset">Clear graph enrichment</button>
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
  <div class="card"><h3>Dependency topology</h3><div class="depgraph-svg-wrap"><svg id="dg-svg" class="depgraph-svg" viewBox="0 0 1100 520" role="img" aria-label="Dependency graph visualization"></svg></div></div>
  <div class="two-column-grid">
    <div class="card"><h3>Concentration candidates</h3><div id="dg-concentration"></div></div>
    <div class="card"><h3>Constraining dependency candidates</h3><div id="dg-constraining"></div></div>
  </div>
  <div class="two-column-grid">
    <div class="card"><h3>Fragmentation candidates</h3><div id="dg-fragmentation"></div></div>
    <div class="card"><h3>Graph quality / unresolved structure</h3><div id="dg-issues"></div></div>
  </div>
  <div class="card"><h3>Imported structure</h3><div id="dg-imports"></div></div>`;
}

function render(panel){
  const data=ensure(read()); const analysis=analyzeDependencyGraph(data,{minimumInbound:3,minimumDependencies:4}); const graph=analysis.graph;
  panel.querySelector('#dg-summary').innerHTML=[
    ['Graph nodes',graph.nodes.length],['Graph edges',graph.edges.length],['Continuity Anchors',graph.continuityAnchors.length],['Essential Actions',graph.essentialActions.length],
    ['Concentration candidates',analysis.concentrationCandidates.length],['Constraining candidates',analysis.constrainingDependencyCandidates.length]
  ].map(([l,v])=>`<div class="depgraph-metric"><span>${esc(l)}</span><strong>${esc(v)}</strong></div>`).join('');

  const anchorOpts='<option value="">Select</option>'+graph.continuityAnchors.map(a=>`<option value="${esc(a.id)}">${esc(a.label)}</option>`).join('');
  panel.querySelector('#dg-action-anchor').innerHTML=anchorOpts;
  const nodeOpts='<option value="">Select</option>'+graph.nodes.map(n=>`<option value="${esc(n.id)}">${esc(n.label)} [${esc(n.nodeType)}]</option>`).join('');
  panel.querySelector('#dg-edge-source').innerHTML=nodeOpts; panel.querySelector('#dg-edge-target').innerHTML=nodeOpts;

  panel.querySelector('#dg-anchor-action-list').innerHTML=`<h4>Recorded anchors</h4>${graph.continuityAnchors.length?`<ul>${graph.continuityAnchors.map(a=>`<li><strong>${esc(a.label)}</strong> — ${esc(a.description||'No description')}</li>`).join('')}</ul>`:'<p class="quiet-note">No Continuity Anchors recorded.</p>'}
  <h4>Recorded Essential Actions</h4>${graph.essentialActions.length?`<table class="depgraph-table"><thead><tr><th>Action</th><th>Anchor</th><th>Dependencies</th><th>Fallback / buffer / recovery</th></tr></thead><tbody>${graph.essentialActions.map(a=>`<tr><td><strong>${esc(a.label)}</strong><br><small>Tolerance: ${esc(a.toleranceMinutes??'Not recorded')} min</small></td><td>${esc(graph.continuityAnchors.find(x=>x.id===a.anchorId)?.label||a.anchorId||'Not linked')}</td><td>${esc(a.dependencyNodeIds.join(', ')||'None recorded')}</td><td>${esc(a.fallbackNodeIds.join(', ')||a.bufferDescription||a.recoveryDescription||'None recorded')}</td></tr>`).join('')}</tbody></table>`:'<p class="quiet-note">No Essential Actions recorded.</p>'}`;

  panel.querySelector('#dg-concentration').innerHTML=analysis.concentrationCandidates.length?`<ul>${analysis.concentrationCandidates.map(x=>`<li><strong>${esc(x.node?.label||x.nodeId)}</strong> — ${x.inbound} inbound dependencies</li>`).join('')}</ul>`:'<p class="quiet-note">No concentration candidates at the current threshold (3 inbound dependencies).</p>';
  panel.querySelector('#dg-constraining').innerHTML=analysis.constrainingDependencyCandidates.length?`<ul>${analysis.constrainingDependencyCandidates.map(x=>`<li><strong>${esc(graph.nodes.find(n=>n.id===x.nodeId)?.label||x.nodeId)}</strong> — ${x.unmitigatedActionIds.length} essential action(s) without recorded fallback, buffer, or recovery.</li>`).join('')}</ul>`:'<p class="quiet-note">No candidate constraining dependencies found from recorded Essential Actions.</p>';
  panel.querySelector('#dg-fragmentation').innerHTML=analysis.fragmentationCandidates.length?`<ul>${analysis.fragmentationCandidates.map(x=>`<li><strong>${esc(x.action.label)}</strong> — ${x.action.dependencyNodeIds.length} recorded dependencies; status ${esc(x.status)}.</li>`).join('')}</ul>`:'<p class="quiet-note">No Essential Actions currently cross the fragmentation threshold (4 dependencies).</p>';
  panel.querySelector('#dg-issues').innerHTML=analysis.issues.length?`<ul>${analysis.issues.slice(0,40).map(x=>`<li>${esc(x.message)}</li>`).join('')}</ul>`:'<p>No unresolved graph-edge structure detected.</p>';
  renderSnapshotHistory(panel,data);
  panel.querySelector('#dg-imports').innerHTML=data.dependencyGraphImports.length?`<table class="depgraph-table"><thead><tr><th>Type</th><th>File</th><th>Imported</th><th>Unresolved</th></tr></thead><tbody>${data.dependencyGraphImports.map(x=>`<tr><td>${esc(x.type)}</td><td>${esc(x.fileName)}</td><td>${esc(x.importedAt)}</td><td>${esc(x.unresolved)}</td></tr>`).join('')}</tbody></table>`:'<p class="quiet-note">No BPMN or Microsoft Graph structure imported into the dependency graph yet.</p>';
  renderSvg(panel.querySelector('#dg-svg'),graph);
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

function renderSvg(svg,graph){
  const nodes=(graph.nodes||[]).slice(0,80); const edges=graph.edges||[]; svg.innerHTML='';
  if(!nodes.length){svg.innerHTML='<text x="30" y="50" fill="#617484">No graph nodes recorded.</text>';return;}
  const byId=new Map(nodes.map(n=>[n.id,n]));
  const types=[...new Set(nodes.map(n=>n.nodeType))]; const rows=Math.max(1,types.length); const pos=new Map();
  types.forEach((type,row)=>{
    const group=nodes.filter(n=>n.nodeType===type); const y=55+row*(410/Math.max(1,rows-1||1));
    group.forEach((n,i)=>{const x=80+i*(920/Math.max(1,group.length-1||1));pos.set(n.id,{x,y});});
  });
  const ns='http://www.w3.org/2000/svg';
  for(const e of edges){const a=pos.get(e.sourceId),b=pos.get(e.targetId);if(!a||!b)continue;const line=document.createElementNS(ns,'line');line.setAttribute('x1',a.x);line.setAttribute('y1',a.y);line.setAttribute('x2',b.x);line.setAttribute('y2',b.y);line.setAttribute('class','depgraph-edge');svg.append(line);}
  for(const n of nodes){const p=pos.get(n.id);const g=document.createElementNS(ns,'g');g.setAttribute('class','depgraph-node');const rect=document.createElementNS(ns,'rect');rect.setAttribute('x',p.x-62);rect.setAttribute('y',p.y-20);rect.setAttribute('width','124');rect.setAttribute('height','40');rect.setAttribute('rx','7');const text=document.createElementNS(ns,'text');text.setAttribute('x',p.x);text.setAttribute('y',p.y-2);text.setAttribute('text-anchor','middle');const label=(n.label||n.id).length>18?(n.label||n.id).slice(0,17)+'…':(n.label||n.id);text.textContent=label;const sub=document.createElementNS(ns,'text');sub.setAttribute('x',p.x);sub.setAttribute('y',p.y+12);sub.setAttribute('text-anchor','middle');sub.setAttribute('font-size','9');sub.textContent=n.nodeType;g.append(rect,text,sub);svg.append(g);}
}

let attempts=0;function wait(){if(mount())return;if(attempts++<80)setTimeout(wait,100);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wait,{once:true});else wait();
