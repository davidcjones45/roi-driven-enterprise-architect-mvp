/**
 * ROI-Driven Enterprise Architect — A7 Portfolio Concentration &
 * Executive Analytics foundation.
 *
 * This module analyzes cross-deployment concentration and portfolio signals
 * without producing a universal score, ranking, authorization, or decision.
 *
 * Core separations:
 * - concentration != risk acceptance
 * - concentration != materiality conclusion
 * - executive signal != recommendation
 * - portfolio analytics != authorization
 */

const text = value => String(value ?? '').trim();
const list = value => Array.isArray(value) ? value : value == null ? [] : [value];
const unique = value => [...new Set(list(value).map(text).filter(Boolean))];
const numeric = value => value !== '' && value !== null && value !== undefined && Number.isFinite(Number(value));
const number = value => numeric(value) ? Number(value) : null;

export const EXECUTIVE_SIGNAL_TYPES = Object.freeze([
  'DEPENDENCY_CONCENTRATION',
  'AUTHORITY_CONCENTRATION',
  'HUMAN_CONTROL_BOTTLENECK',
  'BENEFIT_CONCENTRATION',
  'COMMITMENT_CONCENTRATION',
  'CORRELATED_EXPOSURE',
  'EVIDENCE_GAP',
  'PORTFOLIO_REVIEW'
]);

export const SIGNAL_SEVERITIES = Object.freeze([
  'INFORMATIONAL','ATTENTION','MATERIAL_REVIEW'
]);

const exposure = (record={}) => {
  const amount = number(record.exposure);
  return amount === null || amount < 0 ? 0 : amount;
};

export function normalizePortfolioSubject(record = {}) {
  const errors = [];
  if (!text(record.id)) errors.push('portfolio subject id is required.');
  return {
    id:text(record.id),
    deploymentId:text(record.deploymentId || record.id),
    name:text(record.name),
    dependencyIds:unique(record.dependencyIds),
    authorityIds:unique(record.authorityIds),
    reviewerPoolIds:unique(record.reviewerPoolIds),
    benefitIds:unique(record.benefitIds),
    commitmentIds:unique(record.commitmentIds),
    exposure:exposure(record),
    evidenceIds:unique(record.evidenceIds),
    status:text(record.status || 'Active'),
    errors
  };
}

export function calculateConcentration({
  subjects = [],
  dimension = '',
  selector = null,
  exposureWeighted = false
} = {}) {
  const rows = subjects.map(normalizePortfolioSubject);
  const key = text(dimension);
  const select = typeof selector === 'function'
    ? selector
    : subject => list(subject[key]);

  const buckets = new Map();
  let totalWeight = 0;

  for (const subject of rows) {
    const ids = unique(select(subject));
    const weight = exposureWeighted ? subject.exposure : 1;
    if (!ids.length || weight <= 0) continue;
    totalWeight += weight;
    for (const id of ids) {
      const current = buckets.get(id) || {
        id,
        subjectIds:[],
        subjectCount:0,
        exposure:0
      };
      current.subjectIds.push(subject.id);
      current.subjectCount += 1;
      current.exposure += weight;
      buckets.set(id,current);
    }
  }

  const denominator = exposureWeighted
    ? totalWeight
    : rows.filter(subject => unique(select(subject)).length > 0).length;

  const concentrations = [...buckets.values()].map(item => ({
    ...item,
    share:denominator > 0
      ? (exposureWeighted ? item.exposure : item.subjectCount) / denominator
      : null
  })).sort((a,b) =>
    (b.share ?? -1) - (a.share ?? -1) ||
    b.subjectCount - a.subjectCount ||
    a.id.localeCompare(b.id)
  );

  return {
    dimension:key,
    exposureWeighted,
    subjectCount:rows.length,
    denominator,
    concentrations,
    highest:concentrations[0] || null,
    status:rows.some(row=>row.errors.length) ? 'INCOMPLETE' : 'PASS',
    issues:rows.flatMap(row=>row.errors),

    // Concentration is descriptive, not dispositive.
    createsRiskAcceptance:false,
    createsMaterialityConclusion:false,
    createsAuthorization:false
  };
}

export function analyzeDependencyConcentration({
  subjects = [],
  exposureWeighted = false
} = {}) {
  return calculateConcentration({
    subjects,
    dimension:'dependencyIds',
    exposureWeighted
  });
}

export function analyzeAuthorityConcentration({
  subjects = [],
  exposureWeighted = false
} = {}) {
  return calculateConcentration({
    subjects,
    dimension:'authorityIds',
    exposureWeighted
  });
}

/* ---------------- Human-control bottlenecks ---------------- */

export function normalizeReviewerPoolCapacity(record = {}) {
  const errors = [];
  if (!text(record.id)) errors.push('reviewer pool id is required.');
  if (!numeric(record.availableMinutes) || Number(record.availableMinutes) < 0) {
    errors.push('availableMinutes must be a non-negative number.');
  }
  return {
    id:text(record.id),
    availableMinutes:number(record.availableMinutes) ?? 0,
    ownerId:text(record.ownerId),
    competenceTags:unique(record.competenceTags),
    authorityRefs:unique(record.authorityRefs),
    status:text(record.status || 'Active'),
    errors
  };
}

export function normalizeControlDemand(record = {}) {
  const errors = [];
  if (!text(record.id)) errors.push('control demand id is required.');
  if (!text(record.deploymentId)) errors.push('deploymentId is required.');
  if (!text(record.reviewerPoolId)) errors.push('reviewerPoolId is required.');
  if (!numeric(record.demandMinutes) || Number(record.demandMinutes) < 0) {
    errors.push('demandMinutes must be a non-negative number.');
  }
  return {
    id:text(record.id),
    deploymentId:text(record.deploymentId),
    reviewerPoolId:text(record.reviewerPoolId),
    demandMinutes:number(record.demandMinutes) ?? 0,
    critical:record.critical === true,
    evidenceIds:unique(record.evidenceIds),
    status:text(record.status || 'Active'),
    errors
  };
}

export function analyzeHumanControlBottlenecks({
  reviewerPools = [],
  demands = []
} = {}) {
  const pools = reviewerPools.map(normalizeReviewerPoolCapacity);
  const normalizedDemands = demands.map(normalizeControlDemand);
  const issues = [
    ...pools.flatMap(row=>row.errors),
    ...normalizedDemands.flatMap(row=>row.errors)
  ];

  const poolMap = new Map(pools.map(pool=>[pool.id,pool]));
  for (const demand of normalizedDemands) {
    if (!poolMap.has(demand.reviewerPoolId)) {
      issues.push(`control demand ${demand.id} references unknown reviewer pool ${demand.reviewerPoolId}.`);
    }
  }

  const byPool = pools.map(pool => {
    const rows = normalizedDemands.filter(d=>d.reviewerPoolId===pool.id);
    const demandMinutes = rows.reduce((sum,row)=>sum+row.demandMinutes,0);
    const marginMinutes = pool.availableMinutes - demandMinutes;
    const utilization = pool.availableMinutes > 0
      ? demandMinutes / pool.availableMinutes
      : (demandMinutes === 0 ? 0 : null);

    return {
      reviewerPoolId:pool.id,
      availableMinutes:pool.availableMinutes,
      demandMinutes,
      marginMinutes,
      utilization,
      overcommitted:marginMinutes < 0,
      criticalDeploymentIds:unique(rows.filter(r=>r.critical).map(r=>r.deploymentId)),
      deploymentIds:unique(rows.map(r=>r.deploymentId))
    };
  }).sort((a,b) =>
    Number(b.overcommitted) - Number(a.overcommitted) ||
    (b.utilization ?? -1) - (a.utilization ?? -1) ||
    a.reviewerPoolId.localeCompare(b.reviewerPoolId)
  );

  return {
    byPool,
    bottlenecks:byPool.filter(row=>row.overcommitted),
    status:issues.length ? 'INCOMPLETE' : 'PASS',
    issues,
    reviewerPresenceAloneSufficient:false,
    portfolioControlCapacityEstablished:issues.length === 0 && byPool.every(row=>!row.overcommitted)
  };
}

/* ---------------- Benefit and commitment concentration ---------------- */

export function normalizeBenefitExposure(record = {}) {
  const errors = [];
  if (!text(record.id)) errors.push('benefit id is required.');
  if (!text(record.ownerId)) errors.push('benefit ownerId is required.');
  if (!numeric(record.amount) || Number(record.amount) < 0) {
    errors.push('benefit amount must be a non-negative number.');
  }
  return {
    id:text(record.id),
    ownerId:text(record.ownerId),
    category:text(record.category),
    state:text(record.state),
    amount:number(record.amount) ?? 0,
    sourceDeploymentIds:unique(record.sourceDeploymentIds),
    evidenceIds:unique(record.evidenceIds),
    errors
  };
}

export function analyzeBenefitConcentration({
  benefits = [],
  groupBy = 'ownerId'
} = {}) {
  const rows = benefits.map(normalizeBenefitExposure);
  const total = rows.reduce((sum,row)=>sum+row.amount,0);
  const buckets = new Map();

  for (const row of rows) {
    const key = text(row[groupBy]);
    if (!key) continue;
    const current = buckets.get(key) || {
      id:key,
      amount:0,
      benefitIds:[],
      sourceDeploymentIds:[]
    };
    current.amount += row.amount;
    current.benefitIds.push(row.id);
    current.sourceDeploymentIds.push(...row.sourceDeploymentIds);
    buckets.set(key,current);
  }

  const concentrations = [...buckets.values()].map(item=>({
    ...item,
    sourceDeploymentIds:unique(item.sourceDeploymentIds),
    share:total > 0 ? item.amount / total : null
  })).sort((a,b)=>(b.share ?? -1)-(a.share ?? -1)||a.id.localeCompare(b.id));

  return {
    groupBy,
    totalBenefitAmount:total,
    concentrations,
    highest:concentrations[0] || null,
    status:rows.some(row=>row.errors.length) ? 'INCOMPLETE' : 'PASS',
    issues:rows.flatMap(row=>row.errors),
    createsFundingDecision:false,
    createsPortfolioPriority:false
  };
}

export function normalizeCommitmentExposure(record = {}) {
  const errors = [];
  if (!text(record.id)) errors.push('commitment id is required.');
  if (!text(record.ownerId)) errors.push('commitment ownerId is required.');
  if (!numeric(record.amount) || Number(record.amount) < 0) {
    errors.push('commitment amount must be a non-negative number.');
  }
  return {
    id:text(record.id),
    ownerId:text(record.ownerId),
    authorityId:text(record.authorityId),
    amount:number(record.amount) ?? 0,
    deploymentIds:unique(record.deploymentIds),
    evidenceIds:unique(record.evidenceIds),
    errors
  };
}

export function analyzeCommitmentConcentration({
  commitments = [],
  groupBy = 'ownerId'
} = {}) {
  const rows = commitments.map(normalizeCommitmentExposure);
  const total = rows.reduce((sum,row)=>sum+row.amount,0);
  const buckets = new Map();

  for (const row of rows) {
    const key = text(row[groupBy]);
    if (!key) continue;
    const current = buckets.get(key) || {
      id:key,
      amount:0,
      commitmentIds:[],
      deploymentIds:[]
    };
    current.amount += row.amount;
    current.commitmentIds.push(row.id);
    current.deploymentIds.push(...row.deploymentIds);
    buckets.set(key,current);
  }

  const concentrations = [...buckets.values()].map(item=>({
    ...item,
    deploymentIds:unique(item.deploymentIds),
    share:total > 0 ? item.amount / total : null
  })).sort((a,b)=>(b.share ?? -1)-(a.share ?? -1)||a.id.localeCompare(b.id));

  return {
    groupBy,
    totalCommitmentAmount:total,
    concentrations,
    highest:concentrations[0] || null,
    status:rows.some(row=>row.errors.length) ? 'INCOMPLETE' : 'PASS',
    issues:rows.flatMap(row=>row.errors),
    createsAuthorization:false,
    createsInvestmentDecision:false
  };
}

/* ---------------- Executive signals ---------------- */

export function makeExecutiveSignal({
  id = '',
  signalType = '',
  severity = 'ATTENTION',
  subjectIds = [],
  observation = '',
  evidenceIds = [],
  reviewOwnerId = ''
} = {}) {
  const type = text(signalType).toUpperCase();
  const sev = text(severity).toUpperCase();
  const issues = [];

  if (!text(id)) issues.push('executive signal id is required.');
  if (!EXECUTIVE_SIGNAL_TYPES.includes(type)) issues.push('signalType is not recognized.');
  if (!SIGNAL_SEVERITIES.includes(sev)) issues.push('severity is not recognized.');
  if (!text(observation)) issues.push('observation is required.');

  return {
    id:text(id),
    signalType:type,
    severity:sev,
    subjectIds:unique(subjectIds),
    observation:text(observation),
    evidenceIds:unique(evidenceIds),
    reviewOwnerId:text(reviewOwnerId),
    issues,
    status:issues.length ? 'INCOMPLETE' : 'OPEN',

    // A signal is a review cue, not a decision.
    recommendation:null,
    decision:null,
    authorization:null,
    universalPortfolioScore:null
  };
}

export function derivePortfolioSignals({
  dependencyConcentration = null,
  authorityConcentration = null,
  humanControl = null,
  benefitConcentration = null,
  commitmentConcentration = null,
  thresholds = {}
} = {}) {
  const signals = [];
  const concentrationThreshold = numeric(thresholds.concentrationShare)
    ? Number(thresholds.concentrationShare)
    : 0.5;
  const utilizationThreshold = numeric(thresholds.humanControlUtilization)
    ? Number(thresholds.humanControlUtilization)
    : 0.85;

  const addConcentration = (analysis,type,prefix,label) => {
    const highest = analysis?.highest;
    if (highest && highest.share !== null && highest.share >= concentrationThreshold) {
      signals.push(makeExecutiveSignal({
        id:`${prefix}-${highest.id}`,
        signalType:type,
        severity:highest.share >= 0.75 ? 'MATERIAL_REVIEW' : 'ATTENTION',
        subjectIds:highest.subjectIds || highest.sourceDeploymentIds || highest.deploymentIds || [],
        observation:`${label} ${highest.id} represents ${(highest.share*100).toFixed(1)}% of the analyzed portfolio basis.`
      }));
    }
  };

  addConcentration(dependencyConcentration,'DEPENDENCY_CONCENTRATION','SIG-DEP','Dependency');
  addConcentration(authorityConcentration,'AUTHORITY_CONCENTRATION','SIG-AUT','Authority');
  addConcentration(benefitConcentration,'BENEFIT_CONCENTRATION','SIG-BEN','Benefit concentration for');
  addConcentration(commitmentConcentration,'COMMITMENT_CONCENTRATION','SIG-COM','Commitment concentration for');

  for (const pool of humanControl?.byPool || []) {
    const thresholdExceeded = pool.overcommitted ||
      (pool.utilization !== null && pool.utilization >= utilizationThreshold);
    if (!thresholdExceeded) continue;
    signals.push(makeExecutiveSignal({
      id:`SIG-HC-${pool.reviewerPoolId}`,
      signalType:'HUMAN_CONTROL_BOTTLENECK',
      severity:pool.overcommitted ? 'MATERIAL_REVIEW' : 'ATTENTION',
      subjectIds:pool.deploymentIds,
      observation:pool.overcommitted
        ? `Reviewer pool ${pool.reviewerPoolId} is overcommitted by ${Math.abs(pool.marginMinutes)} minutes.`
        : `Reviewer pool ${pool.reviewerPoolId} utilization is ${(pool.utilization*100).toFixed(1)}%.`
    }));
  }

  return {
    signals,
    thresholds:{
      concentrationShare:concentrationThreshold,
      humanControlUtilization:utilizationThreshold
    },
    signalCount:signals.length,

    // Executive analytics never auto-select a portfolio action.
    recommendedPortfolioAction:null,
    selectedPriority:null,
    createsAuthorization:false,
    createsRiskAcceptance:false,
    universalPortfolioScore:null
  };
}

export function buildExecutivePortfolioSnapshot(input = {}) {
  const dependency = analyzeDependencyConcentration({
    subjects:input.subjects || [],
    exposureWeighted:input.exposureWeighted === true
  });
  const authority = analyzeAuthorityConcentration({
    subjects:input.subjects || [],
    exposureWeighted:input.exposureWeighted === true
  });
  const humanControl = analyzeHumanControlBottlenecks({
    reviewerPools:input.reviewerPools || [],
    demands:input.controlDemands || []
  });
  const benefits = analyzeBenefitConcentration({
    benefits:input.benefits || [],
    groupBy:input.benefitGroupBy || 'ownerId'
  });
  const commitments = analyzeCommitmentConcentration({
    commitments:input.commitments || [],
    groupBy:input.commitmentGroupBy || 'ownerId'
  });

  const signals = derivePortfolioSignals({
    dependencyConcentration:dependency,
    authorityConcentration:authority,
    humanControl,
    benefitConcentration:benefits,
    commitmentConcentration:commitments,
    thresholds:input.thresholds || {}
  });

  return {
    dependency,
    authority,
    humanControl,
    benefits,
    commitments,
    signals,
    status:[
      dependency.status,
      authority.status,
      humanControl.status,
      benefits.status,
      commitments.status
    ].includes('INCOMPLETE') ? 'INCOMPLETE' : 'PASS',
    executiveDecision:null,
    universalPortfolioScore:null
  };
}
