import test from 'node:test';
import assert from 'node:assert/strict';
import { buildExecutiveDecisionPackage, renderExecutiveDecisionPackageHtml } from './engagement-report.mjs';

const engagement = { engagement_id:'ENG-001', client_name:'Example Client', initiative_name:'Example Initiative', decision_question:'What should be done?', scope:'Diagnostic only', out_of_scope:'No implementation', start_date:'2026-08-01', target_decision_date:'2026-08-31', roi_ea_workspace_reference:'ROI-EA local reference', discovery:{ business_problem:{ problem_statement:{value:'Manual work delays review.',state:'Client assertion',source:'Interview'} }, ai_rationale:{ alternatives_considered:{value:'Checklist first',state:'Consultant inference',source:'Workshop'}, expected_benefits:{value:'Released analyst capacity',state:'Estimate',source:'Workshop'}, assumptions:{value:'Volume needs validation',state:'Assumption',source:'Workshop'} } }, ai_necessity:{assessed_task:'Find gaps',non_ai_baseline:'Checklist',non_ai_viable:'Yes',proposed_bounded_support:'Flag gaps',excluded_consequential_actions:'No decision',accountable_disposition_owner:'Manager',assumptions_and_unknowns:'Accuracy unknown'}, recommendation:{recommendation:'DEFER',executive_summary:'Wait for evidence.',rationale:'Owner remains unverified.',decision_date:'2026-08-26',consultant:'Consultant',key_evidence:'EVD-1',key_findings:'FND-1',conditions:'Name accountable owner.',required_next_steps:'Obtain owner record.',review_trigger:'Owner record received.'}, evidence_register:[{evidence_id:'EVD-1',title:'Interview',evidence_type:'Interview note',classification:'Client assertion',review_state:'Supplied',source_reference:'Client interview',relevance:'Operating context'}], findings_register:[{finding_id:'FND-1',title:'No owner',finding_statement:'Owner is not identified.',severity:'Decision-critical',status:'Open',supporting_evidence:'EVD-1',decision_impact:'Decision-blocking',owner:'Sponsor',required_action:'Name owner'}], open_questions_register:[{question_id:'QST-1',question:'Who owns the decision?',domain:'Authority',owner:'Sponsor',evidence_needed:'Authority record',decision_impact:'Decision-blocking',status:'Open'}] };

test('executive package reuses structured engagement content without manufacturing missing economics or authority', () => {
  const report = buildExecutiveDecisionPackage(engagement, { generatedAt:'2026-08-26T00:00:00Z' });
  assert.equal(report.sections.executive_summary.recommendation, 'DEFER');
  assert.equal(report.sections.current_state.problem, 'Manual work delays review.');
  assert.match(report.sections.economics.ranges, /No conservative/);
  assert.match(report.disclaimer, /does not create authority/);
  assert.equal(report.sections.findings.unresolved.length, 1);
});

test('executive package HTML preserves qualified-review and non-snapshot boundaries', () => {
  const html = renderExecutiveDecisionPackageHtml(buildExecutiveDecisionPackage(engagement, { generatedAt:'2026-08-26T00:00:00Z' }));
  assert.match(html, /AI Investment, Architecture &amp; Governance Diagnostic/);
  assert.match(html, /Qualified review required/);
  assert.match(html, /This is not an R8 snapshot/);
  assert.match(html, /does not create authority/);
});
