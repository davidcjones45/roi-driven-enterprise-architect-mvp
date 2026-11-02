/** CIF T22 and T23: explicit, non-authorizing decision support. */
export const GATE_TRACKS=['STABILIZATION','CORE_REMEDIATION','COMMERCIAL_EXPANSION'];
const present=x=>typeof x==='string'&&x.trim().length>0;
const numeric=x=>typeof x==='number'&&Number.isFinite(x);
export function evaluateOutcomeAcceptance(contract={},observations=[],evidence=[]){
 const issues=[];
 for(const field of ['id','applicationId','alternativeId','ownerId','metricId','unit','observationStart','observationEnd','operator','evidenceRef'])
   if(!present(contract[field]))issues.push('Missing outcome contract '+field+'.');
 if(!numeric(contract.target))issues.push('Numeric target required.');
 if(contract.observationStart>contract.observationEnd)issues.push('Invalid observation window.');
 if(!['LTE','GTE'].includes(contract.operator))issues.push('Target operator must be LTE or GTE.');
 const matched=observations.filter(x=>x.metricId===contract.metricId&&x.applicationId===contract.applicationId&&x.alternativeId===contract.alternativeId&&x.observedAt>=contract.observationStart&&x.observedAt<=contract.observationEnd);
 if(!matched.length)issues.push('No in-window observation for the required metric.');
 const reference=evidence.filter(x=>x.id===contract.evidenceRef&&x.status==='VERIFIED');
 if(reference.length!==1)issues.push('Outcome evidence is not uniquely verified.');
 const last=[...matched].sort((a,b)=>a.observedAt.localeCompare(b.observedAt)).at(-1);
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
 if(evidence.filter(x=>x.id===decision.evidenceRef&&x.status==='VERIFIED').length!==1)
  issues.push('Investment decision evidence is not uniquely verified.');
 if(allDecisions.some(x=>x!==decision&&x.id===decision.id))issues.push('Duplicate investment decision ID.');
 const conflicts=allDecisions.filter(x=>x.initiativeId===decision.initiativeId&&x.track===decision.track&&x.id!==decision.id&&x.state==='APPROVED');
 if(decision.state==='APPROVED'&&conflicts.length)issues.push('Conflicting approval for same initiative and track.');
 return {valid:issues.length===0,approved:issues.length===0&&decision.state==='APPROVED',status:issues.length?'INCOMPLETE':decision.state,issues,
  note:'An approved record is evidence of a modeled decision, not an externally enforced spending authorization.'};
}
