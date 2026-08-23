import { stableId } from './authority-model.mjs';

export const EVIDENCE_CLASSIFICATIONS=['Verified','Corroborated','Reported','Modeled','Hypothesis'];
export const READINESS_STATES=['Ready','Ready with Gaps','Constrained Assessment','Not Ready'];
export const PHASES=['0 Qualify','1 Opportunity & Incentives','2 Structure & Constraints','3 Operating Evidence','4 Federation Design & Economics','5 Feasibility','6 AI & Resilience','7 Investment Decision','8 Controlled Pilot'];
export const HANDOFF_STATES={communication:['Created','Sent','Received','Acknowledged'],responsibility:['Not Offered','Offered','Accepted','In Progress','Completed','Rejected','Expired','Escalated'],authority:['Not Applicable','Pending','Permitted','Denied','Restricted','Revoked']};

const list=v=>Array.isArray(v)?v:String(v||'').split(/[;,\n]/).map(x=>x.trim()).filter(Boolean);
const unique=v=>[...new Set(v)];
const id=(v,p)=>stableId(v,p);

export function normalizeEvidence(record={}){ return {...record,id:record.id||id(record.claim||record.source||'evidence','EVD'),classification:EVIDENCE_CLASSIFICATIONS.includes(record.classification)?record.classification:'Reported',source:record.source||'',limitation:record.limitation||'',applicability:record.applicability||'',materiality:record.materiality||'',owner:record.owner||record.sourceOwner||'',reviewDate:record.reviewDate||'',expiryDate:record.expiryDate||''}; }
export function normalizeAssessment(raw={}, data={}){
  const a={...raw}; a.id=a.id||id(a.name||data.opportunity?.name||'assessment','FEOA'); a.opportunityId=a.opportunityId||data.opportunity?.id||id(data.opportunity?.name||'opportunity','OPP');
  a.status=a.status||'Draft'; a.currentPhase=PHASES.includes(a.currentPhase)?a.currentPhase:PHASES[0]; a.readiness=READINESS_STATES.includes(a.readiness)?a.readiness:'Not Ready'; a.decision=a.decision||'Obtain Evidence'; a.evidenceSufficiency=a.evidenceSufficiency||'Insufficient';
  a.federationContext={id:a.federationContext?.id||id(`${a.id}-federation`,'FED'),valueProposition:a.federationContext?.valueProposition||'',valueStreamId:a.federationContext?.valueStreamId||'',structureAlternativeId:a.federationContext?.structureAlternativeId||''};
  a.participants=(a.participants||[]).map((p,i)=>({id:p.id||id(p.name||`participant-${i+1}`,'PAR'),name:p.name||'',indispensability:p.indispensability||'Unknown',substitutability:p.substitutability||'Unknown',contributedCapabilityIds:unique(list(p.contributedCapabilityIds)),receivedCapabilityIds:unique(list(p.receivedCapabilityIds)),strategicRationale:p.strategicRationale||'',economicRationale:p.economicRationale||'',valueProposition:{id:p.valueProposition?.id||id(`${p.name||i}-value`,'PVP'),...p.valueProposition}}));
  a.capabilities=(a.capabilities||[]).map((c,i)=>({id:c.id||id(c.name||`capability-${i+1}`,'CAP'),name:c.name||'',ownerParticipantId:c.ownerParticipantId||''}));
  a.valueStreams=(a.valueStreams||[]).map((v,i)=>({id:v.id||id(v.name||`value-stream-${i+1}`,'VS'),name:v.name||'',purpose:v.purpose||'',processStepIds:unique(list(v.processStepIds))}));
  a.evidenceIds=unique(list(a.evidenceIds)); a.majorGapIds=unique(list(a.majorGapIds)); a.requiredNextAction=a.requiredNextAction||''; return a;
}
export function assessmentReadiness(a,evidence=[]){ const refs=(a.evidenceIds||[]).map(x=>evidence.find(e=>e.id===x)).filter(Boolean); const gaps=[...(a.majorGapIds||[])]; if(!a.federationContext?.valueProposition) gaps.push('Federated value proposition is not stated.'); if(!a.participants?.length) gaps.push('No participant is recorded.'); if(!refs.length) gaps.push('No assessment evidence is linked.'); return {ready:a.readiness==='Ready'&&gaps.length===0,evidence:refs.map(normalizeEvidence),gaps:unique(gaps),nextAction:a.requiredNextAction||'Resolve material gaps before proceeding.'};
}
export function normalizeHandoff(raw={}){ const h={...raw,id:raw.id||id(raw.name||raw.purpose||'handoff','HOF')}; for(const [axis,states] of Object.entries(HANDOFF_STATES)) h[`${axis}State`]=states.includes(h[`${axis}State`])?h[`${axis}State`]:states[0]; h.transmissionEventId=h.transmissionEventId||''; h.receiptEventId=h.receiptEventId||''; h.validationEventId=h.validationEventId||''; h.acceptanceEventId=h.acceptanceEventId||''; h.acceptingAuthorityId=h.acceptingAuthorityId||''; h.provenanceIds=unique(list(h.provenanceIds)); h.supersedesHandoffId=h.supersedesHandoffId||''; h.correctionReason=h.correctionReason||''; return h; }
export function normalizeAction(raw={}){ return {...raw,id:raw.id||id(raw.name||raw.action||'action','ACT'),performer:raw.performer||'',decisionAuthority:raw.decisionAuthority||'',accountableOrganization:raw.accountableOrganization||'',residualAccountableOrganization:raw.residualAccountableOrganization||'',jurisdiction:raw.jurisdiction||'',aiEligibility:raw.aiEligibility||'Not assessed',authorityEnvelopeId:raw.authorityEnvelopeId||'',evidenceRequirementIds:unique(list(raw.evidenceRequirementIds)),constraintIds:unique(list(raw.constraintIds))}; }

export const COST_POOL_TYPES=['Operating Cost','Implementation Cost','Technology Cost','Compliance Cost','Risk Cost','Internal Transfer'];
export const CASES=['Case 0 — Current / Independent','Case 1 — Conventional Federation','Case 2 — AI-Enabled Federation'];
export const SCENARIO_CASE_TYPES=['CURRENT','BEST_NON_FEDERATION','FEDERATION_NON_AI','FEDERATION_BOUNDED_AI','CUSTOM'];
const legacyCaseType=caseName=>({
  [CASES[0]]:'CURRENT', [CASES[1]]:'FEDERATION_NON_AI', [CASES[2]]:'FEDERATION_BOUNDED_AI',
}[caseName]||'CUSTOM');

export function normalizeBaselineMetric(raw={}){
  return {...raw,id:raw.id||id(raw.name||raw.metric||'baseline-metric','MET'),name:raw.name||raw.metric||'',value:Number(raw.value||0),unit:raw.unit||'',period:raw.period||'',sourceEvidenceIds:unique(list(raw.sourceEvidenceIds)),classification:EVIDENCE_CLASSIFICATIONS.includes(raw.classification)?raw.classification:'Reported'};
}
export function normalizeFriction(raw={}){
  return {...raw,id:raw.id||id(raw.name||raw.description||'friction','FRI'),name:raw.name||raw.description||'',baselineMetricIds:unique(list(raw.baselineMetricIds)),causeIds:unique(list(raw.causeIds)),impact:raw.impact||'',controlIds:unique(list(raw.controlIds)),requiredControlIds:unique(list(raw.requiredControlIds)),owner:raw.owner||'',status:raw.status||'Observed'};
}
export function normalizeEconomicLine(raw={}){
  const category=COST_POOL_TYPES.includes(raw.category)?raw.category:'Operating Cost';
  return {...raw,id:raw.id||id(raw.name||raw.description||'economic-line','ECO'),name:raw.name||raw.description||'',category,amount:Number(raw.amount||0),currency:raw.currency||'USD',period:raw.period||'',fromParticipantId:raw.fromParticipantId||'',toParticipantId:raw.toParticipantId||'',beneficiaryParticipantId:raw.beneficiaryParticipantId||'',baselineMetricId:raw.baselineMetricId||'',futureEvidenceId:raw.futureEvidenceId||'',assumptionId:raw.assumptionId||'',riskIds:unique(list(raw.riskIds)),note:raw.note||''};
}
export function normalizeCounterfactual(raw={}){
  const c={...raw,id:raw.id||id(raw.name||raw.case||'counterfactual','CASE')};
  // Preserve legacy case names while allowing arbitrary, comparator-linked scenarios.
  const hasExplicitType=SCENARIO_CASE_TYPES.includes(c.caseType);
  const hasScenarioLabel=Boolean(c.caseName||c.name||c.case);
  // An empty legacy record retains its pre-Increment-1 Case 0 normalization.
  c.caseName=hasScenarioLabel?(c.caseName||c.name||c.case||''):(!hasExplicitType?CASES[0]:''); c.name=c.name||c.caseName||'';
  c.caseType=SCENARIO_CASE_TYPES.includes(c.caseType)?c.caseType:legacyCaseType(c.caseName);
  c.comparatorCaseId=c.comparatorCaseId||''; c.organizationalFormId=c.organizationalFormId||''; c.aiCapabilityId=c.aiCapabilityId||'';
  c.status=c.status||'Draft'; c.flowIds=unique(list(c.flowIds)); c.benefitIds=unique(list(c.benefitIds)); c.costPoolIds=unique(list(c.costPoolIds));
  c.economicLines=(c.economicLines||[]).map(normalizeEconomicLine); c.assumptionIds=unique(list(c.assumptionIds)); c.evidenceIds=unique(list(c.evidenceIds)); return c;
}
export function validateEconomicLine(line, metrics=[], evidence=[]){
  const issues=[];
  if(line.amount>0 && !line.baselineMetricId) issues.push('Benefit/value line requires a current-state baseline metric.');
  if(line.amount>0 && !line.futureEvidenceId && !line.assumptionId) issues.push('Benefit/value line requires future-state evidence or a labeled modeled assumption.');
  if(line.baselineMetricId&&!metrics.some(m=>m.id===line.baselineMetricId)) issues.push('Referenced baseline metric is missing.');
  if(line.futureEvidenceId&&!evidence.some(e=>e.id===line.futureEvidenceId)) issues.push('Referenced future-state evidence is missing.');
  return {valid:issues.length===0,issues};
}
export function participantEconomics(lines=[], participantId){
  const normalized=lines.map(normalizeEconomicLine); const received=normalized.filter(x=>x.toParticipantId===participantId||x.beneficiaryParticipantId===participantId).reduce((n,x)=>n+x.amount,0); const paid=normalized.filter(x=>x.fromParticipantId===participantId).reduce((n,x)=>n+x.amount,0); return {participantId,received,paid,net:received-paid,internalTransfers:normalized.filter(x=>x.category==='Internal Transfer'&&(x.fromParticipantId===participantId||x.toParticipantId===participantId))};
}
export function consolidatedEconomics(lines=[]){
  const normalized=lines.map(normalizeEconomicLine); const included=normalized.filter(x=>x.category!=='Internal Transfer'); const excludedTransfers=normalized.filter(x=>x.category==='Internal Transfer'); return {gross:included.reduce((n,x)=>n+x.amount,0),byCostPool:Object.fromEntries(COST_POOL_TYPES.map(category=>[category,included.filter(x=>x.category===category).reduce((n,x)=>n+x.amount,0)])),excludedTransfers};
}
export function riskAdjustedFederationValue(lines=[], risks=[]){
  const gross=consolidatedEconomics(lines).gross;
  const active=(risks||[]).filter(r=>r.status!=='Retired');
  const adjustments=active.map(r=>({id:r.id||id(r.name||'risk','RSK'),name:r.name||'',amount:Number(r.expectedImpact??r.adjustment??0),basis:r.basis||'Explicit risk adjustment'}));
  const totalAdjustment=adjustments.reduce((n,x)=>n+x.amount,0);
  return {gross,adjustments,totalAdjustment,riskAdjusted:gross-totalAdjustment};
}
export function participantDealViability(participantId, economics, terms={}){
  const threshold=terms.minimumAcceptableNet===undefined?null:Number(terms.minimumAcceptableNet);
  const concerns=list(terms.concerns); const aligned=threshold===null?concerns.length===0:economics.net>=threshold&&concerns.length===0;
  return {participantId,net:economics.net,minimumAcceptableNet:threshold,concerns,aligned,reason:aligned?'Participant terms are presently viable.':'Participant remains economically or strategically misaligned.'};
}
export function federationStability(viabilities=[]){ return {stable:viabilities.length>0&&viabilities.every(v=>v.aligned),misalignedParticipantIds:viabilities.filter(v=>!v.aligned).map(v=>v.participantId)}; }
export function normalizeReadiness(raw={}){
  return {...raw,id:raw.id||id(raw.name||raw.area||'readiness','RDY'),area:raw.area||raw.name||'',state:READINESS_STATES.includes(raw.state)?raw.state:'Not Ready',capabilityIds:unique(list(raw.capabilityIds)),constraintIds:unique(list(raw.constraintIds)),remediationIds:unique(list(raw.remediationIds)),owner:raw.owner||'',evidenceIds:unique(list(raw.evidenceIds)),notes:raw.notes||''};
}
export function gateDecision(gate={}, context={}){
  const conditions=(gate.conditions||[]).map((c,i)=>({id:c.id||id(c.name||`condition-${i+1}`,'GTC'),name:c.name||'',required:c.required!==false,evidenceIds:unique(list(c.evidenceIds)),status:c.status||'Open'}));
  const evidence=context.evidence||[]; const unmet=conditions.filter(c=>c.required&&(!c.evidenceIds.length||c.status!=='Satisfied'||!c.evidenceIds.every(eid=>evidence.some(e=>e.id===eid))));
  return {gateId:gate.id||id(gate.name||'gate','GATE'),decision:unmet.length?'Obtain Evidence':gate.decision||'Proceed',decisionReady:unmet.length===0,unmetConditions:unmet,conditions};
}
export function aiCapabilityCase(raw={}, cases=[]){
  const ai=normalizeCounterfactual({...raw,caseName:CASES[2]});
  const conventional=cases.map(normalizeCounterfactual).find(c=>c.caseName===CASES[1]);
  const issues=[];
  if(!conventional) issues.push('Case 2 requires an explicit Case 1 comparator.');
  ai.economicLines.forEach(line=>{ if(line.amount>0&&!line.futureEvidenceId&&!line.assumptionId) issues.push(`AI line ${line.id} lacks evidence or a labeled assumption.`); });
  return {case:ai,comparatorId:conventional?.id||'',supported:issues.length===0,issues,incrementalValue:conventional?consolidatedEconomics(ai.economicLines).gross-consolidatedEconomics(conventional.economicLines).gross:null};
}
export function normalizeCognitiveResilience(raw={}){
  return {...raw,id:raw.id||id(raw.name||raw.capability||'cognitive-resilience','CRS'),name:raw.name||raw.capability||'',criticality:raw.criticality||'Not assessed',humanFallback:raw.humanFallback||'',withdrawalPlan:raw.withdrawalPlan||'',dependencyIds:unique(list(raw.dependencyIds)),authorityEnvelopeIds:unique(list(raw.authorityEnvelopeIds)),state:raw.state||'Active',history:Array.isArray(raw.history)?raw.history:[]};
}
export function withdrawCognitiveCapability(raw={}, observation={}){
  const item=normalizeCognitiveResilience(raw); const event={id:observation.id||id(`${item.id}-withdrawal-${item.history.length+1}`,'OBS'),at:observation.at||new Date().toISOString(),type:'Withdrawal',reason:observation.reason||'',sourceEvidenceIds:unique(list(observation.sourceEvidenceIds))};
  return {...item,state:'Withdrawn',history:[...item.history,event]};
}
export function sensitivityBreakpoints(scenarios=[]){
  return scenarios.map((s,i)=>({id:s.id||id(s.name||`scenario-${i+1}`,'SEN'),name:s.name||'',variable:s.variable||'',value:s.value??'',threshold:s.threshold??'',result:s.result||'',evidenceIds:unique(list(s.evidenceIds)),assumptionIds:unique(list(s.assumptionIds))}));
}
export function recordPilotObservation(pilot={}, observation={}){
  const observations=Array.isArray(pilot.observations)?pilot.observations:[]; const normalized={id:observation.id||id(`${pilot.id||'pilot'}-${observation.metricId||'observation'}-${observations.length+1}`,'OBS'),at:observation.at||new Date().toISOString(),metricId:observation.metricId||'',value:observation.value??null,sourceEvidenceIds:unique(list(observation.sourceEvidenceIds)),varianceFromModel:observation.varianceFromModel??null,disposition:observation.disposition||'Observed',supersedesObservationId:observation.supersedesObservationId||''};
  return {...pilot,observations:[...observations,normalized]};
}
export function feoaReport(assessment={}, context={}){
  const a=normalizeAssessment(assessment,context); const readiness=assessmentReadiness(a,context.evidence||[]); const gates=(context.gates||[]).map(g=>gateDecision(g,context));
  return {title:`FEOA executive decision report — ${a.id}`,assessmentId:a.id,opportunityId:a.opportunityId,phase:a.currentPhase,readiness,gates,participants:a.participants.map(p=>({id:p.id,name:p.name,valueProposition:p.valueProposition})),counterfactuals:(context.counterfactuals||[]).map(normalizeCounterfactual),generatedAt:new Date().toISOString()};
}
