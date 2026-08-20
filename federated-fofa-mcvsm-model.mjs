import { stableId } from './authority-model.mjs';
import { normalizeCounterfactual } from './feoa-model.mjs';

const list = value => Array.isArray(value) ? value : String(value || '').split(/[;,\n]/).map(item => item.trim()).filter(Boolean);
const ids = value => [...new Set(list(value))];
const present = value => value !== '' && value !== null && value !== undefined;
const numeric = value => present(value) && String(value).trim() !== '' && Number.isFinite(Number(value));
const stable = (record, prefix, fields) => {
  if (record.id) return record.id;
  const key = fields.map(field => Array.isArray(record[field]) ? [...record[field]].sort().join('|') : record[field]).filter(present).join('::');
  return key ? stableId(key, prefix) : '';
};
const candidate = (record, prefix, fields, defaults = {}) => ({ ...record, id: stable(record, prefix, fields), ...defaults });
const recordArray = value => Array.isArray(value) ? value : [];

export function normalizeFormAlternative(record = {}) {
  return candidate(record, 'FAL', ['assessmentId', 'formType', 'operatingDescription', 'ownershipControlModel'], {
    assessmentId: record.assessmentId || '', formType: record.formType || '', operatingDescription: record.operatingDescription || '',
    ownershipControlModel: record.ownershipControlModel || '', coordinationMechanism: record.coordinationMechanism || '', memberAutonomy: record.memberAutonomy || '',
    enforcementMechanism: record.enforcementMechanism || '', integrationBurden: record.integrationBurden || '', reversibility: record.reversibility || '',
    criterionIds: ids(record.criterionIds), evidenceIds: ids(record.evidenceIds), status: record.status || 'Draft',
  });
}
export function normalizeDecisionCriterion(record = {}) {
  return candidate(record, 'DCR', ['assessmentId', 'name', 'definition'], {
    assessmentId: record.assessmentId || '', name: record.name || '', definition: record.definition || '', weight: record.weight ?? '', critical: record.critical === true,
    minimumAcceptableRating: record.minimumAcceptableRating ?? '', ownerId: record.ownerId || '', evidenceIds: ids(record.evidenceIds), status: record.status || 'Draft',
  });
}
export function normalizeAlternativeRating(record = {}) {
  return candidate(record, 'ART', ['alternativeId', 'criterionId', 'reviewerId'], {
    alternativeId: record.alternativeId || '', criterionId: record.criterionId || '', rating: record.rating ?? '', confidence: record.confidence ?? '',
    reasoning: record.reasoning || '', assumptionId: record.assumptionId || '', evidenceIds: ids(record.evidenceIds), reviewerId: record.reviewerId || '', reviewStatus: record.reviewStatus || 'Draft',
  });
}
export function normalizeFormDecision(record = {}) {
  return candidate(record, 'FDE', ['assessmentId', 'selectedAlternativeId', 'effectiveTime', 'decisionOwnerId'], {
    assessmentId: record.assessmentId || '', selectedAlternativeId: record.selectedAlternativeId || '', disposition: record.disposition || '', decisionOwnerId: record.decisionOwnerId || '',
    effectiveTime: record.effectiveTime || '', conditionsPrecedentIds: ids(record.conditionsPrecedentIds), reassessmentTriggerIds: ids(record.reassessmentTriggerIds),
    evidenceIds: ids(record.evidenceIds), status: record.status || 'Draft',
  });
}

export function validateCriteriaWeights(criteria = [], tolerance = 1e-9) {
  const included = recordArray(criteria).filter(item => item.status !== 'Excluded');
  const missingWeightIds = included.filter(item => !present(item.weight) || String(item.weight).trim() === '').map(item => item.id || '');
  const invalidWeightIds = included.filter(item => present(item.weight) && (String(item.weight).trim() === '' || !numeric(item.weight) || Number(item.weight) < 0)).map(item => item.id || '');
  const weightTotal = included.filter(item => numeric(item.weight) && Number(item.weight) >= 0).reduce((total, item) => total + Number(item.weight), 0);
  const issues = [];
  if (missingWeightIds.length) issues.push('Included decision criteria are missing weights.');
  if (invalidWeightIds.length) issues.push('Included decision criteria have invalid weights.');
  if (!missingWeightIds.length && !invalidWeightIds.length && Math.abs(weightTotal - 1) > tolerance) issues.push(`Criterion weights must total 1 within tolerance ${tolerance}.`);
  return { valid: issues.length === 0, weightTotal, missingWeightIds, invalidWeightIds, issues, tolerance };
}
export function validateAlternativeRatingCoverage(alternatives = [], criteria = [], ratings = []) {
  const activeAlternatives = recordArray(alternatives).filter(item => item.status !== 'Excluded');
  const activeCriteria = recordArray(criteria).filter(item => item.status !== 'Excluded');
  const rows = recordArray(ratings); const duplicateRatingRelationships = []; const unresolvedRatingIds = [];
  const pairs = new Map();
  rows.forEach(item => {
    if (!item.alternativeId || !item.criterionId) unresolvedRatingIds.push(item.id || '');
    const key = `${item.alternativeId}::${item.criterionId}`; const existing = pairs.get(key) || []; existing.push(item.id || ''); pairs.set(key, existing);
  });
  pairs.forEach((ratingIds, key) => { if (ratingIds.length > 1) duplicateRatingRelationships.push({ key, ratingIds }); });
  const coverage = activeAlternatives.map(alternative => {
    const missingCriterionIds = activeCriteria.filter(criterion => !pairs.has(`${alternative.id}::${criterion.id}`)).map(criterion => criterion.id);
    return { alternativeId: alternative.id, complete: missingCriterionIds.length === 0, missingCriterionIds };
  });
  return { valid: coverage.every(item => item.complete) && !duplicateRatingRelationships.length && !unresolvedRatingIds.length, coverage, duplicateRatingRelationships, unresolvedRatingIds };
}
export function evaluateCriticalCriteria(alternativeId, criteria = [], ratings = []) {
  const critical = recordArray(criteria).filter(item => item.critical === true && item.status !== 'Excluded');
  const failedCriticalCriteria = []; const unresolvedCriticalCriteria = [];
  critical.forEach(criterion => {
    const matches = recordArray(ratings).filter(rating => rating.alternativeId === alternativeId && rating.criterionId === criterion.id);
    if (matches.length !== 1 || !numeric(matches[0].rating) || !numeric(criterion.minimumAcceptableRating)) { unresolvedCriticalCriteria.push(criterion.id); return; }
    if (Number(matches[0].rating) < Number(criterion.minimumAcceptableRating)) failedCriticalCriteria.push(criterion.id);
  });
  return { alternativeId, failedCriticalCriteria, unresolvedCriticalCriteria, status: failedCriticalCriteria.length ? 'BLOCKED' : unresolvedCriticalCriteria.length ? 'INCOMPLETE' : 'PASS' };
}
export function rankFormAlternatives(alternatives = [], criteria = [], ratings = [], options = {}) {
  const weightCheck = validateCriteriaWeights(criteria, options.tolerance);
  const coverage = validateAlternativeRatingCoverage(alternatives, criteria, ratings);
  const activeGate = options.activeDisqualifyingGate === true;
  const ranking = recordArray(alternatives).map(alternative => {
    const critical = evaluateCriticalCriteria(alternative.id, criteria, ratings);
    const score = recordArray(criteria).reduce((total, criterion) => {
      const rating = recordArray(ratings).find(item => item.alternativeId === alternative.id && item.criterionId === criterion.id);
      return total + (numeric(criterion.weight) && numeric(rating?.rating) ? Number(criterion.weight) * Number(rating.rating) : 0);
    }, 0);
    return { alternativeId: alternative.id, score, critical, confidenceLimitations: recordArray(ratings).filter(item => item.alternativeId === alternative.id && !present(item.confidence)).map(item => item.id || '') };
  }).sort((a, b) => b.score - a.score || a.alternativeId.localeCompare(b.alternativeId));
  return { kind: 'ANALYTICAL_RANKING', ranking, weightCheck, coverage, activeDisqualifyingGate: activeGate, decision: null, selectsForm: false, issues: [...weightCheck.issues, ...(coverage.valid ? [] : ['Alternative rating coverage is incomplete or ambiguous.']), ...(activeGate ? ['An active disqualifying gate prevents decision review.'] : [])] };
}

export function normalizeMemberEconomicThreshold(record = {}) {
  return candidate(record, 'MET', ['participantId', 'caseId', 'thresholdOwnerId'], {
    participantId: record.participantId || '', caseId: record.caseId || '', minimumAcceptableNPV: record.minimumAcceptableNPV ?? '', maximumFundingExposure: record.maximumFundingExposure ?? '',
    maximumLossDuration: record.maximumLossDuration ?? '', nonfinancialRequirements: record.nonfinancialRequirements || '', thresholdOwnerId: record.thresholdOwnerId || '', evidenceIds: ids(record.evidenceIds), status: record.status || 'Draft',
  });
}
export function normalizeDistributionRule(record = {}) {
  return candidate(record, 'DSR', ['caseId', 'participantId', 'allocationBasis'], {
    caseId: record.caseId || '', participantId: record.participantId || '', benefitShare: record.benefitShare ?? '', operatingCostShare: record.operatingCostShare ?? '',
    investmentShare: record.investmentShare ?? '', riskCostShare: record.riskCostShare ?? '', allocationBasis: record.allocationBasis || '', analyticalOrNegotiated: record.analyticalOrNegotiated || '',
    acceptanceStatus: record.acceptanceStatus || 'Unresolved', decisionOwnerId: record.decisionOwnerId || '', evidenceIds: ids(record.evidenceIds), status: record.status || 'Draft',
  });
}
export function normalizeUnpricedEffect(record = {}) {
  return candidate(record, 'UPE', ['caseId', 'effectClass', 'description', 'ownerId'], {
    caseId: record.caseId || '', affectedParticipantIds: ids(record.affectedParticipantIds), effectClass: record.effectClass || '', description: record.description || '', direction: record.direction || '',
    magnitude: record.magnitude ?? '', duration: record.duration || '', reversibility: record.reversibility || '', distributionalConcern: record.distributionalConcern || '', decisionTreatment: record.decisionTreatment || '', ownerId: record.ownerId || '', evidenceIds: ids(record.evidenceIds), status: record.status || 'Draft',
  });
}
export function normalizeParticipantEconomicCase(record = {}) {
  return { ...record, id: record.id || stableId(record.participantId || record.name || 'participant-economic-case', 'PEC'), participantId: record.participantId || '', caseId: record.caseId || '', memberNPV: record.memberNPV ?? '', minimumCumulativeCash: record.minimumCumulativeCash ?? '', benefitShare: record.benefitShare ?? '', costShare: record.costShare ?? '', thresholdResult: record.thresholdResult || '', calculatedDisposition: record.calculatedDisposition || '', evidenceIds: ids(record.evidenceIds) };
}
export function normalizeFederationEconomicCase(record = {}) {
  return { ...record, id: record.id || stableId(record.caseId || record.name || 'federation-economic-case', 'FEC'), caseId: record.caseId || '', collectiveNPV: record.collectiveNPV ?? '', collectiveROI: record.collectiveROI ?? '', benefitCostRatio: record.benefitCostRatio ?? '', netOperatingBenefit: record.netOperatingBenefit ?? '', riskAdjustedResult: record.riskAdjustedResult ?? '', memberViabilityResult: record.memberViabilityResult || '', distributionSustainabilityResult: record.distributionSustainabilityResult || '', evidenceIds: ids(record.evidenceIds), status: record.status || 'Draft' };
}
export function evaluateMemberFinancialViability(participantCase = {}, threshold = {}) {
  const incomplete = []; const failures = [];
  if (!numeric(threshold.minimumAcceptableNPV)) incomplete.push('minimumAcceptableNPV'); else if (!numeric(participantCase.memberNPV)) incomplete.push('memberNPV'); else if (Number(participantCase.memberNPV) < Number(threshold.minimumAcceptableNPV)) failures.push('minimumAcceptableNPV');
  if (present(threshold.maximumFundingExposure)) { if (!numeric(threshold.maximumFundingExposure) || !numeric(participantCase.fundingExposure)) incomplete.push('maximumFundingExposure'); else if (Number(participantCase.fundingExposure) > Number(threshold.maximumFundingExposure)) failures.push('maximumFundingExposure'); }
  if (present(threshold.maximumLossDuration)) { if (!numeric(threshold.maximumLossDuration) || !numeric(participantCase.lossDuration)) incomplete.push('maximumLossDuration'); else if (Number(participantCase.lossDuration) > Number(threshold.maximumLossDuration)) failures.push('maximumLossDuration'); }
  return { participantId: participantCase.participantId || threshold.participantId || '', status: incomplete.length ? 'INCOMPLETE' : failures.length ? 'FAIL' : 'PASS', incomplete, failures };
}
export function evaluateRequiredMemberViability(participants = [], participantCases = [], thresholds = [], requiredParticipantIds = []) {
  const required = requiredParticipantIds.length ? requiredParticipantIds : recordArray(participants).filter(item => item.required === true).map(item => item.id);
  const perMember = required.map(participantId => evaluateMemberFinancialViability(recordArray(participantCases).find(item => item.participantId === participantId) || { participantId }, recordArray(thresholds).find(item => item.participantId === participantId) || { participantId }));
  const failingParticipantIds = perMember.filter(item => item.status === 'FAIL').map(item => item.participantId); const incompleteParticipantIds = perMember.filter(item => item.status === 'INCOMPLETE').map(item => item.participantId);
  return { perMember, failingParticipantIds, incompleteParticipantIds, overallResult: failingParticipantIds.length ? 'FAIL' : incompleteParticipantIds.length ? 'INCOMPLETE' : 'PASS' };
}

const SHARE_CLASSES = { benefit: 'benefitShare', operatingCost: 'operatingCostShare', investment: 'investmentShare', riskCost: 'riskCostShare' };
export function validateDistributionRules(caseId, rules = [], includedFlowClasses = [], tolerance = 1e-9) {
  const selected = recordArray(rules).filter(rule => rule.caseId === caseId); const shared = new Set(recordArray(includedFlowClasses));
  const checks = Object.fromEntries(Object.entries(SHARE_CLASSES).map(([name, field]) => {
    const values = selected.map(rule => rule[field]); const missingParticipantIds = selected.filter(rule => !rule.participantId).map(rule => rule.id || ''); const invalidParticipantIds = selected.filter(rule => !numeric(rule[field]) || Number(rule[field]) < 0).map(rule => rule.participantId || rule.id || ''); const total = values.filter(numeric).reduce((sum, value) => sum + Number(value), 0); const requiresAllocation = shared.has(name); const valid = requiresAllocation ? !invalidParticipantIds.length && !missingParticipantIds.length && Math.abs(total - 1) <= tolerance : total === 0;
    return [name, { valid, requiresAllocation, total, missingParticipantIds, invalidParticipantIds }];
  }));
  const unacceptedParticipantIds = selected.filter(rule => rule.acceptanceStatus !== 'Accepted').map(rule => rule.participantId).filter(Boolean);
  return { caseId, valid: Object.values(checks).every(check => check.valid), benefitAllocation: checks.benefit, operatingCostAllocation: checks.operatingCost, investmentAllocation: checks.investment, riskCostAllocation: checks.riskCost, unacceptedParticipantIds, acceptanceInferred: false, fairnessConclusion: null };
}
export function distributionSustainability({ distributionValidation = {}, memberViability = {}, rules = [], unpricedEffects = [], dependencyExposure = [] } = {}) {
  if (memberViability.overallResult === 'FAIL') return { status: 'BLOCKED_MEMBER_FINANCIAL_FAILURE', mechanicalValidity: distributionValidation.valid === true, memberViability, unacceptedParticipantIds: [], unpricedEffects, dependencyExposure };
  if (memberViability.overallResult !== 'PASS' || distributionValidation.valid !== true) return { status: 'INCOMPLETE', mechanicalValidity: distributionValidation.valid === true, memberViability, unacceptedParticipantIds: [], unpricedEffects, dependencyExposure };
  const unacceptedParticipantIds = recordArray(rules).filter(rule => rule.acceptanceStatus !== 'Accepted').map(rule => rule.participantId).filter(Boolean);
  const contested = unacceptedParticipantIds.length || recordArray(unpricedEffects).length || recordArray(dependencyExposure).length;
  return { status: contested ? 'CONTESTED' : 'SUSTAINABLE_FOR_DECISION_REVIEW', mechanicalValidity: true, memberViability, unacceptedParticipantIds, unpricedEffects, dependencyExposure };
}

const caseEconomics = (workspace, caseId) => {
  const flows = recordArray(workspace.economicFlows).filter(flow => flow.caseId === caseId); const included = flows.filter(flow => flow.type !== 'Internal Transfer'); const signed = flow => flow.direction === 'Outflow' ? -Math.abs(Number(flow.amount || 0)) : Math.abs(Number(flow.amount || 0));
  const gross = included.reduce((sum, flow) => sum + signed(flow), 0); const riskAdjustment = recordArray(workspace.riskAdjustments).filter(item => item.caseId === caseId).reduce((sum, item) => sum + Math.abs(Number(item.amount || 0)), 0);
  return { caseId, gross, riskAdjustment, riskAdjusted: gross - riskAdjustment, excludedInternalTransferIds: flows.filter(flow => flow.type === 'Internal Transfer').map(flow => flow.id) };
};
export function classifyEconomicAttribution(selectedCase = {}, comparatorCase = {}) {
  if (!selectedCase?.id || !comparatorCase?.id || selectedCase.comparatorCaseId !== comparatorCase.id) return 'UNRESOLVED';
  if (selectedCase.caseType === 'FEDERATION_NON_AI' && comparatorCase.caseType === 'BEST_NON_FEDERATION') return 'FEDERATION_INCREMENT';
  if (selectedCase.caseType === 'FEDERATION_BOUNDED_AI' && comparatorCase.caseType === 'FEDERATION_NON_AI') return 'BOUNDED_AI_INCREMENT';
  return 'OTHER_COMPARISON';
}
export function scenarioComparison(workspace = {}, caseId = '') {
  const scenarios = recordArray(workspace.counterfactuals).map(normalizeCounterfactual); const selectedCase = scenarios.find(item => item.id === caseId) || null;
  if (!selectedCase) return { selectedCase: null, comparatorCase: null, comparatorResolutionStatus: 'CASE_NOT_FOUND', caseEconomics: null, comparatorEconomics: null, incrementalEconomics: null, issues: ['Selected scenario is missing.'] };
  if (!selectedCase.comparatorCaseId) return { selectedCase, comparatorCase: null, comparatorResolutionStatus: 'UNRESOLVED', caseEconomics: caseEconomics(workspace, selectedCase.id), comparatorEconomics: null, incrementalEconomics: null, issues: ['Scenario has no explicit comparator.'] };
  const comparatorCase = scenarios.find(item => item.id === selectedCase.comparatorCaseId) || null;
  if (!comparatorCase) return { selectedCase, comparatorCase: null, comparatorResolutionStatus: 'MISSING', caseEconomics: caseEconomics(workspace, selectedCase.id), comparatorEconomics: null, incrementalEconomics: null, issues: ['Referenced comparator scenario is missing.'] };
  const selectedEconomics = caseEconomics(workspace, selectedCase.id); const comparatorEconomics = caseEconomics(workspace, comparatorCase.id);
  return { selectedCase, comparatorCase, comparatorResolutionStatus: 'RESOLVED', caseEconomics: selectedEconomics, comparatorEconomics, incrementalEconomics: { gross: selectedEconomics.gross - comparatorEconomics.gross, riskAdjusted: selectedEconomics.riskAdjusted - comparatorEconomics.riskAdjusted }, attribution: classifyEconomicAttribution(selectedCase, comparatorCase), issues: [] };
}
