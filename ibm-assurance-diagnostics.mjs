/**
 * Additive, synthetic assurance diagnostics informed by IBM research.
 * Advisory only: does not authorize actions, spending, deployments, or finance recognition.
 */
const present = x => typeof x === 'string' && x.trim().length > 0;
const nonnegative = x => typeof x === 'number' && Number.isFinite(x) && x >= 0;
export function assessHumanIntervention(input = {}) {
  const issues = [];
  for (const field of ['reviewerId','authorityRef','evidenceRef','haltMechanism','escalationOwner'])
    if (!present(input[field])) issues.push('Missing intervention '+field+'.');
  if (input.canHalt !== true) issues.push('Reviewer cannot halt execution.');
  if (input.reviewBeforeExecution !== true) issues.push('No pre-execution review window.');
  if (input.evidenceAccessible !== true) issues.push('Decision evidence not accessible to reviewer.');
  return {ready:issues.length===0,status:issues.length?'INCOMPLETE':'REVIEWABLE',issues,
    note:'Reviewable is a synthetic design assessment, not proof of operational authority.'};
}
export function assessExitFeasibility(input = {}) {
  const issues=[];
  for (const field of ['dependencyId','ownerId','contractEvidenceRef','portabilityEvidenceRef','rollbackEvidenceRef'])
    if (!present(input[field])) issues.push('Missing exit evidence '+field+'.');
  for (const field of ['switchingDays','exitCost'])
    if (!nonnegative(input[field])) issues.push('Invalid or missing '+field+'.');
  if (input.substituteValidated !== true) issues.push('Substitute not validated.');
  if (input.exitRightsConfirmed !== true) issues.push('Contractual exit rights not confirmed.');
  return {supported:issues.length===0,status:issues.length?'INCOMPLETE':'EVIDENCE_RECORDED',issues,
    note:'References and flags are user assertions, not independently authenticated evidence.'};
}
export function assessValueLeakage(input = {}) {
  const issues=[];
  for (const field of ['grossBenefit','adoptionRate','incrementalRunCost','transitionCost'])
    if (!nonnegative(input[field])) issues.push('Invalid or missing '+field+'.');
  if (nonnegative(input.adoptionRate)&&input.adoptionRate>1) issues.push('Adoption rate exceeds one.');
  if (!present(input.baselineRef)||!present(input.attributionRef))
    issues.push('Baseline and attribution references required.');
  if (issues.length) return {valid:false,status:'INCOMPLETE',issues,netBenefit:null,leakage:null};
  const adoptedBenefit=input.grossBenefit*input.adoptionRate;
  const leakage=input.grossBenefit-adoptedBenefit+input.incrementalRunCost+input.transitionCost;
  return {valid:true,status:'ESTIMATE_ONLY',issues,adoptedBenefit,leakage,
    netBenefit:adoptedBenefit-input.incrementalRunCost-input.transitionCost,
    note:'Illustrative estimate only; not recognized cash or finance-approved ROI.'};
}
