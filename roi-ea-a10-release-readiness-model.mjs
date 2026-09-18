/**
 * ROI-Driven Enterprise Architect — A10 Controlled Release Readiness.
 *
 * This module records evidence gates for a controlled release decision.
 * It does not release software, approve production use, accept risk, or
 * infer a human release decision from passing technical evidence.
 */

const text = value => String(value ?? '').trim();
const list = value => Array.isArray(value) ? value : value == null ? [] : [value];
const unique = value => [...new Set(list(value).map(text).filter(Boolean))];

export const RELEASE_GATE_IDS = Object.freeze([
  'SOURCE_BASELINE',
  'TRACEABILITY',
  'FULL_REGRESSION',
  'NORTH_STAR_END_TO_END',
  'ACCESSIBILITY_REVIEW',
  'BROWSER_SMOKE',
  'MIGRATION_RECOVERY',
  'EXECUTIVE_DOSSIER',
  'BPMN_READ_ONLY_BOUNDARY'
]);

export const RELEASE_GATE_STATES = Object.freeze([
  'NOT_RUN','PASS','FAIL','INCOMPLETE'
]);

export const TRACEABILITY_SUMMARY_POST_A9 = Object.freeze({
  requirements:36,
  strong:30,
  partialStrong:5,
  gaps:1,
  p0Gaps:0,
  knownGapIds:['T36'],
  knownPartialStrongIds:['T07','T16','T29','T30','T31'],
  sourceBaseline:'b3ac2856f448bca04df40f3944fefbe36dd01e5c'
});

export function normalizeReleaseGate(record = {}) {
  const id = text(record.id).toUpperCase();
  const state = text(record.state || 'NOT_RUN').toUpperCase();
  const errors = [];
  if (!RELEASE_GATE_IDS.includes(id)) errors.push('release gate id is not recognized.');
  if (!RELEASE_GATE_STATES.includes(state)) errors.push('release gate state is not recognized.');

  return {
    id,
    state,
    evidenceIds:unique(record.evidenceIds),
    reviewerId:text(record.reviewerId),
    reviewedAt:text(record.reviewedAt),
    limitation:text(record.limitation),
    errors
  };
}

export function evaluateTraceabilityGate({
  summary = TRACEABILITY_SUMMARY_POST_A9,
  acceptedKnownGapIds = []
} = {}) {
  const accepted = new Set(unique(acceptedKnownGapIds));
  const knownGaps = unique(summary.knownGapIds);
  const undispositioned = knownGaps.filter(id => !accepted.has(id));

  const p0Blocking = Number(summary.p0Gaps || 0) > 0;
  const status = p0Blocking
    ? 'FAIL'
    : undispositioned.length
      ? 'INCOMPLETE'
      : 'PASS';

  return {
    status,
    requirements:Number(summary.requirements || 0),
    strong:Number(summary.strong || 0),
    partialStrong:Number(summary.partialStrong || 0),
    gaps:Number(summary.gaps || 0),
    p0Gaps:Number(summary.p0Gaps || 0),
    undispositionedKnownGapIds:undispositioned,
    acceptedKnownGapIds:[...accepted],
    gapAcceptanceCreatesImplementationApproval:false,
    gapAcceptanceCreatesRiskAcceptance:false
  };
}

export function buildReleaseGateSet({
  gateEvidence = [],
  traceability = {}
} = {}) {
  const supplied = new Map(gateEvidence.map(item => {
    const normalized = normalizeReleaseGate(item);
    return [normalized.id,normalized];
  }));

  const trace = evaluateTraceabilityGate(traceability);
  const gates = RELEASE_GATE_IDS.map(id => {
    if (id === 'TRACEABILITY') {
      return {
        id,
        state:trace.status,
        evidenceIds:unique(traceability.evidenceIds),
        reviewerId:text(traceability.reviewerId),
        reviewedAt:text(traceability.reviewedAt),
        limitation:text(traceability.limitation),
        errors:[]
      };
    }
    return supplied.get(id) || normalizeReleaseGate({id,state:'NOT_RUN'});
  });

  return { gates, traceability:trace };
}

export function evaluateControlledReleaseReadiness(input = {}) {
  const {gates,traceability} = buildReleaseGateSet(input);
  const issues = gates.flatMap(gate=>gate.errors.map(error=>`${gate.id}: ${error}`));
  const failed = gates.filter(g=>g.state==='FAIL').map(g=>g.id);
  const incomplete = gates.filter(g=>['NOT_RUN','INCOMPLETE'].includes(g.state)).map(g=>g.id);

  const evidenceReady = issues.length===0 && failed.length===0 && incomplete.length===0;

  return {
    status:issues.length
      ? 'INCOMPLETE'
      : failed.length
        ? 'BLOCKED'
        : incomplete.length
          ? 'NOT_READY'
          : 'READY_FOR_CONTROLLED_RELEASE_DECISION',
    evidenceReady,
    gates,
    traceability,
    failedGateIds:failed,
    incompleteGateIds:incomplete,

    // Passing evidence does not itself perform the release decision.
    releaseDecision:null,
    releaseAuthorized:false,
    productionUseAuthorized:false,
    riskAccepted:false,
    autoRelease:false
  };
}

export function applyReleaseDecision(readiness = {}, decision = {}) {
  const disposition = text(decision.disposition).toUpperCase();
  const hasAccountableDecision = Boolean(
    text(decision.id) &&
    text(decision.decisionOwnerId) &&
    text(decision.authorityId) &&
    text(decision.effectiveTime)
  );

  const approved = readiness.status === 'READY_FOR_CONTROLLED_RELEASE_DECISION' &&
    hasAccountableDecision &&
    ['APPROVE_CONTROLLED_RELEASE','APPROVE'].includes(disposition);

  return {
    readinessStatus:readiness.status,
    accountableDecisionPresent:hasAccountableDecision,
    disposition,
    controlledReleaseApproved:approved,
    productionUseAuthorized:approved && decision.productionUseAuthorized === true,
    riskAccepted:decision.riskAccepted === true && approved,
    autoRelease:false,
    status:
      readiness.status !== 'READY_FOR_CONTROLLED_RELEASE_DECISION'
        ? 'RELEASE_EVIDENCE_NOT_READY'
        : !hasAccountableDecision
          ? 'AWAITING_ACCOUNTABLE_RELEASE_DECISION'
          : approved
            ? 'CONTROLLED_RELEASE_APPROVED'
            : 'CONTROLLED_RELEASE_NOT_APPROVED'
  };
}
