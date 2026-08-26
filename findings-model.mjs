export const FINDING_DOMAINS = Object.freeze(['Business', 'Economics', 'Architecture', 'Data', 'AI', 'Governance', 'Authority', 'Regulatory', 'Security', 'Operations', 'Vendor', 'Evidence', 'Other']);
export const FINDING_SEVERITIES = Object.freeze(['Observation', 'Low', 'Moderate', 'High', 'Decision-critical']);
export const FINDING_STATUSES = Object.freeze(['Open', 'In review', 'Resolved', 'Deferred']);
export const QUESTION_STATUSES = Object.freeze(['Open', 'In review', 'Resolved', 'Unable to resolve', 'Deferred']);
export const DECISION_IMPACTS = Object.freeze(['Informational', 'Material', 'Decision-blocking']);

const text = value => String(value ?? '').trim();
const choose = (value, allowed, fallback) => allowed.includes(value) ? value : fallback;

export function normalizeFinding(record = {}) {
  return {
    finding_id: text(record.finding_id), title: text(record.title), domain: choose(record.domain, FINDING_DOMAINS, 'Other'),
    finding_statement: text(record.finding_statement), severity: choose(record.severity, FINDING_SEVERITIES, 'Observation'),
    status: choose(record.status, FINDING_STATUSES, 'Open'), supporting_evidence: text(record.supporting_evidence),
    contradictory_evidence: text(record.contradictory_evidence), decision_impact: choose(record.decision_impact, DECISION_IMPACTS, 'Informational'),
    owner: text(record.owner), required_action: text(record.required_action), due_date: text(record.due_date),
    resolution: text(record.resolution), recorded_at: text(record.recorded_at)
  };
}

export function findingErrors(record = {}) {
  const finding = normalizeFinding(record), errors = [];
  for (const field of ['title', 'finding_statement', 'supporting_evidence', 'owner', 'required_action']) {
    if (!finding[field]) errors.push(`${field} is required.`);
  }
  if (finding.status === 'Resolved' && !finding.resolution) errors.push('resolution is required when a finding is resolved.');
  return errors;
}

export function normalizeOpenQuestion(record = {}) {
  return {
    question_id: text(record.question_id), question: text(record.question), domain: choose(record.domain, FINDING_DOMAINS, 'Other'),
    owner: text(record.owner), evidence_needed: text(record.evidence_needed), decision_impact: choose(record.decision_impact, DECISION_IMPACTS, 'Informational'),
    status: choose(record.status, QUESTION_STATUSES, 'Open'), resolution: text(record.resolution), recorded_at: text(record.recorded_at)
  };
}

export function openQuestionErrors(record = {}) {
  const question = normalizeOpenQuestion(record), errors = [];
  for (const field of ['question', 'owner', 'evidence_needed']) if (!question[field]) errors.push(`${field} is required.`);
  if (['Resolved', 'Unable to resolve'].includes(question.status) && !question.resolution) errors.push('resolution is required for a closed question state.');
  return errors;
}

export function findingsSummary(findings = [], questions = []) {
  const normalizedFindings = findings.map(normalizeFinding), normalizedQuestions = questions.map(normalizeOpenQuestion);
  const unresolvedFindings = normalizedFindings.filter(item => !['Resolved', 'Deferred'].includes(item.status));
  const unresolvedQuestions = normalizedQuestions.filter(item => !['Resolved', 'Deferred', 'Unable to resolve'].includes(item.status));
  return {
    findings: normalizedFindings.length,
    questions: normalizedQuestions.length,
    decisionBlocking: unresolvedFindings.filter(item => item.decision_impact === 'Decision-blocking').length + unresolvedQuestions.filter(item => item.decision_impact === 'Decision-blocking').length,
    highUnresolved: unresolvedFindings.filter(item => ['High', 'Decision-critical'].includes(item.severity)).length,
    unresolvedQuestions: unresolvedQuestions.length
  };
}
