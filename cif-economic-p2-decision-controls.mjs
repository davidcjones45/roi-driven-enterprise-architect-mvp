/** CIF T22 and T23: explicit, non-authorizing decision support. */
import { resolveEvidenceReferences } from "./cif-evidence-resolution.mjs";

export const GATE_TRACKS=['STABILIZATION','CORE_REMEDIATION','COMMERCIAL_EXPANSION'];
const present=x=>typeof x==='string'&&x.trim().length>0;
const numeric=x=>typeof x==='number'&&Number.isFinite(x);
// P2 form and decision dates are calendar days, including both window endpoints.
function validDay(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T00:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function evidenceIssues(ref, register, asOf) {
  const result = resolveEvidenceReferences([ref], register, { asOf });
  const issues = [...result.issues];
  for (const record of result.resolved) {
    for (const field of ['effectiveFrom', 'effectiveTo']) {
      if (record[field] && !validDay(record[field])) issues.push('Invalid evidence ' + field + '.');
    }
  }
  return issues;
}

export function evaluateOutcomeAcceptance(contract={},observations=[],evidence=[]){
 const issues=[];
 for(const field of ['id','applicationId','alternativeId','ownerId','metricId','unit','observationStart','observationEnd','operator','evidenceRef'])
   if(!present(contract[field]))issues.push('Missing outcome contract '+field+'.');
 if(!numeric(contract.target))issues.push('Numeric target required.');
 if(!validDay(contract.observationStart)||!validDay(contract.observationEnd)||contract.observationStart>contract.observationEnd)issues.push('Invalid observation window.');
 if(!['LTE','GTE'].includes(contract.operator))issues.push('Target operator must be LTE or GTE.');
 const scoped = observations.filter(x => x.metricId === contract.metricId &&
   x.applicationId === contract.applicationId && x.alternativeId === contract.alternativeId);
 if (scoped.some(x => !validDay(x.observedAt))) issues.push('Invalid observation date for the required metric.');
 const matched = scoped.filter(x => validDay(x.observedAt) &&
   x.observedAt >= contract.observationStart && x.observedAt <= contract.observationEnd);
 const latestDay = matched.reduce((day, row) => row.observedAt > day ? row.observedAt : day, '');
 const latest = matched.filter(row => row.observedAt === latestDay);
 let last = latest[0];
 if (!last) issues.push('No in-window observation for the required metric.');
 if (latest.some(row => row.value !== last.value || row.unit !== last.unit)) {
   issues.push('Conflicting latest observations require review.');
   last = undefined;
 }
 issues.push(...evidenceIssues(contract.evidenceRef, evidence, latestDay));
 if(last&&(!numeric(last.value)||last.unit!==contract.unit))issues.push('Outcome observation missing value or has incompatible unit.');
 const meets=!!last&&numeric(last.value)&&numeric(contract.target)&&last.unit===contract.unit&&(contract.operator==='LTE'?last.value<=contract.target:last.value>=contract.target);
 return {accepted:issues.length===0&&meets,status:issues.length?'INCOMPLETE':meets?'ACCEPTED':'TARGET_NOT_MET',issues,observed:last?.value??null};
}
export function evaluateInvestmentGate(decision={},allDecisions=[],evidence=[]){
 const issues=[];
 if(!GATE_TRACKS.includes(decision.track))issues.push('Unrecognized investment track.');
 for(const field of ['id','initiativeId','authorityId','ownerId','effectiveAt','evidenceRef'])
  if(!present(decision[field]))issues.push('Missing investment decision '+field+'.');
 if(!['APPROVED','REJECTED','PENDING'].includes(decision.state))issues.push('Invalid decision state.');
 if (!validDay(decision.effectiveAt)) issues.push('Invalid investment decision effective date.');
 issues.push(...evidenceIssues(decision.evidenceRef, evidence, decision.effectiveAt));
 if(allDecisions.some(x=>x!==decision&&x.id===decision.id))issues.push('Duplicate investment decision ID.');
 const conflicts=allDecisions.filter(x=>x.initiativeId===decision.initiativeId&&x.track===decision.track&&x.id!==decision.id&&x.state==='APPROVED');
 if(decision.state==='APPROVED'&&conflicts.length)issues.push('Conflicting approval for same initiative and track.');
 return {valid:issues.length===0,approved:issues.length===0&&decision.state==='APPROVED',status:issues.length?'INCOMPLETE':decision.state,issues,
  note:'An approved record is evidence of a modeled decision, not an externally enforced spending authorization.'};
}
