import { parseAndValidateBpmn } from './bpmn-import-pipeline.mjs';
import { mapBpmnToFeoaCandidates } from './bpmn-feoa-mapper.mjs';
import { reviewBpmnCandidate } from './bpmn-review.mjs';
import { bpmnCommitConfirmationBinding, commitAcceptedBpmnCandidates } from './bpmn-commit.mjs';
import { exportBpmnImportReport } from './bpmn-import-report.mjs';
import { BPMN_IMPORT_LIMITS, stableJson } from './bpmn-import-model.mjs';
import { buildBpmnDiagramView } from './bpmn-diagram.mjs';
import { evaluateBpmnAssessmentIntake } from './bpmn-assessment-intake.mjs';
import { assessBpmnHandoffs } from './bpmn-assessment-handoff.mjs';
import { assessBpmnObligationsAndControls } from './bpmn-assessment-obligation-control.mjs';
import { assessBpmnBoundedAiCandidates } from './bpmn-assessment-bounded-ai.mjs';

function cell(row, value) { const td = document.createElement('td'); td.textContent = String(value ?? ''); row.append(td); return td; }
function button(label, action, candidateId) { const item = document.createElement('button'); item.type = 'button'; item.textContent = label; item.dataset.bpmnReviewAction = action; item.dataset.candidateId = candidateId; return item; }
function download(name, contents) { const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([contents], { type: 'application/json' })); link.download = name; link.click(); URL.revokeObjectURL(link.href); }
const SVG_NS = 'http://www.w3.org/2000/svg';
function svg(name, attributes = {}) { const node = document.createElementNS(SVG_NS, name); for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value)); return node; }
function nodeShape(node) {
  if (/Gateway$/u.test(node.type)) return svg('polygon', { points: `${node.x + node.width / 2},${node.y} ${node.x + node.width},${node.y + node.height / 2} ${node.x + node.width / 2},${node.y + node.height} ${node.x},${node.y + node.height / 2}`, class: 'bpmn-diagram-node bpmn-diagram-gateway' });
  if (/Event$/u.test(node.type)) return svg('ellipse', { cx: node.x + node.width / 2, cy: node.y + node.height / 2, rx: Math.min(node.width, node.height) / 2, ry: Math.min(node.width, node.height) / 2, class: 'bpmn-diagram-node bpmn-diagram-event' });
  return svg('rect', { x: node.x, y: node.y, width: node.width, height: node.height, rx: 8, class: `bpmn-diagram-node${node.candidateIds.length ? ' bpmn-diagram-candidate' : ''}` });
}
function label(svgRoot, node) {
  const label = svg('text', { x: node.x + node.width / 2, y: node.y + node.height / 2 + 4, class: 'bpmn-diagram-label', 'text-anchor': 'middle' });
  label.textContent = node.label.length > 26 ? `${node.label.slice(0, 23)}…` : node.label;
  svgRoot.append(label);
}
function renderDiagram(model, host, state) {
  if (!host || !state) return;
  host.replaceChildren();
  if (!model) { state.textContent = 'No BPMN source is staged. Visualization is unavailable until a source passes controlled intake.'; return; }
  const diagram = buildBpmnDiagramView(model);
  state.textContent = diagram.layout === 'SOURCE_DI'
    ? 'Read-only source BPMN-DI coordinates are displayed. The diagram is not process execution or validation.'
    : 'Read-only deterministic layout is displayed because the staged source contains no usable BPMN-DI coordinates. The diagram is not process execution or validation.';
  const drawing = svg('svg', { viewBox: `0 0 ${diagram.width} ${diagram.height}`, width: diagram.width, height: diagram.height, role: 'img', 'aria-label': `Read-only BPMN diagram for ${model.source.fileName}` });
  const definitions = svg('defs'); const marker = svg('marker', { id: 'bpmn-diagram-arrow', markerWidth: 8, markerHeight: 8, refX: 7, refY: 4, orient: 'auto' }); marker.append(svg('path', { d: 'M0,0 L8,4 L0,8 Z', class: 'bpmn-diagram-arrowhead' })); definitions.append(marker); drawing.append(definitions);
  const nodes = new Map(diagram.nodes.map((node) => [node.id, node]));
  for (const edge of diagram.edges) { const source = nodes.get(edge.sourceId), target = nodes.get(edge.targetId); if (source && target) drawing.append(svg('line', { x1: source.x + source.width, y1: source.y + source.height / 2, x2: target.x, y2: target.y + target.height / 2, class: 'bpmn-diagram-edge', 'marker-end': 'url(#bpmn-diagram-arrow)' })); }
  for (const node of diagram.nodes) { drawing.append(nodeShape(node)); label(drawing, node); }
  host.append(drawing);
}
function renderIntakeAssessment(model, state, context) {
  if (!state) return;
  if (!model) { state.textContent = 'Gate A is waiting for a staged BPMN source and explicit reviewer context.'; return; }
  const assessment = evaluateBpmnAssessmentIntake(model, context);
  state.textContent = `${assessment.gateLabel}. ${assessment.findings.length} qualified finding${assessment.findings.length === 1 ? '' : 's'}; no authority, compliance, or implementation conclusion is created.`;
}
function inputForHandoff(value, field, handoffId, label) {
  const input = document.createElement('input'); input.type = 'text'; input.maxLength = 512; input.value = value; input.dataset.bpmnHandoffField = field; input.dataset.handoffId = handoffId; input.setAttribute('aria-label', label); return input;
}
function renderHandoffAssessment(model, state, rows, reviewReferences) {
  if (!state || !rows) return;
  rows.replaceChildren();
  if (!model) { state.textContent = 'Gate B is waiting for a controlled staged BPMN source.'; return; }
  const assessment = assessBpmnHandoffs(model, reviewReferences);
  state.textContent = `${assessment.gateLabel}. ${assessment.findings.length} qualified finding${assessment.findings.length === 1 ? '' : 's'}; references remain unverified and do not create authority, receipt, validation, or acceptance.`;
  if (!assessment.handoffs.length) { const row = document.createElement('tr'); cell(row, 'No explicit message-flow handoff is represented in the staged source.').colSpan = 5; rows.append(row); return; }
  for (const handoff of assessment.handoffs) {
    const row = document.createElement('tr');
    cell(row, handoff.sourceMessageFlowId);
    cell(row, `${handoff.sender.participantId || handoff.sender.sourceElementId || 'Unresolved sender'} → ${handoff.intendedRecipient.participantId || handoff.intendedRecipient.sourceElementId || 'Unresolved recipient'}`);
    cell(row, `${handoff.lifecycle.transmission}; receipt ${handoff.lifecycle.receipt}; validation ${handoff.lifecycle.validation}; acceptance ${handoff.lifecycle.accountableAcceptance}`);
    const references = cell(row, ''); const supplied = reviewReferences[handoff.id] || {}; references.append(document.createTextNode('Authority reference'), inputForHandoff(supplied.authorityEnvelopeId || '', 'authorityEnvelopeId', handoff.id, `Authority reference for ${handoff.sourceMessageFlowId}`), document.createElement('br'), document.createTextNode('Evidence references'), inputForHandoff(supplied.evidenceRequirementIds || '', 'evidenceRequirementIds', handoff.id, `Evidence references for ${handoff.sourceMessageFlowId}`));
    cell(row, handoff.findings.map((item) => item.type).join('; ') || 'No unresolved source/link condition'); rows.append(row);
  }
}
function renderObligationControlAssessment(model, state, rows, reviewReferences) {
  if (!state || !rows) return;
  rows.replaceChildren();
  if (!model) { state.textContent = 'Gate C is waiting for a controlled staged BPMN source.'; return; }
  const assessment = assessBpmnObligationsAndControls(model, reviewReferences);
  state.textContent = `${assessment.gateLabel}. ${assessment.findings.length} qualified finding${assessment.findings.length === 1 ? '' : 's'}; references remain unverified and do not determine applicability, effectiveness, compliance, or a violation.`;
  for (const candidate of (model.mappingCandidates || [])) {
    const row = document.createElement('tr'); const supplied = reviewReferences[candidate.candidateId] || {};
    cell(row, candidate.sourceId); cell(row, candidate.candidateType);
    const references = cell(row, ''); references.append(document.createTextNode('Obligation'), inputForHandoff(supplied.obligationIds || '', 'obligationIds', candidate.candidateId, `Potential obligation references for ${candidate.sourceId}`), document.createElement('br'), document.createTextNode('Control'), inputForHandoff(supplied.controlIds || '', 'controlIds', candidate.candidateId, `Control references for ${candidate.sourceId}`), document.createElement('br'), document.createTextNode('Evidence'), inputForHandoff(supplied.evidenceReferenceIds || '', 'evidenceReferenceIds', candidate.candidateId, `Evidence references for ${candidate.sourceId}`));
    const candidateGaps = assessment.gaps.filter((item) => item.sourceCandidateId === candidate.candidateId); cell(row, candidateGaps.map((item) => item.type).join('; ') || 'Review references supplied; qualified review required.'); rows.append(row);
  }
}
function renderBoundedAiAssessment(model, state, rows, reviewReferences) {
  if (!state || !rows) return;
  rows.replaceChildren();
  if (!model) { state.textContent = 'Gate D is waiting for a controlled staged BPMN source.'; return; }
  const assessment = assessBpmnBoundedAiCandidates(model, reviewReferences);
  state.textContent = `${assessment.gateLabel}. ${assessment.findings.length} qualified finding${assessment.findings.length === 1 ? '' : 's'}; support candidates abstain when safeguards are unresolved and always require human disposition.`;
  for (const candidate of (model.mappingCandidates || [])) {
    const row = document.createElement('tr'); const supplied = reviewReferences[candidate.candidateId] || {};
    cell(row, candidate.sourceId); cell(row, candidate.candidateType);
    const proposal = cell(row, ''); proposal.append(document.createTextNode('Task type'), inputForHandoff(supplied.taskType || '', 'taskType', candidate.candidateId, `Bounded support task type for ${candidate.sourceId}`), document.createElement('br'), document.createTextNode('Case 0 / non-AI baseline'), inputForHandoff(supplied.nonAiBaseline || '', 'nonAiBaseline', candidate.candidateId, `Non-AI baseline for ${candidate.sourceId}`), document.createElement('br'), document.createTextNode('Permitted inputs'), inputForHandoff(supplied.permittedInputSummary || '', 'permittedInputSummary', candidate.candidateId, `Permitted inputs for ${candidate.sourceId}`), document.createElement('br'), document.createTextNode('Output'), inputForHandoff(supplied.outputSummary || '', 'outputSummary', candidate.candidateId, `Bounded output for ${candidate.sourceId}`), document.createElement('br'), document.createTextNode('Abstention'), inputForHandoff(supplied.abstentionConditions || '', 'abstentionConditions', candidate.candidateId, `Abstention conditions for ${candidate.sourceId}`), document.createElement('br'), document.createTextNode('Manual fallback'), inputForHandoff(supplied.fallback || '', 'fallback', candidate.candidateId, `Manual fallback for ${candidate.sourceId}`), document.createElement('br'), document.createTextNode('Accountable reviewer'), inputForHandoff(supplied.accountableReviewer || '', 'accountableReviewer', candidate.candidateId, `Accountable reviewer for ${candidate.sourceId}`), document.createElement('br'), document.createTextNode('Assumptions'), inputForHandoff(supplied.assumptionSummary || '', 'assumptionSummary', candidate.candidateId, `Assumptions for ${candidate.sourceId}`));
    const capability = assessment.capabilityCases.find((item) => item.sourceCandidateId === candidate.candidateId); cell(row, capability ? `${capability.finding.type}; ${capability.candidateSupport.taskState}; ${capability.accountableDisposition.state}` : 'No bounded-AI candidate proposed; non-AI path only.'); rows.append(row);
  }
}

export function createBpmnReviewController({ root = document, getWorkspace, setWorkspace, notify = () => {} }) {
  let model = null, commitRecord = null, confirmationBinding = null, handoffReviewReferences = {}, obligationControlReviewReferences = {}, boundedAiReviewReferences = {};
  const find = (selector) => root.querySelector(selector);
  const clearConfirmation = () => {
    confirmationBinding = null;
    const confirmation = find('#bpmn-commit-confirm');
    if (confirmation) confirmation.checked = false;
  };
  const render = () => {
    const state = find('#bpmn-review-state'), rows = find('#bpmn-review-candidates'), diagramHost = find('#bpmn-diagram-canvas'), diagramState = find('#bpmn-diagram-state'), intakeState = find('#bpmn-intake-state'), handoffState = find('#bpmn-handoff-state'), handoffRows = find('#bpmn-handoff-candidates'), obligationControlState = find('#bpmn-obligation-control-state'), obligationControlRows = find('#bpmn-obligation-control-candidates'), boundedAiState = find('#bpmn-bounded-ai-state'), boundedAiRows = find('#bpmn-bounded-ai-candidates');
    if (!state || !rows) return;
    rows.replaceChildren();
    if (!model) { state.textContent = 'No standards-aware BPMN import is staged in this browser session.'; renderDiagram(null, diagramHost, diagramState); renderIntakeAssessment(null, intakeState, {}); renderHandoffAssessment(null, handoffState, handoffRows, {}); renderObligationControlAssessment(null, obligationControlState, obligationControlRows, {}); renderBoundedAiAssessment(null, boundedAiState, boundedAiRows, {}); return; }
    state.textContent = `${model.status}: ${model.elements.length} elements, ${model.mappingCandidates.length} candidates, ${model.diagnostics.length} diagnostics. Source ${model.source.sha256.slice(0, 16)}… remains modeled evidence.`;
    for (const candidate of model.mappingCandidates) {
      const row = document.createElement('tr');
      cell(row, `${candidate.sourceId} (${candidate.sourceBpmnType})`);
      const candidateCell = cell(row, candidate.candidateLabel);
      const label = document.createElement('input'); label.type = 'text'; label.maxLength = 512; label.value = candidate.candidateLabel; label.dataset.candidateLabel = candidate.candidateId; label.setAttribute('aria-label', `Revised label for ${candidate.sourceId}`); candidateCell.append(document.createElement('br'), label);
      cell(row, candidate.qualificationFlags.join('; '));
      cell(row, candidate.disposition);
      const actions = cell(row, '');
      if (!['ACCEPTED', 'REJECTED'].includes(candidate.disposition)) actions.append(button('Accept', 'ACCEPT', candidate.candidateId), button('Revise', 'REVISE', candidate.candidateId), button('Reject', 'REJECT', candidate.candidateId));
      else actions.append(document.createTextNode('Final disposition recorded'));
      rows.append(row);
    }
    const commit = find('#commit-bpmn-review');
    if (commit) commit.disabled = model.status !== 'REVIEWED_COMPLETE';
    const confirmation = find('#bpmn-commit-confirm');
    if (confirmation) confirmation.disabled = model.status !== 'REVIEWED_COMPLETE';
    renderDiagram(model, diagramHost, diagramState);
    renderIntakeAssessment(model, intakeState, { assessmentPurpose: find('#bpmn-assessment-purpose')?.value, customerEndUserScope: find('#bpmn-customer-scope')?.value });
    renderHandoffAssessment(model, handoffState, handoffRows, handoffReviewReferences);
    renderObligationControlAssessment(model, obligationControlState, obligationControlRows, obligationControlReviewReferences);
    renderBoundedAiAssessment(model, boundedAiState, boundedAiRows, boundedAiReviewReferences);
  };
  const stage = async ({ fileName, data, mediaType = '' }) => {
    const parsed = await parseAndValidateBpmn({ fileName, data, mediaType, importedAt: new Date().toISOString() });
    model = await mapBpmnToFeoaCandidates(parsed); commitRecord = null; handoffReviewReferences = {}; obligationControlReviewReferences = {}; boundedAiReviewReferences = {}; clearConfirmation(); render(); return model;
  };
  const review = (candidateId, action) => {
    const reviewer = find('#bpmn-reviewer')?.value || '', note = find('#bpmn-review-note')?.value || '';
    const candidateLabel = find(`[data-candidate-label="${CSS.escape(candidateId)}"]`)?.value;
    model = reviewBpmnCandidate(model, candidateId, { action, reviewer, note, reviewedAt: new Date().toISOString(), candidateLabel });
    clearConfirmation();
    render();
  };
  find('#bpmn-review-candidates')?.addEventListener('click', (event) => { const target = event.target.closest('[data-bpmn-review-action]'); if (!target) return; try { review(target.dataset.candidateId, target.dataset.bpmnReviewAction); notify('BPMN candidate disposition recorded.'); } catch (error) { notify(error.message); } });
  find('#bpmn-commit-confirm')?.addEventListener('change', (event) => {
    confirmationBinding = event.target.checked && model?.status === 'REVIEWED_COMPLETE' ? bpmnCommitConfirmationBinding(model) : null;
  });
  find('#commit-bpmn-review')?.addEventListener('click', () => { try { const confirmed = find('#bpmn-commit-confirm')?.checked === true; const result = commitAcceptedBpmnCandidates(model, getWorkspace(), { confirmed, confirmationBinding, committedBy: find('#bpmn-reviewer')?.value, committedAt: new Date().toISOString() }); setWorkspace(result.workspace); commitRecord = result.commitRecord; clearConfirmation(); render(); notify(`${commitRecord.committed.length} reviewed candidate records committed; ${commitRecord.skipped.length} retained without coercion.`); } catch (error) { notify(error.message); } });
  find('#download-bpmn-report')?.addEventListener('click', () => { if (model) download('roi-ea-bpmn-import-report-v0.1.json', exportBpmnImportReport(model, commitRecord)); });
  find('#download-bpmn-normalized')?.addEventListener('click', () => { if (model) download('roi-ea-bpmn-normalized-v0.1.json', `${stableJson(model)}\n`); });
  find('#bpmn-standards-input')?.addEventListener('change', async (event) => { const file = event.target.files?.[0]; if (!file) return; try { if (file.size > BPMN_IMPORT_LIMITS.maxBytes) throw new Error(`BPMN source exceeds the ${BPMN_IMPORT_LIMITS.maxBytes}-byte controlled limit.`); await stage({ fileName: file.name, data: await file.arrayBuffer(), mediaType: file.type }); notify('BPMN parsed, validated, and staged for human review.'); } catch (error) { notify(`BPMN rejected: ${error.message}`); } finally { event.target.value = ''; } });
  for (const selector of ['#bpmn-assessment-purpose', '#bpmn-customer-scope']) find(selector)?.addEventListener('input', render);
  find('#bpmn-handoff-candidates')?.addEventListener('change', (event) => { const target = event.target.closest('[data-bpmn-handoff-field]'); if (!target) return; const existing = handoffReviewReferences[target.dataset.handoffId] || {}; handoffReviewReferences = { ...handoffReviewReferences, [target.dataset.handoffId]: { ...existing, [target.dataset.bpmnHandoffField]: target.value } }; render(); });
  find('#bpmn-obligation-control-candidates')?.addEventListener('change', (event) => { const target = event.target.closest('[data-bpmn-handoff-field]'); if (!target) return; const existing = obligationControlReviewReferences[target.dataset.handoffId] || {}; obligationControlReviewReferences = { ...obligationControlReviewReferences, [target.dataset.handoffId]: { ...existing, [target.dataset.bpmnHandoffField]: target.value } }; render(); });
  find('#bpmn-bounded-ai-candidates')?.addEventListener('change', (event) => { const target = event.target.closest('[data-bpmn-handoff-field]'); if (!target) return; const existing = boundedAiReviewReferences[target.dataset.handoffId] || {}; boundedAiReviewReferences = { ...boundedAiReviewReferences, [target.dataset.handoffId]: { ...existing, [target.dataset.bpmnHandoffField]: target.value } }; render(); });
  find('#stage-reference-bpmn')?.addEventListener('click', async () => { try { const response = await fetch('assets/North-Star-Mortgage-Workflow-v0.1.bpmn'); if (!response.ok) throw new Error(`Reference BPMN returned ${response.status}.`); await stage({ fileName: 'North-Star-Mortgage-Workflow-v0.1.bpmn', data: await response.arrayBuffer(), mediaType: 'application/bpmn+xml' }); notify('Reference BPMN staged for human review.'); } catch (error) { notify(`BPMN rejected: ${error.message}`); } });
  render();
  return { stage, getModel: () => model, getCommitRecord: () => commitRecord };
}
