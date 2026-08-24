const PROFILE = 'ROI-EA-BPMN-OBLIGATION-CONTROL-ASSESSMENT-V0.1';
const IMPORT_PROFILE = 'ROI-EA-BPMN-IMPORT-V0.1';

const text = (value, limit = 256) => typeof value === 'string' ? value.trim().slice(0, limit) : '';
const ids = (value) => [...new Set((Array.isArray(value) ? value : String(value || '').split(',')).map((item) => text(item)).filter(Boolean))].sort();
const immutable = (value) => Object.freeze(value);
const finding = (type, message, sourceElementIds) => immutable({ type, message, sourceElementIds: immutable(ids(sourceElementIds)), qualification: 'QUALIFIED_ASSESSMENT_ONLY' });

function sourceIsControlled(model) {
  return model?.profile === IMPORT_PROFILE && model.source?.localOnly === true && /^[a-f0-9]{64}$/u.test(model.source?.sha256 || '');
}

function assessmentId(kind, sourceHash, candidateId, referenceId) {
  return `BPMN-${kind}:${sourceHash}:${candidateId}:${referenceId}`;
}

/**
 * Builds source-linked obligation and control review records. Supplied IDs are
 * retrieval/traceability references only; this function never decides legal
 * applicability, control effectiveness, compliance, or a violation.
 */
export function assessBpmnObligationsAndControls(model, reviewReferences = {}) {
  if (!sourceIsControlled(model)) return immutable({ profile: PROFILE, gate: 'GATE_C', outcome: 'HOLD', gateLabel: 'GATE_C_HOLD — CONTROLLED SOURCE REQUIRED', source: null, obligationAssessments: immutable([]), controlAssessments: immutable([]), gaps: immutable([]), findings: immutable([finding('REVIEW_REQUIRED', 'A controlled staged BPMN source is required before obligation/control assessment.', [])]) });

  const obligationAssessments = [], controlAssessments = [], gaps = [], findings = [];
  const candidates = [...(model.mappingCandidates || [])].sort((left, right) => left.candidateId.localeCompare(right.candidateId));
  for (const candidate of candidates) {
    const supplied = reviewReferences[candidate.candidateId] || {};
    const obligationIds = ids(supplied.obligationIds);
    const controlIds = ids(supplied.controlIds);
    const evidenceReferenceIds = ids(supplied.evidenceReferenceIds);
    const sourceElementIds = [candidate.sourceId];

    for (const obligationId of obligationIds) obligationAssessments.push(immutable({
      id: assessmentId('OBL', model.source.sha256, candidate.candidateId, obligationId),
      sourceCandidateId: candidate.candidateId,
      sourceElementIds: immutable(sourceElementIds),
      obligationId,
      referenceState: 'REVIEWER_SUPPLIED_UNVERIFIED',
      assessmentState: 'POTENTIALLY_APPLICABLE_OBLIGATION',
      reviewState: 'REVIEW_REQUIRED',
    }));

    for (const controlId of controlIds) controlAssessments.push(immutable({
      id: assessmentId('CTL', model.source.sha256, candidate.candidateId, controlId),
      sourceCandidateId: candidate.candidateId,
      sourceElementIds: immutable(sourceElementIds),
      controlId,
      referenceState: 'REVIEWER_SUPPLIED_UNVERIFIED',
      evidenceReferenceIds: immutable(evidenceReferenceIds),
      evidenceState: evidenceReferenceIds.length ? 'REVIEWER_SUPPLIED_UNVERIFIED' : 'MISSING_EVIDENCE',
      assessmentState: evidenceReferenceIds.length ? 'CONTROL_REFERENCE_REVIEW_REQUIRED' : 'POTENTIAL_CONTROL_GAP',
      reviewState: 'REVIEW_REQUIRED',
    }));

    if (!obligationIds.length && !controlIds.length) {
      const gap = immutable({ id: assessmentId('GAP', model.source.sha256, candidate.candidateId, 'UNMAPPED_REVIEW_SCOPE'), sourceCandidateId: candidate.candidateId, sourceElementIds: immutable(sourceElementIds), type: 'REVIEW_REQUIRED', message: 'No obligation or control reference is supplied for this source-linked candidate.', requestedAction: 'Qualified reviewer determines whether a reference or control assessment is needed.' });
      gaps.push(gap); findings.push(finding(gap.type, gap.message, sourceElementIds));
    }
    if (obligationIds.length && !controlIds.length) {
      const gap = immutable({ id: assessmentId('GAP', model.source.sha256, candidate.candidateId, 'CONTROL_REFERENCE_UNRESOLVED'), sourceCandidateId: candidate.candidateId, sourceElementIds: immutable(sourceElementIds), type: 'POTENTIAL_CONTROL_GAP', message: 'A potential obligation reference is supplied without a linked control reference.', requestedAction: 'Qualified reviewer determines whether a control reference or additional evidence is needed.' });
      gaps.push(gap); findings.push(finding(gap.type, gap.message, sourceElementIds));
    }
    if (controlIds.length && !evidenceReferenceIds.length) {
      const gap = immutable({ id: assessmentId('GAP', model.source.sha256, candidate.candidateId, 'CONTROL_EVIDENCE_UNRESOLVED'), sourceCandidateId: candidate.candidateId, sourceElementIds: immutable(sourceElementIds), type: 'POTENTIAL_CONTROL_GAP', message: 'A control reference is supplied without evidence references.', requestedAction: 'Qualified reviewer supplies or requests evidence before any effectiveness review.' });
      gaps.push(gap); findings.push(finding(gap.type, gap.message, sourceElementIds));
    }
  }
  const outcome = findings.length ? 'CONDITIONAL' : 'REVIEW_READY';
  return immutable({
    profile: PROFILE,
    gate: 'GATE_C',
    outcome,
    gateLabel: outcome === 'REVIEW_READY' ? 'GATE_C_REVIEW_READY — SOURCE-LINKED REFERENCES REQUIRE QUALIFIED REVIEW' : 'GATE_C_CONDITIONAL — OBLIGATION/CONTROL ASSESSMENT HAS EXPLICIT UNRESOLVED CONDITIONS',
    source: immutable({ sha256: model.source.sha256, fileName: model.source.fileName, byteLength: model.source.byteLength }),
    obligationAssessments: immutable(obligationAssessments),
    controlAssessments: immutable(controlAssessments),
    gaps: immutable(gaps),
    findings: immutable(findings),
  });
}
