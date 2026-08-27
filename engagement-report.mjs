import { normalizeDiscovery } from './discovery-model.mjs';
import { aiNecessityAssessment, normalizeAiNecessity } from './ai-necessity-model.mjs';
import { evidenceSummary, normalizeEngagementEvidence } from './engagement-evidence-model.mjs';
import { findingsSummary, normalizeFinding, normalizeOpenQuestion } from './findings-model.mjs';
import { normalizeRecommendation } from './recommendation-model.mjs';

const text = value => String(value ?? '').trim();
const esc = value => text(value || 'Not supplied').replace(/[&<>"']/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[character]);
const statement = (discovery, section, field) => discovery?.[section]?.[field] || { value:'', state:'Unknown', source:'' };
const statementValue = (discovery, section, field) => text(statement(discovery, section, field).value) || 'Not supplied';
const statementTrace = (discovery, section, field) => { const item = statement(discovery, section, field); return `${text(item.state) || 'Unknown'}${text(item.source) ? `; source: ${text(item.source)}` : '; source not supplied'}`; };
const table = rows => `<table>${rows.map(([label, value]) => `<tr><th>${esc(label)}</th><td>${esc(value)}</td></tr>`).join('')}</table>`;
const list = (items, empty) => items.length ? `<ul>${items.map(item => `<li>${esc(item)}</li>`).join('')}</ul>` : `<p class="muted">${esc(empty)}</p>`;

export function buildExecutiveDecisionPackage(engagement = {}, { applicationVersion = 'roi-ea-local-consulting-v0.1', generatedAt = new Date().toISOString() } = {}) {
  const discovery = normalizeDiscovery(engagement.discovery || {});
  const ai = normalizeAiNecessity(engagement.ai_necessity || {});
  const aiAssessment = aiNecessityAssessment(ai);
  const recommendation = normalizeRecommendation(engagement.recommendation || {});
  const evidence = (engagement.evidence_register || []).map(normalizeEngagementEvidence);
  const findings = (engagement.findings_register || []).map(normalizeFinding);
  const questions = (engagement.open_questions_register || []).map(normalizeOpenQuestion);
  const evidenceStats = evidenceSummary(evidence);
  const findingStats = findingsSummary(findings, questions);
  const unresolvedFindings = findings.filter(item => !['Resolved', 'Deferred'].includes(item.status));
  const unresolvedQuestions = questions.filter(item => !['Resolved', 'Deferred', 'Unable to resolve'].includes(item.status));
  const regulatoryEvidence = evidence.filter(item => item.evidence_type === 'Regulatory reference');
  const evidenceDates = evidence.map(item => item.received_or_observed_date).filter(Boolean).sort();

  return {
    report_type: 'AI Investment, Architecture & Governance Diagnostic',
    report_model_version: 'fedarm-executive-package-v0.1',
    generated_at: generatedAt,
    application_version: applicationVersion,
    engagement_id: text(engagement.engagement_id),
    title: `${text(engagement.client_name) || 'Client'} - ${text(engagement.initiative_name) || 'Initiative'} diagnostic`,
    recommendation: recommendation.recommendation || 'NOT YET RECORDED',
    sections: {
      executive_summary: {
        initiative: text(engagement.initiative_name) || 'Not supplied',
        decision_question: text(engagement.decision_question) || 'Not supplied',
        recommendation: recommendation.recommendation || 'NOT YET RECORDED',
        principal_reason: recommendation.rationale || 'No consultant recommendation rationale has been recorded.',
        major_condition: recommendation.conditions || 'No consultant recommendation conditions have been recorded.'
      },
      scope: {
        client: text(engagement.client_name) || 'Not supplied', initiative: text(engagement.initiative_name) || 'Not supplied',
        in_scope: text(engagement.scope) || 'Not supplied', out_of_scope: text(engagement.out_of_scope) || 'Not supplied',
        period_reviewed: [text(engagement.start_date), text(engagement.target_decision_date)].filter(Boolean).join(' to ') || 'Not supplied',
        evidence_cutoff: evidenceDates.at(-1) || 'No evidence cutoff recorded'
      },
      current_state: {
        problem: statementValue(discovery, 'business_problem', 'problem_statement'),
        baseline: statementValue(discovery, 'business_problem', 'annual_cost'),
        stakeholders: statementValue(discovery, 'business_problem', 'affected_population'),
        no_action: statementValue(discovery, 'business_problem', 'do_nothing_consequence')
      },
      ai_necessity: { alternatives: statementValue(discovery, 'ai_rationale', 'alternatives_considered'), outcome: aiAssessment.outcome, rationale: aiAssessment.rationale, assumptions: text(ai.assumptions_and_unknowns) },
      economics: {
        baseline: statementValue(discovery, 'business_problem', 'annual_cost'), expected_costs: statementValue(discovery, 'proposed_initiative', 'committed_budget'),
        benefits: statementValue(discovery, 'ai_rationale', 'expected_benefits'), assumptions: statementValue(discovery, 'ai_rationale', 'assumptions'),
        ranges: 'No conservative, expected, or optimistic range is supplied in this engagement record.', breakeven: 'No breakeven information is supplied in this engagement record.'
      },
      architecture: {
        alternatives: statementValue(discovery, 'ai_rationale', 'alternatives_considered'), current_workflow: statementValue(discovery, 'current_operating_model', 'current_workflow'),
        systems: statementValue(discovery, 'current_operating_model', 'major_systems'), data: statementValue(discovery, 'current_operating_model', 'major_data_sources'), dependencies: statementValue(discovery, 'current_operating_model', 'dependencies')
      },
      governance: {
        authority: statementValue(discovery, 'governance', 'decision_authority'), executive: statementValue(discovery, 'governance', 'accountable_executive'),
        process_owner: statementValue(discovery, 'governance', 'process_owner'), data_owner: statementValue(discovery, 'governance', 'data_owner'), oversight: statementValue(discovery, 'governance', 'human_oversight')
      },
      evidence: { total: evidenceStats.total, review_required: evidenceStats.reviewRequired, unknown: evidenceStats.unknown, regulatory_references: regulatoryEvidence.map(item => `${item.evidence_id || 'Unidentified record'}: ${item.title}`) },
      findings: { unresolved: unresolvedFindings, questions: unresolvedQuestions, summary: findingStats },
      recommendation,
      traceability: {
        workspace_reference: text(engagement.roi_ea_workspace_reference) || 'Not recorded',
        discovery_trace: statementTrace(discovery, 'business_problem', 'problem_statement'),
        application_version: applicationVersion,
        report_model_version: 'fedarm-executive-package-v0.1'
      }
    },
    evidence,
    disclaimer: 'This locally generated package supports qualified consultant and client review. It does not create authority, establish legal applicability or compliance, demonstrate control effectiveness, approve an architecture, authorize implementation, or issue an engagement snapshot.'
  };
}

export function executiveDecisionPackageBody(report = {}) {
  const section = report.sections || {}, rec = section.recommendation || {}, evidence = report.evidence || [];
  const architectureMatrix = `<table><thead><tr><th>Alternative</th><th>Value</th><th>Cost</th><th>Complexity</th><th>Implementation time</th><th>Data readiness</th><th>Governance burden</th><th>Regulatory considerations</th><th>Reversibility</th></tr></thead><tbody><tr><td>${esc(section.architecture?.alternatives)}</td><td>Not supplied</td><td>Not supplied</td><td>Not supplied</td><td>Not supplied</td><td>Not supplied</td><td>Not supplied</td><td>Qualified review required</td><td>Not supplied</td></tr></tbody></table>`;
  const evidenceRows = evidence.length ? `<table><thead><tr><th>ID</th><th>Source</th><th>Status</th><th>Relevant provenance</th></tr></thead><tbody>${evidence.map(item => `<tr><td>${esc(item.evidence_id)}</td><td>${esc(item.source_reference)}</td><td>${esc(item.review_state)}</td><td>${esc(`${item.classification}; ${item.relevance}`)}</td></tr>`).join('')}</tbody></table>` : '<p class="muted">No engagement evidence records have been registered.</p>';
  return `<p class="eyebrow">FEDARM / LOCAL CONSULTING / DRAFT FOR QUALIFIED REVIEW</p><h1>${esc(report.report_type)}</h1><p class="meta">${esc(report.title)} | Engagement ${esc(report.engagement_id)} | Generated ${esc(report.generated_at)}</p>
  <p class="notice"><strong>Decision boundary.</strong> ${esc(report.disclaimer)}</p>
  <h2>1. Executive Summary</h2>${table([['Initiative', section.executive_summary?.initiative], ['Decision question', section.executive_summary?.decision_question], ['Consultant recommendation', section.executive_summary?.recommendation], ['Principal reason', section.executive_summary?.principal_reason], ['Major condition or caveat', section.executive_summary?.major_condition]])}
  <h2>2. Engagement Scope</h2>${table([['Client', section.scope?.client], ['Initiative', section.scope?.initiative], ['In scope', section.scope?.in_scope], ['Out of scope', section.scope?.out_of_scope], ['Period reviewed', section.scope?.period_reviewed], ['Evidence cutoff date', section.scope?.evidence_cutoff]])}
  <h2>3. Current-State Problem</h2>${table([['Operating problem', section.current_state?.problem], ['Cost or performance baseline', section.current_state?.baseline], ['Affected stakeholders', section.current_state?.stakeholders], ['Consequence of no action', section.current_state?.no_action]])}
  <h2>4. AI Necessity Assessment</h2>${table([['Alternatives considered', section.ai_necessity?.alternatives], ['AI Necessity Gate conclusion', section.ai_necessity?.outcome], ['Rationale', section.ai_necessity?.rationale]])}
  <h2>5. Economic Assessment</h2>${table([['Baseline', section.economics?.baseline], ['Expected costs', section.economics?.expected_costs], ['Expected benefits', section.economics?.benefits], ['Major assumptions', section.economics?.assumptions], ['Ranges', section.economics?.ranges], ['Breakeven', section.economics?.breakeven]])}
  <h2>6. Architecture Alternatives</h2>${architectureMatrix}<p class="muted">The matrix exposes absent inputs rather than manufacturing comparative values.</p>
  <h2>7. Proposed Architecture</h2>${table([['Current workflow', section.architecture?.current_workflow], ['Major systems', section.architecture?.systems], ['Major data sources', section.architecture?.data], ['Known dependencies', section.architecture?.dependencies]])}
  <h2>8. Governance and Authority</h2>${table([['Decision authority', section.governance?.authority], ['Accountable executive', section.governance?.executive], ['Process owner', section.governance?.process_owner], ['Data owner', section.governance?.data_owner], ['Human oversight', section.governance?.oversight]])}<p class="muted">Capability, permission, decision authority, and human accountability remain distinct. No Authority Envelope is created by this package.</p>
  <h2>9. Regulatory and Evidence Considerations</h2>${table([['Evidence records', String(section.evidence?.total ?? 0)], ['Qualified review required', String(section.evidence?.review_required ?? 0)], ['Unknown classifications', String(section.evidence?.unknown ?? 0)], ['Regulatory references', (section.evidence?.regulatory_references || []).join('; ') || 'None supplied']])}<p class="muted">Retrieval or registration does not establish applicability, legal sufficiency, compliance, or control effectiveness.</p>
  <h2>10. Principal Findings</h2>${list((section.findings?.unresolved || []).map(item => `${item.finding_id || 'Unidentified finding'} — ${item.title}: ${item.finding_statement} [${item.severity}; ${item.decision_impact}; ${item.status}]`), 'No unresolved findings have been recorded. That does not establish that no issue exists.')}
  <h2>11. Evidence Gaps and Open Questions</h2>${list((section.findings?.questions || []).map(item => `${item.question_id || 'Unidentified question'} — ${item.question}; evidence needed: ${item.evidence_needed}; owner: ${item.owner}`), 'No unresolved questions have been recorded. That does not establish that all questions are answered.')}
  <h2>12. Recommendation</h2>${table([['Outcome', rec.recommendation || 'NOT YET RECORDED'], ['Executive summary', rec.executive_summary || 'No consultant recommendation has been recorded.'], ['Rationale', rec.rationale || 'Not supplied'], ['Conditions', rec.conditions || 'Not supplied'], ['Residual risks', rec.residual_risks || 'Not supplied'], ['Review trigger', rec.review_trigger || 'Not supplied']])}
  <h2>13. Required Next Steps</h2>${table([['Next steps', rec.required_next_steps || 'No consultant recommendation has been recorded.'], ['Key evidence', rec.key_evidence || 'Not supplied'], ['Key findings', rec.key_findings || 'Not supplied']])}
  <h2>Appendix A. Evidence Register</h2>${evidenceRows}
  <h2>Appendix B. Assumptions</h2>${table([['Discovery assumptions', section.economics?.assumptions], ['AI assumptions and unknowns', section.ai_necessity?.assumptions]])}
  <h2>Appendix C. Analytical Traceability</h2>${table([['ROI-EA workspace reference', section.traceability?.workspace_reference], ['Discovery trace', section.traceability?.discovery_trace], ['Application version', section.traceability?.application_version], ['Report model version', section.traceability?.report_model_version]])}<p class="footer">Generated locally. This is not an R8 snapshot and does not freeze engagement state.</p>`;
}

export function renderExecutiveDecisionPackageHtml(report = {}) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(report.title || 'Executive decision package')}</title><style>body{font:11pt/1.45 Arial,sans-serif;color:#122c46;max-width:7.2in;margin:.65in auto}h1{font-size:27pt;line-height:1.05;margin:0 0 8px}h2{font-size:16pt;border-bottom:1px solid #a8bdc9;padding-bottom:4px;margin:26px 0 10px}.eyebrow{font-weight:700;letter-spacing:1.2px;color:#087d7d}.meta,.muted,.footer{color:#5d7080}.notice{background:#f8f1df;border-left:4px solid #c68e2f;padding:11px}table{border-collapse:collapse;width:100%;margin:10px 0}th,td{border:1px solid #c7d3da;padding:7px;text-align:left;vertical-align:top}th{background:#edf3f6;width:31%}thead th{background:#dfecef}ul{padding-left:22px}@media print{body{margin:.45in auto}h2{break-after:avoid}table{break-inside:avoid}}</style></head><body>${executiveDecisionPackageBody(report)}</body></html>`;
}
