import test from 'node:test';
import assert from 'node:assert/strict';
import { M5_PORTFOLIO_FIXTURE } from './modernization-portfolio-fixture.mjs';
import { capacityAssessment, nextPortfolioActions } from './modernization-portfolio-model.mjs';

test('M5 synthetic fixture exercises headroom, saturation, and shortfall', () => {
  const capacity = capacityAssessment(
    M5_PORTFOLIO_FIXTURE.deliveryCapacities,
    M5_PORTFOLIO_FIXTURE.deliveryDemands
  );

  const architecture = capacity.find(x => x.type === 'Architecture');
  const database = capacity.find(x => x.type === 'Database engineering');
  const security = capacity.find(x => x.type === 'Security');

  assert.equal(architecture.constrained, false);
  assert.ok(architecture.availableFte > architecture.demandFte);

  assert.equal(database.constrained, false);
  assert.ok(Math.abs(database.availableFte - database.demandFte) < 1e-9);

  assert.equal(security.constrained, true);
  assert.ok(Math.abs(security.shortfallFte - 0.3) < 1e-9);
});

test('M5 synthetic fixture produces a capacity remediation action', () => {
  const capacity = capacityAssessment(
    M5_PORTFOLIO_FIXTURE.deliveryCapacities,
    M5_PORTFOLIO_FIXTURE.deliveryDemands
  );

  const actions = nextPortfolioActions({
    rows: [],
    constrainedCapacity: capacity.filter(x => x.constrained)
  });

  const securityAction = actions.find(x => x.capacityType === 'Security');
  assert.ok(securityAction);
  assert.match(securityAction.action, /0\.30 FTE/);
});
