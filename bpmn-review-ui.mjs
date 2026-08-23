import { parseAndValidateBpmn } from './bpmn-import-pipeline.mjs';
import { mapBpmnToFeoaCandidates } from './bpmn-feoa-mapper.mjs';
import { reviewBpmnCandidate } from './bpmn-review.mjs';
import { commitAcceptedBpmnCandidates } from './bpmn-commit.mjs';
import { exportBpmnImportReport } from './bpmn-import-report.mjs';
import { stableJson } from './bpmn-import-model.mjs';

function cell(row, value) { const td = document.createElement('td'); td.textContent = String(value ?? ''); row.append(td); return td; }
function button(label, action, candidateId) { const item = document.createElement('button'); item.type = 'button'; item.textContent = label; item.dataset.bpmnReviewAction = action; item.dataset.candidateId = candidateId; return item; }
function download(name, contents) { const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([contents], { type: 'application/json' })); link.download = name; link.click(); URL.revokeObjectURL(link.href); }

export function createBpmnReviewController({ root = document, getWorkspace, setWorkspace, notify = () => {} }) {
  let model = null, commitRecord = null;
  const find = (selector) => root.querySelector(selector);
  const render = () => {
    const state = find('#bpmn-review-state'), rows = find('#bpmn-review-candidates');
    if (!state || !rows) return;
    rows.replaceChildren();
    if (!model) { state.textContent = 'No standards-aware BPMN import is staged in this browser session.'; return; }
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
  };
  const stage = async ({ fileName, data, mediaType = '' }) => {
    const parsed = await parseAndValidateBpmn({ fileName, data, mediaType, importedAt: new Date().toISOString() });
    model = await mapBpmnToFeoaCandidates(parsed); commitRecord = null; render(); return model;
  };
  const review = (candidateId, action) => {
    const reviewer = find('#bpmn-reviewer')?.value || '', note = find('#bpmn-review-note')?.value || '';
    const candidateLabel = find(`[data-candidate-label="${CSS.escape(candidateId)}"]`)?.value;
    model = reviewBpmnCandidate(model, candidateId, { action, reviewer, note, reviewedAt: new Date().toISOString(), candidateLabel });
    render();
  };
  find('#bpmn-review-candidates')?.addEventListener('click', (event) => { const target = event.target.closest('[data-bpmn-review-action]'); if (!target) return; try { review(target.dataset.candidateId, target.dataset.bpmnReviewAction); notify('BPMN candidate disposition recorded.'); } catch (error) { notify(error.message); } });
  find('#commit-bpmn-review')?.addEventListener('click', () => { try { const confirmed = find('#bpmn-commit-confirm')?.checked === true; const result = commitAcceptedBpmnCandidates(model, getWorkspace(), { confirmed, committedBy: find('#bpmn-reviewer')?.value, committedAt: new Date().toISOString() }); setWorkspace(result.workspace); commitRecord = result.commitRecord; render(); notify(`${commitRecord.committed.length} reviewed candidate records committed; ${commitRecord.skipped.length} retained without coercion.`); } catch (error) { notify(error.message); } });
  find('#download-bpmn-report')?.addEventListener('click', () => { if (model) download('roi-ea-bpmn-import-report-v0.1.json', exportBpmnImportReport(model, commitRecord)); });
  find('#download-bpmn-normalized')?.addEventListener('click', () => { if (model) download('roi-ea-bpmn-normalized-v0.1.json', `${stableJson(model)}\n`); });
  find('#bpmn-standards-input')?.addEventListener('change', async (event) => { const file = event.target.files?.[0]; if (!file) return; try { await stage({ fileName: file.name, data: await file.arrayBuffer(), mediaType: file.type }); notify('BPMN parsed, validated, and staged for human review.'); } catch (error) { notify(`BPMN rejected: ${error.message}`); } finally { event.target.value = ''; } });
  find('#stage-reference-bpmn')?.addEventListener('click', async () => { try { const response = await fetch('assets/North-Star-Mortgage-Workflow-v0.1.bpmn'); if (!response.ok) throw new Error(`Reference BPMN returned ${response.status}.`); await stage({ fileName: 'North-Star-Mortgage-Workflow-v0.1.bpmn', data: await response.arrayBuffer(), mediaType: 'application/bpmn+xml' }); notify('Reference BPMN staged for human review.'); } catch (error) { notify(`BPMN rejected: ${error.message}`); } });
  render();
  return { stage, getModel: () => model, getCommitRecord: () => commitRecord };
}
