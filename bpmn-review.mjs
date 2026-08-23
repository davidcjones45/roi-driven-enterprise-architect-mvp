import { assertNormalizedImportModel } from './bpmn-import-model.mjs';

const ACTION_TO_DISPOSITION = Object.freeze({ ACCEPT: 'ACCEPTED', REJECT: 'REJECTED', REVISE: 'REVISED' });
const EDITABLE_TYPES = new Set(['PARTICIPANT', 'EXTERNAL_PARTY', 'PERFORMER_ROLE', 'VALUE_STREAM', 'PROCESS_STEP', 'TRANSITION', 'HANDOFF', 'ACTION', 'DEPENDENCY', 'EVIDENCE_GAP', 'DECISION_POINT', 'CONTROL_POINT', 'EXCEPTION_RECOVERY', 'TECHNICAL_CAPABILITY']);

function requiredText(value, label, max = 32768) {
  const text = String(value || '').trim();
  if (!text || text.length > max) throw new TypeError(`${label} is required and must not exceed ${max} characters.`);
  return text;
}

export function reviewBpmnCandidate(model, candidateId, review = {}) {
  assertNormalizedImportModel(model);
  const action = String(review.action || '').toUpperCase();
  if (!ACTION_TO_DISPOSITION[action]) throw new TypeError('Review action must be ACCEPT, REJECT, or REVISE.');
  const reviewedAt = requiredText(review.reviewedAt, 'reviewedAt', 64);
  if (Number.isNaN(Date.parse(reviewedAt)) || !reviewedAt.endsWith('Z')) throw new TypeError('reviewedAt must be a valid UTC timestamp.');
  const reviewer = requiredText(review.reviewer, 'reviewer', 256);
  const note = requiredText(review.note, 'note');
  const index = model.mappingCandidates.findIndex((item) => item.candidateId === candidateId);
  if (index < 0) throw new TypeError(`Unknown mapping candidate: ${candidateId}`);
  const current = model.mappingCandidates[index];
  if (['ACCEPTED', 'REJECTED'].includes(current.disposition)) throw new TypeError(`Final disposition cannot be overwritten: ${candidateId}`);

  let candidateType = current.candidateType;
  let candidateLabel = current.candidateLabel;
  if (action === 'REVISE') {
    candidateType = requiredText(review.candidateType || current.candidateType, 'candidateType', 64);
    if (!EDITABLE_TYPES.has(candidateType)) throw new TypeError(`Unsupported revised candidate type: ${candidateType}`);
    candidateLabel = requiredText(review.candidateLabel || current.candidateLabel, 'candidateLabel', 512);
  }
  const nextDisposition = ACTION_TO_DISPOSITION[action];
  const historyEntry = Object.freeze({
    sequence: current.reviewHistory.length + 1,
    action,
    reviewer,
    reviewedAt,
    note,
    priorDisposition: current.disposition,
    nextDisposition,
    priorCandidateType: current.candidateType,
    nextCandidateType: candidateType,
    priorCandidateLabel: current.candidateLabel,
    nextCandidateLabel: candidateLabel,
  });
  const updated = {
    ...current,
    candidateType,
    candidateLabel,
    disposition: nextDisposition,
    reviewerNote: note,
    reviewHistory: [...current.reviewHistory, historyEntry],
  };
  const mappingCandidates = model.mappingCandidates.map((item, itemIndex) => itemIndex === index ? updated : item);
  const reviewed = mappingCandidates.filter((item) => item.disposition !== 'PENDING_REVIEW' && item.disposition !== 'REVISED').length;
  const status = reviewed === mappingCandidates.length ? 'REVIEWED_COMPLETE' : 'REVIEWED_PARTIAL';
  return assertNormalizedImportModel({ ...model, mappingCandidates, status });
}
