import { evaluateBpmnAssessmentIntake } from './bpmn-assessment-intake.mjs';
import { assessBpmnHandoffs } from './bpmn-assessment-handoff.mjs';
import { assessBpmnObligationsAndControls } from './bpmn-assessment-obligation-control.mjs';
import { assessBpmnBoundedAiCandidates } from './bpmn-assessment-bounded-ai.mjs';

const PROFILE = 'ROI-EA-BPMN-QUALIFIED-DOSSIER-V0.1';
const IMPORT_PROFILE = 'ROI-EA-BPMN-IMPORT-V0.1';
const immutable = (value) => Object.freeze(value);
const controlled = (model) => model?.profile === IMPORT_PROFILE && model.source?.localOnly === true && /^[a-f0-9]{64}$/u.test(model.source?.sha256 || '');

/**
 * Produces a read-only, download-only qualified assessment dossier. It is a
 * projection of prior gates, not a workflow, writeback, decision, legal
 * applicability, compliance, control-effectiveness, or implementation result.
 */
export function buildBpmnAssessmentDossier(model, context = {}) {
  if (!controlled(model)) return immutable({ profile: PROFILE, gate: 'GATE_E', outcome: 'HOLD', gateLabel: 'GATE_E_HOLD — CONTROLLED SOURCE REQUIRED', readOnly: true, publicWriteback: false, source: null, findings: immutable([{ type: 'REVIEW_REQUIRED', message: 'A controlled staged BPMN source is required before dossier assembly.' }]) });
  const intake = evaluateBpmnAssessmentIntake(model, context.intakeContext || {});
  const handoffs = assessBpmnHandoffs(model, context.handoffReferences || {});
  const controls = assessBpmnObligationsAndControls(model, context.obligationControlReferences || {});
  const boundedAi = assessBpmnBoundedAiCandidates(model, context.boundedAiReferences || {});
  const boundaryRows = (model.elements || []).filter((item) => ['bpmn:Participant', 'bpmn:Lane', 'bpmn:Process'].includes(item.bpmnType)).map((item) => immutable({ sourceElementId: item.sourceId, sourceBpmnType: item.bpmnType, sourceLabel: item.name || '', qualification: 'MODELED_SOURCE_BOUNDARY_ONLY' })).sort((left, right) => left.sourceElementId.localeCompare(right.sourceElementId));
  const riskControlMatrix = immutable([...controls.obligationAssessments.map((item) => immutable({ rowType: 'OBLIGATION_REFERENCE', sourceCandidateId: item.sourceCandidateId, referenceId: item.obligationId, assessmentState: item.assessmentState, reviewState: item.reviewState })), ...controls.controlAssessments.map((item) => immutable({ rowType: 'CONTROL_REFERENCE', sourceCandidateId: item.sourceCandidateId, referenceId: item.controlId, assessmentState: item.assessmentState, evidenceState: item.evidenceState, reviewState: item.reviewState })), ...controls.gaps.map((item) => immutable({ rowType: 'QUALIFIED_GAP', sourceCandidateId: item.sourceCandidateId, referenceId: item.id, assessmentState: item.type, requestedAction: item.requestedAction }))].sort((left, right) => `${left.rowType}:${left.referenceId}`.localeCompare(`${right.rowType}:${right.referenceId}`)));
  const findings = immutable([...intake.findings, ...handoffs.findings, ...controls.findings, ...boundedAi.findings]);
  return immutable({
    profile: PROFILE,
    gate: 'GATE_E',
    outcome: 'READY_FOR_DOWNLOAD',
    gateLabel: 'GATE_E_READY_FOR_DOWNLOAD — QUALIFIED DOSSIER; HUMAN REVIEW REQUIRED',
    readOnly: true,
    publicWriteback: false,
    disposition: 'HUMAN_REVIEW_REQUIRED',
    source: immutable({ sha256: model.source.sha256, fileName: model.source.fileName, byteLength: model.source.byteLength, importedAt: model.source.importedAt }),
    processBoundaryMap: immutable({ boundaries: immutable(boundaryRows), handoffs: handoffs.handoffs }),
    riskControlMatrix,
    boundedAiSuitability: immutable({ case0AndCandidateCases: boundedAi.capabilityCases, findings: boundedAi.findings }),
    efficiencyHypotheses: boundedAi.economicHypotheses,
    gateSummaries: immutable({ intake: immutable({ outcome: intake.outcome, gateLabel: intake.gateLabel }), handoff: immutable({ outcome: handoffs.outcome, gateLabel: handoffs.gateLabel }), obligationControl: immutable({ outcome: controls.outcome, gateLabel: controls.gateLabel }), boundedAi: immutable({ outcome: boundedAi.outcome, gateLabel: boundedAi.gateLabel }) }),
    findings,
    limitations: immutable(['SOURCE_MODELED_EVIDENCE_ONLY', 'NO_LEGAL_APPLICABILITY_OR_COMPLIANCE_RESULT', 'NO_CONTROL_EFFECTIVENESS_RESULT', 'NO_AUTHORITY_OR_ACCEPTANCE_CREATED', 'NO_AI_DEPLOYMENT_OR_IMPLEMENTATION_AUTHORIZATION', 'NO_REALIZED_COST_SAVINGS_OR_ROI_CLAIM']),
  });
}
