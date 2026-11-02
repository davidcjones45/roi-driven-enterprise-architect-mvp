import { validateP1Evidence } from './cif-evidence-resolution.mjs';
import { economicsCompleteness } from './modernization-economics-model.mjs';

/** Approved P1 economics is required at all decision-facing entrypoints. */
export function economicDecisionReadiness(workspace = {}, applicationId = '', alternativeId = '') {
  const context = workspace.p1EconomicContext;
  const result = economicsCompleteness(applicationId, alternativeId, workspace.economicLines || [], context || {});
  const evidence = validateP1Evidence(context || {},workspace.economicEvidenceRegister || []);
  const issues = [...result.issues.map(x => typeof x === 'string' ? x : x.issue),...evidence.issues];
  if (!context) issues.unshift('Common P1 economic baseline and allocation context must be supplied.');
  if (!context?.cases?.some(c => c.id === applicationId && c.baselineId === context.baseline?.id && c.baselineRevision === context.baseline?.revision))
    issues.push('No compatible P1 case for application '+applicationId+'.');
  return { ...result, decisionReadyForEconomicComparison: result.decisionReadyForEconomicComparison && !!context && evidence.valid && !issues.length,
    evidenceResolution:evidence,
    issues };
}
