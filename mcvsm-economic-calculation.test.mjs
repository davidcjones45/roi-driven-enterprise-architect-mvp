import assert from 'node:assert/strict';
import test from 'node:test';
import { buildCaseCashFlowSchedule, buildIncrementalCashFlowSchedule, calculateBenefitCostRatio, calculateFederationEconomicCase, calculateNPV, calculatePresentValueSchedule, calculateROI, calculateScenarioEconomicIncrement, normalizeEconomicCalculationAssumptions, normalizeEconomicPeriod } from './federated-fofa-mcvsm-model.mjs';

const assumptions = caseId => ({ id: `ASM-${caseId}`, caseId, discountRate: 0.08, annualGrowthRate: 0.03, horizonPeriods: 5, basePeriod: 0, currency: 'USD', taxTreatment: 'Pre-tax', inflationTreatment: 'Real / no inflation escalation', roiDenominatorRule: 'TOTAL_DISCOUNTED_COST', evidenceIds: ['EVD-SYNTHETIC'], assumptionIds: ['ASM-SYNTHETIC'], status: 'Synthetic / modeled' });
const flows = (caseId, benefit, operatingCost, investment) => [{ id: `${caseId}-INV`, caseId, periodIndex: 0, amount: investment, direction: 'Outflow', type: 'External Cost', flowClass: 'investment', status: 'Synthetic / modeled' }, { id: `${caseId}-BEN`, caseId, periodIndex: 1, amount: benefit, direction: 'Inflow', type: 'External Revenue', flowClass: 'benefit', status: 'Synthetic / modeled' }, { id: `${caseId}-COST`, caseId, periodIndex: 1, amount: operatingCost, direction: 'Outflow', type: 'External Cost', flowClass: 'operating cost', status: 'Synthetic / modeled' }];

test('periodized MCVSM schedule reproduces reviewed synthetic C2-C1 and C3-C2 targets', () => {
  const c2 = calculateFederationEconomicCase({ caseId: 'C2-C1', periodFlows: flows('C2-C1', 439200, 150000, 450000), assumptions: assumptions('C2-C1') });
  const c3 = calculateFederationEconomicCase({ caseId: 'C3-C2', periodFlows: flows('C3-C2', 183780, 100000, 160000), assumptions: assumptions('C3-C2') });
  assert.equal(c2.status, 'PASS'); assert.ok(Math.abs(c2.collectiveNPV - 770525.48) < 1); assert.ok(Math.abs(c2.collectiveROI - 0.711439) < 0.0001); assert.ok(Math.abs(c2.benefitCostRatio - 1.7114) < 0.0001);
  assert.equal(c3.status, 'PASS'); assert.ok(Math.abs(c3.collectiveNPV - 193580.99) < 1); assert.ok(Math.abs(c3.collectiveROI - 0.332593) < 0.0001); assert.ok(Math.abs(c3.benefitCostRatio - 1.3326) < 0.0001);
});

test('periodization preserves Y0, grows only after year one, and exposes transparent PV arithmetic', () => {
  const periods = Array.from({ length: 6 }, (_, periodIndex) => normalizeEconomicPeriod({ caseId: 'C2-C1', periodIndex, periodLabel: `Y${periodIndex}` }));
  const schedule = buildCaseCashFlowSchedule({ caseId: 'C2-C1', baseFlows: flows('C2-C1', 439200, 150000, 450000), periods, assumptions: assumptions('C2-C1') }); const pv = calculatePresentValueSchedule(schedule, assumptions('C2-C1'));
  assert.equal(schedule.netCashFlowByPeriod[0].netCashFlow, -450000); assert.equal(schedule.periodFlows[1][0].amount, 439200); assert.ok(Math.abs(schedule.periodFlows[2][0].amount - 452376) < 0.001); assert.equal(pv.periods[0].discountFactor, 1); assert.ok(Math.abs(calculateNPV(pv).npv - 770525.476084062) < 0.01);
  assert.equal(calculateROI({ pvBenefits: 100, pvCosts: 50, denominatorRule: '' }).status, 'INCOMPLETE'); assert.equal(calculateBenefitCostRatio({ pvBenefits: 100, pvCosts: 0 }).status, 'INCOMPLETE');
});

test('public comparator-aware calculation derives incremental ratios from calculated case schedules', () => {
  const calc = (caseId, benefit, cost, investment, rule) => calculateFederationEconomicCase({ caseId, periodFlows: flows(caseId, benefit, cost, investment), assumptions: { ...assumptions(caseId), roiDenominatorRule: rule } });
  const workspace = { counterfactuals: [{ id: 'C1', caseType: 'BEST_NON_FEDERATION' }, { id: 'C2', caseType: 'FEDERATION_NON_AI', comparatorCaseId: 'C1' }, { id: 'C3', caseType: 'FEDERATION_BOUNDED_AI', comparatorCaseId: 'C2' }], economicFlows: [], riskAdjustments: [] };
  const c1 = calc('C1', 0, 0, 0, 'TOTAL_DISCOUNTED_COST'); const c2 = calc('C2', 439200, 150000, 450000, 'TOTAL_DISCOUNTED_COST');
  const c2Increment = calculateScenarioEconomicIncrement({ workspace, selectedCaseId: 'C2', calculatedCases: [c1, c2], assumptions: assumptions('C2') });
  assert.equal(c2Increment.attribution, 'FEDERATION_INCREMENT'); assert.ok(Math.abs(c2Increment.collectiveNPV - 770525.48) < 1); assert.ok(Math.abs(c2Increment.collectiveROI - 0.711439) < 0.0001); assert.ok(Math.abs(c2Increment.benefitCostRatio - 1.7114) < 0.0001); assert.ok(Math.abs(c2Increment.collectiveNPV - (c2.collectiveNPV - c1.collectiveNPV)) < 0.01);
  const c3 = calc('C3', 622980, 250000, 610000, 'TOTAL_DISCOUNTED_COST'); const c3Increment = calculateScenarioEconomicIncrement({ workspace, selectedCaseId: 'C3', calculatedCases: [c2, c3], assumptions: assumptions('C3') });
  assert.equal(c3Increment.attribution, 'BOUNDED_AI_INCREMENT'); assert.ok(Math.abs(c3Increment.collectiveNPV - 193580.99) < 1); assert.ok(Math.abs(c3Increment.collectiveROI - 0.332593) < 0.0001); assert.ok(Math.abs(c3Increment.benefitCostRatio - 1.3326) < 0.0001);
  const cA = calculateFederationEconomicCase({ caseId: 'A', periodFlows: flows('A', 200, 80, 100), assumptions: { ...assumptions('A'), annualGrowthRate: 0, discountRate: 0, horizonPeriods: 1 } }); const cB = calculateFederationEconomicCase({ caseId: 'B', periodFlows: flows('B', 260, 100, 150), assumptions: { ...assumptions('B'), annualGrowthRate: 0, discountRate: 0, horizonPeriods: 1 } }); const nonzero = calculateScenarioEconomicIncrement({ workspace: { counterfactuals: [{ id: 'A', caseType: 'BEST_NON_FEDERATION' }, { id: 'B', caseType: 'FEDERATION_NON_AI', comparatorCaseId: 'A' }], economicFlows: [], riskAdjustments: [] }, selectedCaseId: 'B', calculatedCases: [cA, cB], assumptions: { ...assumptions('B'), annualGrowthRate: 0, discountRate: 0, horizonPeriods: 1 } });
  assert.equal(nonzero.collectiveNPV, -10); assert.ok(Math.abs(nonzero.collectiveROI + 0.142857142857) < 0.0001); assert.ok(Math.abs(nonzero.benefitCostRatio - 0.857142857142) < 0.0001); assert.notEqual(nonzero.collectiveROI, cB.collectiveROI - cA.collectiveROI); assert.notEqual(nonzero.benefitCostRatio, cB.benefitCostRatio / cA.benefitCostRatio);
  assert.equal(calculateScenarioEconomicIncrement({ workspace, selectedCaseId: 'C2', calculatedCases: [c2], assumptions: assumptions('C2') }).status, 'INCOMPLETE');
  assert.equal(calculateScenarioEconomicIncrement({ workspace, selectedCaseId: 'C2', calculatedCases: [c1, { ...c2, cashFlowSchedule: undefined }], assumptions: assumptions('C2') }).status, 'INCOMPLETE');
  assert.equal(calculateScenarioEconomicIncrement({ workspace, selectedCaseId: 'C2', calculatedCases: [c1, { ...c2, cashFlowSchedule: { ...c2.cashFlowSchedule, periodFlows: c2.cashFlowSchedule.periodFlows.slice(1) } }], assumptions: assumptions('C2') }).status, 'INCOMPLETE');
  assert.equal(c1.cashFlowSchedule.periodFlows[1][0].amount, 0);
  const withInternalTransfer = calculateFederationEconomicCase({ caseId: 'INT', periodFlows: [...flows('INT', 60, 20, 50), { id: 'INT-XFER', caseId: 'INT', periodIndex: 1, amount: 9999, direction: 'Inflow', type: 'Internal Transfer', flowClass: 'transfer' }], assumptions: { ...assumptions('INT'), annualGrowthRate: 0, discountRate: 0, horizonPeriods: 1 } });
  assert.equal(withInternalTransfer.collectiveNPV, -10);
});
