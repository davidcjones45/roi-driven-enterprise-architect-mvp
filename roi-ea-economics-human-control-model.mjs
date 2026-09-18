/**
 * ROI-Driven Enterprise Architect — A5 Economics & Human Control foundation.
 *
 * Adds explicit delegation economics, specification/assurance costs,
 * meaningful Human-Control Capacity, and benefit-funding states.
 *
 * This module does not collapse authorization, risk, impact, necessity,
 * consequence, or strategic value into a single ROI score.
 */

const text = value => String(value ?? '').trim();
const list = value => Array.isArray(value) ? value : value == null ? [] : [value];
const unique = value => [...new Set(list(value).map(text).filter(Boolean))];
const numeric = value => value !== '' && value !== null && value !== undefined && Number.isFinite(Number(value));
const number = value => numeric(value) ? Number(value) : null;
const iso = value => {
  const raw = text(value);
  if (!raw || Number.isNaN(Date.parse(raw))) return '';
  return new Date(raw).toISOString();
};

export const DELEGATION_COST_CLASSES = Object.freeze([
  'IMPLEMENTATION',
  'SPECIFICATION',
  'OPERATING',
  'VERIFICATION_ASSURANCE',
  'HUMAN_CONTROL',
  'DEPENDENCY',
  'RECOVERY_FALLBACK',
  'TRANSITION',
  'EXIT'
]);

export const BENEFIT_CATEGORIES = Object.freeze([
  'CASHABLE','CAPACITY','PROTECTIVE','STRATEGIC'
]);

export const BENEFIT_FUNDING_STATES = Object.freeze([
  'PROJECTED','EMERGING','VALIDATED','AVAILABLE','COMMITTED'
]);

export const SPECIFICATION_QUALITY_STATES = Object.freeze([
  'DRAFT','REVIEW_REQUIRED','ACCEPTED','DEGRADED','SUPERSEDED'
]);

export function normalizeDelegationCost(record = {}) {
  const costClass = text(record.costClass).toUpperCase();
  const errors = [];
  if (!text(record.id)) errors.push('cost id is required.');
  if (!DELEGATION_COST_CLASSES.includes(costClass)) errors.push('costClass is not recognized.');
  if (!numeric(record.amount) || Number(record.amount) < 0) errors.push('amount must be a non-negative number.');
  return {
    id:text(record.id),
    caseId:text(record.caseId),
    costClass,
    amount:number(record.amount),
    currency:text(record.currency || 'USD'),
    period:text(record.period),
    recurring:record.recurring === true,
    evidenceIds:unique(record.evidenceIds),
    assumptionIds:unique(record.assumptionIds),
    ownerId:text(record.ownerId),
    status:text(record.status || 'Draft'),
    errors
  };
}

export function normalizeDelegationBenefit(record = {}) {
  const errors = [];
  if (!text(record.id)) errors.push('benefit id is required.');
  if (!numeric(record.amount) || Number(record.amount) < 0) errors.push('amount must be a non-negative number.');
  return {
    id:text(record.id),
    caseId:text(record.caseId),
    amount:number(record.amount),
    currency:text(record.currency || 'USD'),
    period:text(record.period),
    evidenceIds:unique(record.evidenceIds),
    assumptionIds:unique(record.assumptionIds),
    ownerId:text(record.ownerId),
    status:text(record.status || 'Draft'),
    errors
  };
}

/**
 * Net Delegation Value is intentionally narrow:
 * expected business value minus named delegation lifecycle costs.
 *
 * It does not incorporate authorization, impact, necessity, strategic value,
 * or adverse-exposure acceptance into one score.
 */
export function calculateDelegationEconomics({
  caseId = '',
  benefits = [],
  costs = [],
  adverseExposure = null,
  necessity = '',
  strategicValue = '',
  authorizationState = '',
  impactState = ''
} = {}) {
  const normalizedBenefits = benefits.map(normalizeDelegationBenefit);
  const normalizedCosts = costs.map(normalizeDelegationCost);
  const issues = [
    ...normalizedBenefits.flatMap(item => item.errors),
    ...normalizedCosts.flatMap(item => item.errors)
  ];

  const expectedBusinessValue = normalizedBenefits.reduce(
    (sum,item) => sum + (item.amount ?? 0), 0
  );

  const byCostClass = Object.fromEntries(DELEGATION_COST_CLASSES.map(costClass => [
    costClass,
    normalizedCosts
      .filter(item => item.costClass === costClass)
      .reduce((sum,item) => sum + (item.amount ?? 0), 0)
  ]));

  const totalDelegationCost = Object.values(byCostClass).reduce((a,b)=>a+b,0);
  const netDelegationValue = expectedBusinessValue - totalDelegationCost;

  return {
    caseId:text(caseId),
    expectedBusinessValue,
    totalDelegationCost,
    byCostClass,
    netDelegationValue,
    adverseExposure:number(adverseExposure),
    necessity:text(necessity),
    strategicValue:text(strategicValue),
    authorizationState:text(authorizationState),
    impactState:text(impactState),
    status:issues.length ? 'INCOMPLETE' : 'PASS',
    issues,

    // Explicit anti-collapse controls.
    authorizationIncludedInScore:false,
    impactIncludedInScore:false,
    necessityIncludedInScore:false,
    strategicValueIncludedInScore:false,
    adverseExposureAutomaticallyAccepted:false,
    universalAIScore:null
  };
}

export function normalizeSpecificationRecord(record = {}) {
  const qualityState = text(record.qualityState || 'DRAFT').toUpperCase();
  const errors = [];
  if (!text(record.id)) errors.push('specification id is required.');
  if (!text(record.deploymentId)) errors.push('deploymentId is required.');
  if (!text(record.ownerId)) errors.push('ownerId is required.');
  if (!text(record.version)) errors.push('version is required.');
  if (!iso(record.effectiveFrom)) errors.push('effectiveFrom is required and must be valid.');
  if (!SPECIFICATION_QUALITY_STATES.includes(qualityState)) errors.push('qualityState is not recognized.');
  if (record.maintenanceCost !== undefined && (!numeric(record.maintenanceCost) || Number(record.maintenanceCost) < 0)) {
    errors.push('maintenanceCost must be a non-negative number when supplied.');
  }
  return {
    id:text(record.id),
    deploymentId:text(record.deploymentId),
    ownerId:text(record.ownerId),
    version:text(record.version),
    objective:text(record.objective),
    ruleRefs:unique(record.ruleRefs),
    qualityState,
    effectiveFrom:iso(record.effectiveFrom),
    effectiveTo:iso(record.effectiveTo),
    maintenanceCost:number(record.maintenanceCost) ?? 0,
    evidenceIds:unique(record.evidenceIds),
    changeTriggerRefs:unique(record.changeTriggerRefs),
    supersedesId:text(record.supersedesId),
    status:text(record.status || 'Draft'),
    errors
  };
}

export function specificationReassessmentRequired({
  specification = {},
  changedFact = {}
} = {}) {
  const spec = normalizeSpecificationRecord(specification);
  const changeId = text(changedFact.id);
  const explicitTrigger = changeId && spec.changeTriggerRefs.includes(changeId);
  const sameDeployment = text(changedFact.subjectId) && text(changedFact.subjectId) === spec.deploymentId;
  const materialSpecificationChange = [
    'PURPOSE','SPECIFICATION','MODEL_VERSION','TOOL_ACCESS','DATA_SCOPE',
    'AUTHORITY_SCOPE','HUMAN_OVERSIGHT','OPERATING_CONTEXT'
  ].includes(text(changedFact.changeType).toUpperCase());

  const required = Boolean(explicitTrigger || (sameDeployment && materialSpecificationChange));

  return {
    specificationId:spec.id,
    changeId,
    reassessmentRequired:required,
    automaticAcceptance:false,
    qualityStateAfterChange:required ? 'REVIEW_REQUIRED' : spec.qualityState
  };
}

export function normalizeAssuranceActivity(record = {}) {
  const errors = [];
  if (!text(record.id)) errors.push('assurance activity id is required.');
  if (!text(record.subjectId)) errors.push('subjectId is required.');
  if (!text(record.ownerId)) errors.push('ownerId is required.');
  if (!numeric(record.cost) || Number(record.cost) < 0) errors.push('cost must be a non-negative number.');
  return {
    id:text(record.id),
    subjectId:text(record.subjectId),
    ownerId:text(record.ownerId),
    activityType:text(record.activityType),
    cost:number(record.cost),
    recurring:record.recurring === true,
    frequency:text(record.frequency),
    evidenceIds:unique(record.evidenceIds),
    result:text(record.result || 'NOT_ASSESSED'),
    status:text(record.status || 'Draft'),
    errors
  };
}

export const HUMAN_CONTROL_REQUIREMENTS = Object.freeze([
  'COMPETENCE',
  'INFORMATION',
  'TIME',
  'ATTENTION_CAPACITY',
  'AUTHORITY',
  'INDEPENDENCE',
  'USABLE_INTERFACE',
  'INTERVENTION_MECHANISM',
  'ESCALATION_STOP_PATH',
  'EVIDENCE_OF_OPERATION'
]);

export function normalizeReviewerPool(record = {}) {
  const errors = [];
  if (!text(record.id)) errors.push('reviewer pool id is required.');
  if (!text(record.ownerId)) errors.push('ownerId is required.');
  if (!numeric(record.availableMinutes) || Number(record.availableMinutes) < 0) errors.push('availableMinutes must be a non-negative number.');
  return {
    id:text(record.id),
    ownerId:text(record.ownerId),
    period:text(record.period),
    availableMinutes:number(record.availableMinutes),
    competenceTags:unique(record.competenceTags),
    authorityRefs:unique(record.authorityRefs),
    independenceConfirmed:record.independenceConfirmed === true,
    evidenceIds:unique(record.evidenceIds),
    status:text(record.status || 'Active'),
    errors
  };
}

export function normalizeHumanControlRequirement(record = {}) {
  const errors = [];
  if (!text(record.id)) errors.push('human control requirement id is required.');
  if (!text(record.deploymentId)) errors.push('deploymentId is required.');
  if (!text(record.reviewerPoolId)) errors.push('reviewerPoolId is required.');
  if (!numeric(record.caseVolume) || Number(record.caseVolume) < 0) errors.push('caseVolume must be a non-negative number.');
  if (!numeric(record.minutesPerCase) || Number(record.minutesPerCase) < 0) errors.push('minutesPerCase must be a non-negative number.');
  if (!numeric(record.escalationMinutes) || Number(record.escalationMinutes) < 0) errors.push('escalationMinutes must be a non-negative number.');
  if (!numeric(record.exceptionMinutes) || Number(record.exceptionMinutes) < 0) errors.push('exceptionMinutes must be a non-negative number.');
  return {
    id:text(record.id),
    deploymentId:text(record.deploymentId),
    reviewerPoolId:text(record.reviewerPoolId),
    caseVolume:number(record.caseVolume),
    minutesPerCase:number(record.minutesPerCase),
    escalationMinutes:number(record.escalationMinutes),
    exceptionMinutes:number(record.exceptionMinutes),
    requiredCompetenceTags:unique(record.requiredCompetenceTags),
    requiredAuthorityRefs:unique(record.requiredAuthorityRefs),
    requirementEvidenceIds:unique(record.requirementEvidenceIds),
    informationAvailable:record.informationAvailable === true,
    usableInterface:record.usableInterface === true,
    interventionMechanism:record.interventionMechanism === true,
    escalationStopPath:record.escalationStopPath === true,
    operatingEvidenceIds:unique(record.operatingEvidenceIds),
    independenceRequired:record.independenceRequired === true,
    status:text(record.status || 'Draft'),
    errors
  };
}

export function evaluateHumanControlCapacity({
  requirement = {},
  reviewerPool = {}
} = {}) {
  const req = normalizeHumanControlRequirement(requirement);
  const pool = normalizeReviewerPool(reviewerPool);
  const issues = [...req.errors,...pool.errors];

  if (req.reviewerPoolId && pool.id !== req.reviewerPoolId) {
    issues.push('reviewerPoolId does not match supplied reviewer pool.');
  }

  const demandMinutes =
    (req.caseVolume ?? 0) * (req.minutesPerCase ?? 0) +
    (req.escalationMinutes ?? 0) +
    (req.exceptionMinutes ?? 0);

  const capacityMarginMinutes = (pool.availableMinutes ?? 0) - demandMinutes;
  const competenceSatisfied = req.requiredCompetenceTags.every(tag => pool.competenceTags.includes(tag));
  const authoritySatisfied = req.requiredAuthorityRefs.every(ref => pool.authorityRefs.includes(ref));
  const independenceSatisfied = !req.independenceRequired || pool.independenceConfirmed === true;
  const informationSatisfied = req.informationAvailable === true;
  const interfaceSatisfied = req.usableInterface === true;
  const interventionSatisfied = req.interventionMechanism === true;
  const escalationSatisfied = req.escalationStopPath === true;
  const evidenceSatisfied = req.operatingEvidenceIds.length > 0;

  const conditions = {
    competence:competenceSatisfied,
    information:informationSatisfied,
    time:capacityMarginMinutes >= 0,
    attentionCapacity:capacityMarginMinutes >= 0,
    authority:authoritySatisfied,
    independence:independenceSatisfied,
    usableInterface:interfaceSatisfied,
    interventionMechanism:interventionSatisfied,
    escalationStopPath:escalationSatisfied,
    evidenceOfOperation:evidenceSatisfied
  };

  const meaningful = issues.length === 0 && Object.values(conditions).every(Boolean);

  return {
    requirement:req,
    reviewerPool:pool,
    demandMinutes,
    availableMinutes:pool.availableMinutes ?? 0,
    capacityMarginMinutes,
    utilization:pool.availableMinutes > 0 ? demandMinutes / pool.availableMinutes : (demandMinutes === 0 ? 0 : null),
    conditions,
    meaningfulHumanControl:meaningful,
    status:issues.length ? 'INCOMPLETE' : meaningful ? 'PASS' : 'FAIL',
    issues,
    humanPresenceAloneSufficient:false
  };
}

export function aggregateHumanControlCapacity({
  requirements = [],
  reviewerPools = []
} = {}) {
  const poolMap = new Map(reviewerPools.map(pool => {
    const normalized = normalizeReviewerPool(pool);
    return [normalized.id, normalized];
  }));

  const perRequirement = requirements.map(req => {
    const normalized = normalizeHumanControlRequirement(req);
    return evaluateHumanControlCapacity({
      requirement:normalized,
      reviewerPool:poolMap.get(normalized.reviewerPoolId) || {}
    });
  });

  const byPool = [...poolMap.values()].map(pool => {
    const rows = perRequirement.filter(row => row.requirement.reviewerPoolId === pool.id);
    const demandMinutes = rows.reduce((sum,row)=>sum+row.demandMinutes,0);
    const capacityMarginMinutes = (pool.availableMinutes ?? 0) - demandMinutes;
    return {
      reviewerPoolId:pool.id,
      demandMinutes,
      availableMinutes:pool.availableMinutes ?? 0,
      capacityMarginMinutes,
      overcommitted:capacityMarginMinutes < 0,
      requirementIds:rows.map(row=>row.requirement.id)
    };
  });

  return {
    perRequirement,
    byPool,
    anyOvercommitted:byPool.some(row=>row.overcommitted)
  };
}

export function normalizeBenefitRecord(record = {}) {
  const category = text(record.category).toUpperCase();
  const state = text(record.state || 'PROJECTED').toUpperCase();
  const errors = [];
  if (!text(record.id)) errors.push('benefit id is required.');
  if (!BENEFIT_CATEGORIES.includes(category)) errors.push('benefit category is not recognized.');
  if (!BENEFIT_FUNDING_STATES.includes(state)) errors.push('benefit funding state is not recognized.');
  if (!numeric(record.amount) || Number(record.amount) < 0) errors.push('amount must be a non-negative number.');
  return {
    id:text(record.id),
    category,
    state,
    amount:number(record.amount),
    unit:text(record.unit || (category === 'CAPACITY' ? 'hours' : 'USD')),
    baselineRef:text(record.baselineRef),
    mechanism:text(record.mechanism),
    ownerId:text(record.ownerId),
    financeValidationId:text(record.financeValidationId),
    operatingValidationId:text(record.operatingValidationId),
    evidenceIds:unique(record.evidenceIds),
    availableAmount:number(record.availableAmount) ?? 0,
    committedAmount:number(record.committedAmount) ?? 0,
    status:text(record.status || 'Draft'),
    errors
  };
}

const stateIndex = state => BENEFIT_FUNDING_STATES.indexOf(state);

export function validateBenefitState(record = {}) {
  const benefit = normalizeBenefitRecord(record);
  const issues = [...benefit.errors];

  if (['VALIDATED','AVAILABLE','COMMITTED'].includes(benefit.state) && !benefit.evidenceIds.length) {
    issues.push(`${benefit.state} benefit requires evidence.`);
  }

  if (benefit.state === 'AVAILABLE') {
    if (benefit.category === 'CASHABLE' && !benefit.financeValidationId) {
      issues.push('Cashable benefit requires finance validation before becoming AVAILABLE.');
    }
    if (benefit.category === 'CAPACITY' && !benefit.operatingValidationId) {
      issues.push('Capacity benefit requires operating-owner validation before becoming AVAILABLE.');
    }
    if (['PROTECTIVE','STRATEGIC'].includes(benefit.category)) {
      issues.push(`${benefit.category} benefit cannot become AVAILABLE funding/capacity.`);
    }
    if (benefit.availableAmount <= 0) issues.push('AVAILABLE benefit requires a positive availableAmount.');
  }

  if (benefit.state === 'COMMITTED') {
    if (benefit.committedAmount <= 0) issues.push('COMMITTED benefit requires a positive committedAmount.');
    if (benefit.committedAmount > benefit.availableAmount) issues.push('committedAmount cannot exceed availableAmount.');
  }

  return {
    benefit,
    valid:issues.length === 0,
    status:issues.length ? 'INCOMPLETE' : 'PASS',
    issues
  };
}

export function validateBenefitTransition(previousRecord = {}, nextRecord = {}) {
  const prev = normalizeBenefitRecord(previousRecord);
  const next = normalizeBenefitRecord(nextRecord);
  const issues = [];

  if (prev.id && next.id && prev.id !== next.id) issues.push('benefit id cannot change during transition.');
  if (prev.category && next.category && prev.category !== next.category) issues.push('benefit category cannot change silently.');
  const prevIndex = stateIndex(prev.state);
  const nextIndex = stateIndex(next.state);
  if (nextIndex < prevIndex) issues.push('benefit funding state cannot move backward without a superseding/correction process.');
  if (nextIndex > prevIndex + 1) issues.push('benefit funding state cannot skip maturity states.');

  issues.push(...validateBenefitState(next).issues);

  return {
    valid:issues.length === 0,
    status:issues.length ? 'INCOMPLETE' : 'PASS',
    issues,
    previous:prev,
    next
  };
}

export function normalizeFundingAllocation(record = {}) {
  const errors = [];
  if (!text(record.id)) errors.push('funding allocation id is required.');
  if (!text(record.sourceBenefitId)) errors.push('sourceBenefitId is required.');
  if (!text(record.targetInitiativeId)) errors.push('targetInitiativeId is required.');
  if (!text(record.authorityId)) errors.push('authorityId is required.');
  if (!numeric(record.amount) || Number(record.amount) <= 0) errors.push('amount must be a positive number.');
  return {
    id:text(record.id),
    sourceBenefitId:text(record.sourceBenefitId),
    targetInitiativeId:text(record.targetInitiativeId),
    authorityId:text(record.authorityId),
    amount:number(record.amount),
    effectiveTime:iso(record.effectiveTime),
    evidenceIds:unique(record.evidenceIds),
    status:text(record.status || 'Draft'),
    errors
  };
}

export function validateFundingAllocation({
  allocation = {},
  benefit = {},
  priorAllocations = []
} = {}) {
  const alloc = normalizeFundingAllocation(allocation);
  const benCheck = validateBenefitState(benefit);
  const ben = benCheck.benefit;
  const issues = [...alloc.errors,...benCheck.issues];

  if (alloc.sourceBenefitId && alloc.sourceBenefitId !== ben.id) {
    issues.push('sourceBenefitId does not match supplied benefit.');
  }
  if (ben.state !== 'AVAILABLE' && ben.state !== 'COMMITTED') {
    issues.push('Only AVAILABLE or already-partially-COMMITTED benefit can fund an allocation.');
  }
  if (!['CASHABLE','CAPACITY'].includes(ben.category)) {
    issues.push('Only CASHABLE or CAPACITY benefits may be allocated as funding/capacity.');
  }

  const previouslyCommitted = priorAllocations
    .filter(item => text(item.sourceBenefitId) === ben.id)
    .reduce((sum,item)=>sum+(number(item.amount) ?? 0),0);

  const remainingAvailable = (ben.availableAmount ?? 0) - previouslyCommitted;
  if ((alloc.amount ?? 0) > remainingAvailable) {
    issues.push('allocation exceeds remaining available benefit.');
  }

  return {
    valid:issues.length === 0,
    status:issues.length ? 'INCOMPLETE' : 'PASS',
    issues,
    allocation:alloc,
    sourceBenefit:ben,
    previouslyCommitted,
    remainingAvailable,
    createsFundingFromProjection:false
  };
}
