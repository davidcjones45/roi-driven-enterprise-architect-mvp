import { economicsCompleteness } from './modernization-economics-model.mjs';

/** Approved P1 economics is required at all decision-facing entrypoints. */
export function economicDecisionReadiness(workspace = {}, applicationId = '', alternativeId = '') {
  const context = workspace.p1EconomicContext;
  const result = economicsCompleteness(applicationId, alternativeId, workspace.economicLines || [], context || {});
  const issues = result.issues.map(x => typeof x === 'string' ? x : x.issue);
  if (!context) issues.unshift('Common P1 economic baseline and allocation context must be supplied.');
  return { ...result, decisionReadyForEconomicComparison: result.decisionReadyForEconomicComparison && !!context,
    issues };
}
