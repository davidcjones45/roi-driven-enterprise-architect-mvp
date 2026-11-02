/**
 * CIF P1 economic reconciliation: opt-in, fail-closed approval gate.
 * No grant of spending authority; no mutation of legacy economic lines.
 */
const nonempty = v => typeof v === 'string' && v.trim().length > 0;
const amount = v => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const unique = xs => new Set(xs).size === xs.length;
export const BENEFIT_KINDS = Object.freeze(['CASHABLE','CAPACITY','PROTECTIVE','STRATEGIC']);
export const INVESTMENT_TRACKS = Object.freeze(['STABILIZATION','CORE_REMEDIATION','COMMERCIAL_EXPANSION']);

/** Immutable, versioned comparison basis shared by multiple investment cases. */
export function validateCommonBaseline(baseline = {}, cases = []) {
  const issues = [];
  if (!nonempty(baseline.id) || !nonempty(baseline.revision)) issues.push('Baseline ID and revision required.');
  if (!nonempty(baseline.ownerId) || !nonempty(baseline.effectiveFrom)) issues.push('Baseline owner and effective time required.');
  if (!nonempty(baseline.currency) || !nonempty(baseline.period)) issues.push('Baseline currency and period required.');
  if (!Array.isArray(baseline.evidenceRefs) || !baseline.evidenceRefs.length) issues.push('Baseline evidence required.');
  for (const item of cases) {
    if (item.baselineId !== baseline.id || item.baselineRevision !== baseline.revision)
      issues.push('Case '+(item.id || '(unknown)')+' has an incompatible baseline.');
    if (item.currency !== baseline.currency || item.period !== baseline.period)
      issues.push('Case '+(item.id || '(unknown)')+' has incompatible economic units.');
  }
  return {valid:issues.length === 0, status:issues.length ? 'INCOMPLETE' : 'PASS', issues};
}

/**
 * Allocation source IDs identify *one economic item*, even across projects.
 * Allocation shares must reconcile to 100% when submitted for a portfolio decision.
 */
export function reconcileAttributions(items = [], allocations = []) {
  const issues = [];
  const byId = new Map();
  for (const item of items) {
    if (!nonempty(item.id) || byId.has(item.id)) { issues.push('Missing or duplicate economic item ID.'); continue; }
    if (!amount(item.amount) || !nonempty(item.period) || !nonempty(item.currency))
      issues.push('Economic item '+item.id+' lacks amount, period, or currency.');
    byId.set(item.id,item);
  }
  const seen = new Set(), shares = new Map();
  for (const alloc of allocations) {
    const key = alloc.itemId+'|'+alloc.initiativeId;
    if (!byId.has(alloc.itemId)) issues.push('Allocation references unknown economic item '+alloc.itemId+'.');
    if (!nonempty(alloc.initiativeId) || !INVESTMENT_TRACKS.includes(alloc.track))
      issues.push('Allocation requires initiative and investment track.');
    if (!nonempty(alloc.method) || !nonempty(alloc.evidenceRef))
      issues.push('Allocation requires method and supporting evidence.');
    if (!amount(alloc.share) || alloc.share > 1) issues.push('Allocation share must be between zero and one.');
    if (seen.has(key)) issues.push('Duplicate allocation to initiative '+key+'.');
    seen.add(key);
    shares.set(alloc.itemId,(shares.get(alloc.itemId)||0)+(amount(alloc.share)?alloc.share:0));
  }
  for (const item of items) {
    if (Math.abs((shares.get(item.id)||0)-1)>1e-9)
      issues.push('Item '+item.id+' allocations must total 100%.');
  }
  const attributed = allocations.filter(x=>byId.has(x.itemId) && amount(x.share))
    .map(x=>({...x, attributedAmount:byId.get(x.itemId).amount*x.share}));
  return {valid:issues.length===0,status:issues.length?'INCOMPLETE':'PASS',issues,attributed};
}

/**
 * Only finance-validated cashable benefits with observed realization may enter
 * cash ROI. Capacity is *never* implicitly reclassified as payroll savings.
 * An actual cash saving needs its own cashable benefit record.
 */
export function validateCashBenefitRecognition(benefits = []) {
  const issues = [], recognized = [];
  const ids = benefits.map(x=>x.id);
  if (!unique(ids)) issues.push('Duplicate benefit IDs.');
  for (const b of benefits) {
    if (!nonempty(b.id) || !BENEFIT_KINDS.includes(b.category) || !amount(b.amount))
      issues.push('Invalid benefit ID, category, or amount.');
    if (b.category !== 'CASHABLE') continue;
    if (!nonempty(b.baselineRef) || !nonempty(b.financeValidationId) ||
        !nonempty(b.evidenceRef) || b.realizationState !== 'REALIZED' ||
        !nonempty(b.period) || !nonempty(b.currency)) {
      issues.push('Cashable benefit '+(b.id||'(unknown)')+' lacks verified realization or provenance.');
    } else if (amount(b.amount)) recognized.push(b);
  }
  return {valid:issues.length===0,status:issues.length?'INCOMPLETE':'PASS',issues,
    recognizedCashAmount:recognized.reduce((n,b)=>n+b.amount,0),recognized};
}

/** Single bounded reconciliation gate for T18-T21. */
export function assessP1Economics({baseline={},cases=[],costItems=[],costAllocations=[],benefitItems=[],benefitAllocations=[]}={}) {
  const base=validateCommonBaseline(baseline,cases);
  const costs=reconcileAttributions(costItems,costAllocations);
  const benefitAllocationsCheck=reconcileAttributions(benefitItems,benefitAllocations);
  const benefits=validateCashBenefitRecognition(benefitItems);
  const issues=[...base.issues,...costs.issues,...benefitAllocationsCheck.issues,...benefits.issues];
  return {decisionReady:issues.length===0,status:issues.length?'INCOMPLETE':'PASS',issues,
    baseline:base,costs,benefitAllocations:benefitAllocationsCheck,benefits};
}
