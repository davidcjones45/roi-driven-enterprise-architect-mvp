import { stableJson, assertNormalizedImportModel } from './bpmn-import-model.mjs';
import { normalizeWorkspace } from './feoa-workspace.mjs';

const TARGETS = Object.freeze({
  PARTICIPANT: ['participants', 'PAR'],
  VALUE_STREAM: ['valueStreams', 'VS'],
  PROCESS_STEP: ['processSteps', 'PS'],
  HANDOFF: ['handoffs', 'HOF'],
  TECHNICAL_CAPABILITY: ['capabilities', 'CAP'],
  EVIDENCE_GAP: ['evidenceGaps', 'GAP'],
});

function suffix(candidateId) { return candidateId.replace(/^BPMN-CAND-/u, '').replace(/[^A-Z0-9-]/giu, '-').toUpperCase(); }
function canonicalRecord(candidate, prefix) {
  const record = {
    id: `${prefix}-BPMN-${suffix(candidate.candidateId)}`,
    name: candidate.candidateLabel,
    sourceClassification: 'Modeled',
    sourceStatement: 'Imported BPMN notation; operating truth, authority, accountability, acceptance, compliance, and implementation remain unverified.',
    bpmnTrace: {
      candidateId: candidate.candidateId,
      sourceId: candidate.sourceId,
      sourceSha256: candidate.sourceSha256,
      sourceBpmnType: candidate.sourceBpmnType,
      ruleId: candidate.ruleId,
      qualificationFlags: [...candidate.qualificationFlags],
    },
  };
  if (candidate.candidateType === 'HANDOFF') Object.assign(record, { communicationState: 'Created', responsibilityState: 'Not Offered', authorityState: 'Pending' });
  if (candidate.candidateType === 'EVIDENCE_GAP') Object.assign(record, { status: 'Open', finding: `Unresolved BPMN semantics for ${candidate.sourceId}` });
  if (candidate.candidateType === 'TECHNICAL_CAPABILITY') Object.assign(record, { aiClassification: 'Unresolved', implementationState: 'Unverified' });
  return record;
}

export function commitAcceptedBpmnCandidates(model, workspace, options = {}) {
  assertNormalizedImportModel(model);
  if (options.confirmed !== true) throw new TypeError('Explicit confirmed=true is required for canonical commit.');
  if (model.status !== 'REVIEWED_COMPLETE') throw new TypeError('All candidates require a final human disposition before commit.');
  if (model.mappingCandidates.some((item) => item.qualificationFlags.includes('SOURCE_HAS_STRUCTURAL_ERRORS'))) throw new TypeError('Structurally defective BPMN sources cannot be committed.');
  const committedAt = String(options.committedAt || '');
  const committedBy = String(options.committedBy || '').trim();
  if (!committedBy || Number.isNaN(Date.parse(committedAt)) || !committedAt.endsWith('Z')) throw new TypeError('A committer and valid UTC commit timestamp are required.');

  const workspaceSnapshot = stableJson(workspace || {});
  const original = normalizeWorkspace(workspace || {});
  const next = structuredClone(original);
  const committed = [], skipped = [];
  for (const candidate of model.mappingCandidates.filter((item) => item.disposition === 'ACCEPTED')) {
    const target = TARGETS[candidate.candidateType];
    if (!target) { skipped.push({ candidateId: candidate.candidateId, reason: 'NO_CANONICAL_TARGET_V0_2_3' }); continue; }
    const [collection, prefix] = target;
    const record = canonicalRecord(candidate, prefix);
    const existing = next[collection].find((item) => item.id === record.id);
    if (existing) {
      if (existing.bpmnTrace?.candidateId === candidate.candidateId && existing.bpmnTrace?.sourceSha256 === candidate.sourceSha256) {
        skipped.push({ candidateId: candidate.candidateId, reason: 'IDEMPOTENT_ALREADY_COMMITTED', canonicalId: record.id });
        continue;
      }
      throw new TypeError(`Canonical ID conflict: ${record.id}`);
    }
    next[collection].push(record);
    committed.push({ candidateId: candidate.candidateId, canonicalId: record.id, collection });
  }
  const normalized = normalizeWorkspace(next);
  const commitRecord = {
    commitId: `BPMN-COMMIT-${model.source.sha256.slice(0, 16).toUpperCase()}`,
    sourceSha256: model.source.sha256,
    committedBy,
    committedAt,
    confirmed: true,
    committed,
    skipped,
    rejectedCandidateIds: model.mappingCandidates.filter((item) => item.disposition === 'REJECTED').map((item) => item.candidateId),
    limitations: ['BPMN notation remains modeled source evidence.', 'Commit does not establish authority, accountability, acceptance, compliance, membership, AI classification, or implementation.'],
  };
  if (stableJson(workspace || {}) !== workspaceSnapshot) throw new Error('Canonical workspace mutation detected.');
  return { workspace: normalized, commitRecord };
}
