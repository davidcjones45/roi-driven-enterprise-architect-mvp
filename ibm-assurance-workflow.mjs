import { effectiveAuthorityState } from './authority-model.mjs';
import { economicDecisionReadiness } from './cif-economic-p1-workflow.mjs';
import { assessHumanIntervention, assessExitFeasibility, assessValueLeakage } from './ibm-assurance-diagnostics.mjs';

/**
 * Advisory overlay. This module never alters canonical Authority Envelope states,
 * P1/T22/T23 readiness, recognized cash benefits, or financial source records.
 * Missing optional assessments are explicitly NOT_ASSESSED, never assumed PASS.
 */
export function assessAuthorityAssurance(authority = {}, asOf = '', intervention = null, exit = null) {
  const canonical = effectiveAuthorityState(authority, asOf);
  const human = intervention == null ? null : assessHumanIntervention(intervention);
  const reversibility = exit == null ? null : assessExitFeasibility(exit);
  return {
    canonical,
    humanIntervention: human || {status:'NOT_ASSESSED',ready:false,issues:['Intervention assessment not supplied.']},
    exitFeasibility: reversibility || {status:'NOT_ASSESSED',supported:false,issues:['Exit assessment not supplied.']},
    advisoryOnly:true,
    note:'No change to canonical authority or operational authorization.'
  };
}
export function assessEconomicAssurance(workspace = {}, applicationId = '', alternativeId = '', leakage = null) {
  const canonical = economicDecisionReadiness(workspace, applicationId, alternativeId);
  const assessment = leakage == null ? null : assessValueLeakage(leakage);
  return {
    canonical,
    valueLeakage:assessment || {status:'NOT_ASSESSED',valid:false,issues:['Value leakage assessment not supplied.'],netBenefit:null},
    advisoryOnly:true,
    note:'Value leakage is a scenario estimate and is excluded from recognized cash, P1 and T22/T23 decisions.'
  };
}
