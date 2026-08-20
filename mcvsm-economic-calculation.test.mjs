import assert from 'node:assert/strict';
import test from 'node:test';
import { buildCaseCashFlowSchedule, calculateBenefitCostRatio, calculateFederationEconomicCase, calculateNPV, calculatePresentValueSchedule, calculateROI, normalizeEconomicCalculationAssumptions, normalizeEconomicPeriod } from './federated-fofa-mcvsm-model.mjs';

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
