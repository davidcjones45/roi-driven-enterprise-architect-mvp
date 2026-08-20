// Local-only authority model. ERIR records remain external references, never copied here.
export const RELATIONSHIP_TYPES = ['supports_capability','permits_action','affects_resource','depends_on_inventory','regulatory_context','constrained_by_control','supported_by_evidence'];
export const ERIR_EXAMPLE_GRAPH = {
  'SRC-FTC-2026-001':['OBL-FTC-001'], 'OBL-FTC-001':['APP-FTC-001','CTL-CLAIMS-001'],
  'CTL-CLAIMS-001':['EVD-CLAIMS-001']
};
const slug = (value, prefix) => `${prefix}-${String(value||'UNSPECIFIED').trim().toUpperCase().replace(/[^A-Z0-9]+/g,'-').replace(/(^-|-$)/g,'')}`;
const list = value => Array.isArray(value) ? value : String(value||'').split(/[;,\n]/).map(v=>v.trim()).filter(Boolean);
const unique = values => [...new Set(values)];
const rel = (sourceId, type, targetId, targetType, resolutionState='resolved', rationale='') => ({sourceId,sourceType:'authority_envelope',relationshipType:type,targetId,targetType,resolutionState,rationale});

export function stableId(value, prefix){ return slug(value,prefix); }
export function normalizeAuthority(raw={}, context={}){
  const a={...raw};
  a.id=a.id||stableId(a.aiSystem||'authority','AE');
  a.aiSystemId=a.aiSystemId||stableId(a.aiSystem,'AIS');
  a.businessCapabilityId=a.businessCapabilityId||stableId(a.businessCapability,'CAP');
  if(a.agentLabel && !a.agentId) a.agentId=stableId(a.agentLabel,'AGT');
  const actionLabels=list(a.permittedActions); const resourceLabels=list(a.resourceScope);
  a.actions=(a.actions?.length?a.actions:actionLabels.map((label,i)=>({id:list(a.actionIds)[i]||stableId(label,'ACT'),label}))).map(x=>typeof x==='string'?{id:stableId(x,'ACT'),label:x}:x);
  a.resources=(a.resources?.length?a.resources:resourceLabels.map((label,i)=>({id:list(a.resourceIds)[i]||stableId(label,'RES'),label}))).map(x=>typeof x==='string'?{id:stableId(x,'RES'),label:x}:x);
  const knownInventory=new Set((context.inventory||[]).flatMap(x=>[x.id,stableId(x.name,'INV'),x.name]).filter(Boolean));
  const knownErir=new Set(context.knownErirIds||[]);
  const relationships=[];
  relationships.push(rel(a.id,'supports_capability',a.businessCapabilityId,'business_capability','resolved',a.businessCapability));
  a.actions.forEach(x=>relationships.push(rel(a.id,'permits_action',x.id,'action','resolved',x.label)));
  a.resources.forEach(x=>relationships.push(rel(a.id,'affects_resource',x.id,'resource','resolved',x.label)));
  list(a.inventoryRefs).forEach(ref=>relationships.push(rel(a.id,'depends_on_inventory',stableId(ref,'INV'),'inventory',knownInventory.has(ref)||knownInventory.has(stableId(ref,'INV'))?'resolved':'unresolved',ref)));
  const erirRefs={sourceId:a.erirSourceId||context.regulatory?.sourceId,obligationId:a.erirObligationId||context.regulatory?.obligationId,assessmentId:a.erirAssessmentId||context.regulatory?.assessmentId,controlId:a.erirControlId||context.regulatory?.controlId,evidenceId:a.erirEvidenceId||context.regulatory?.evidenceId};
  [['sourceId','regulatory_context','regulatory_source'],['obligationId','regulatory_context','obligation'],['assessmentId','regulatory_context','applicability_assessment'],['controlId','constrained_by_control','control'],['evidenceId','supported_by_evidence','evidence_artifact']].forEach(([key,type,targetType])=>{ if(erirRefs[key]) relationships.push(rel(a.id,type,erirRefs[key],targetType,knownErir.has(erirRefs[key])?'resolved':'unresolved')); });
  a.relationships=relationships;
  const artifacts=unique([...list(a.evidenceArtifactIds), ...(erirRefs.evidenceId?[erirRefs.evidenceId]:[])]);
  const defaultEvidenceActionIds=list(a.evidenceActionIds).length?list(a.evidenceActionIds):a.actions.map(action=>action.id);
  a.evidenceRequirements=(a.evidenceRequirements?.length?a.evidenceRequirements:[{id:stableId(`${a.id}-evidence`,'ERQ'),requirement:a.evidenceRequirement||a.evidenceRefs||'Evidence requirement not specified',acceptanceCriterion:a.acceptanceCriterion||'Qualified reviewer records an explicit assessment.',artifactReferences:artifacts,assessmentState:a.evidenceAssessmentState||'not assessed',validFrom:a.evidenceValidFrom||a.effectiveDate||'',validUntil:a.evidenceValidUntil||a.reviewDate||'',reviewer:a.evidenceReviewer||'',reviewAuthority:a.evidenceReviewAuthority||'',actionIds:defaultEvidenceActionIds}]).map(requirement=>({...requirement,actionIds:list(requirement.actionIds).length?list(requirement.actionIds):defaultEvidenceActionIds}));
  a.monitoringObservations=(a.monitoringObservations||[]).map((observation,index)=>({id:observation.id||`${a.id}-OBS-${index+1}`,observedAt:observation.observedAt||'',condition:observation.condition||'',actionIds:list(observation.actionIds),evidenceReferences:list(observation.evidenceReferences),...observation}));
  a.decisionHistory=Array.isArray(a.decisionHistory)?a.decisionHistory:[];
  return a;
}
export function appendDecision(authority, decision){
  const next={...authority,decisionHistory:[...(authority.decisionHistory||[])]};
  const entry={id:decision.id||`${next.id}-DEC-${next.decisionHistory.length+1}`,decisionType:decision.decisionType||decision.decision||'Maintain',decisionAuthority:decision.decisionAuthority||next.authorityOwner||'',effectiveDate:decision.effectiveDate||decision.decisionDate||'',timestamp:decision.timestamp||new Date().toISOString(),rationale:decision.rationale||'',resultingState:decision.resultingState||next.status||'',evidenceReferences:list(decision.evidenceReferences||next.evidenceArtifactIds||''),triggeringObservationIds:list(decision.triggeringObservationIds)};
  const last=next.decisionHistory.at(-1);
  if(!last || ['decisionType','decisionAuthority','effectiveDate','rationale','resultingState','triggeringObservationIds'].some(k=>JSON.stringify(last[k])!==JSON.stringify(entry[k]))) next.decisionHistory.push(entry);
  return next;
}
export function effectiveAuthorityState(authority, asOf){
  const date=String(asOf||'').slice(0,10); if(!date) return {state:'Date required',reasons:['Provide an as-of date.']};
  const a=authority||{}; const reasons=[];
  if(!a.effectiveDate || date<a.effectiveDate) return {state:'Not yet effective',reasons:['The envelope effective date has not been reached.']};
  const history=[...(a.decisionHistory||[])].filter(x=>(x.effectiveDate||'')<=date).sort((x,y)=>(x.effectiveDate||'').localeCompare(y.effectiveDate||''));
  const last=history.at(-1); const decision=(last?.decisionType||a.decision||'').toLowerCase();
  if(['revoke','revoked'].includes(decision)||String(last?.resultingState||a.status).toLowerCase().includes('revoked')) return {state:'Revoked',reasons:['A recorded lifecycle decision revokes the authority.']};
  if(['suspend','suspended'].includes(decision)||String(last?.resultingState||a.status).toLowerCase().includes('suspended')) return {state:'Suspended',reasons:['A recorded lifecycle decision suspends the authority.']};
  const unresolved=(a.relationships||[]).filter(x=>x.resolutionState!=='resolved'); if(unresolved.length) reasons.push(`${unresolved.length} required reference(s) unresolved.`);
  const evidence=a.evidenceRequirements||[]; const bad=evidence.filter(x=>!['accepted'].includes(String(x.assessmentState).toLowerCase()) || (x.validUntil&&date>x.validUntil) || (x.validFrom&&date<x.validFrom));
  if(bad.length) reasons.push(`${bad.length} evidence requirement(s) are not accepted and valid as of this date.`);
  if(reasons.length) return {state:bad.length?'Evidence unresolved':'Review required',reasons,lastDecision:last||null};
  if(a.reviewDate&&date>a.reviewDate) return {state:'Review required',reasons:['The envelope review/expiry date has passed.'],lastDecision:last||null};
  return {state:'Effective — controlled authority',reasons:['Effective date reached; required references resolved; recorded evidence accepted and valid.'],lastDecision:last||null};
}
function closure(start, graph){ const seen=new Set([start]), queue=[start]; while(queue.length){ for(const next of graph[queue.shift()]||[]) if(!seen.has(next)){seen.add(next);queue.push(next);} } return seen; }
export function erirImpact(authorities, erirId, graph=ERIR_EXAMPLE_GRAPH){
  const all=authorities||[]; const result=[]; for(const a of all){ const direct=(a.relationships||[]).filter(x=>x.targetId===erirId); if(direct.length){result.push({authorityId:a.id,impact:'Directly linked',links:direct});continue;} const targets=(a.relationships||[]).map(x=>x.targetId); const forward=closure(erirId,graph); const reverse={}; Object.entries(graph).forEach(([from,tos])=>tos.forEach(to=>(reverse[to]??=[]).push(from))); const backward=closure(erirId,reverse); if(targets.some(id=>forward.has(id)||backward.has(id))) result.push({authorityId:a.id,impact:'Transitively affected',links:[]}); }
  return result.map(x=>{ const authority=all.find(a=>a.id===x.authorityId)||{}; return {...x,affectedCapabilities:(authority.relationships||[]).filter(link=>link.relationshipType==='supports_capability').map(link=>link.rationale||link.targetId),affectedInventory:(authority.relationships||[]).filter(link=>link.relationshipType==='depends_on_inventory').map(link=>link.rationale||link.targetId),reviewMessage:'Potential impact identified. Review required.'}; });
}

const datePlusDays = (date, days) => { const d=new Date(`${date}T00:00:00Z`); d.setUTCDate(d.getUTCDate()+days); return d.toISOString().slice(0,10); };
export function evidenceExceptions(authority, asOf, windowDays=30){
  const reasons=[], date=String(asOf||'').slice(0,10), horizon=datePlusDays(date,windowDays);
  for(const requirement of authority.evidenceRequirements||[]){
    const label=requirement.id||'Evidence requirement'; const state=String(requirement.assessmentState||'missing').toLowerCase();
    if(state!=='accepted') reasons.push(`${label} is ${state}.`);
    if(!requirement.artifactReferences?.length) reasons.push(`${label} has no evidence artifact reference.`);
    if(requirement.validUntil){
      if(date>requirement.validUntil) reasons.push(`${label} expired ${requirement.validUntil}.`);
      else if(requirement.validUntil>=date && requirement.validUntil<=horizon) reasons.push(`${label} expires within ${windowDays} days (${requirement.validUntil}).`);
    }
  }
  for(const link of authority.relationships||[]) if(link.relationshipType==='supported_by_evidence' && link.resolutionState!=='resolved') reasons.push(`External evidence reference ${link.targetId} is unresolved.`);
  if(authority.reviewDate){
    if(date>authority.reviewDate) reasons.push(`Authority Envelope review/expiry date passed (${authority.reviewDate}).`);
    else if(authority.reviewDate>=date && authority.reviewDate<=horizon) reasons.push(`Authority Envelope requires review within ${windowDays} days (${authority.reviewDate}).`);
  }
  return unique(reasons);
}
function affectedActionIds(authority, asOf, windowDays=30){
  const date=String(asOf||'').slice(0,10), horizon=datePlusDays(date,windowDays), actionIds=[];
  for(const requirement of authority.evidenceRequirements||[]){
    const state=String(requirement.assessmentState||'missing').toLowerCase();
    const expiring=Boolean(requirement.validUntil&&requirement.validUntil>=date&&requirement.validUntil<=horizon);
    if(state!=='accepted'||expiring) actionIds.push(...list(requirement.actionIds));
  }
  if(authority.reviewDate&&authority.reviewDate>=date&&authority.reviewDate<=horizon) actionIds.push(...(authority.actions||[]).map(action=>action.id));
  return unique(actionIds);
}
export function getAuthorityPortfolio(authorities, asOf, options={}){
  const windowDays=options.windowDays??30;
  return (authorities||[]).map(authority=>{ const calculated=effectiveAuthorityState(authority,asOf), exceptions=evidenceExceptions(authority,asOf,windowDays); const evidenceStates=unique((authority.evidenceRequirements||[]).map(x=>x.assessmentState||'missing')); return {authority,asOf,calculated,evidenceStates,evidenceExceptions:exceptions,affectedActionIds:affectedActionIds(authority,asOf,windowDays),requiresAttention:exceptions.length>0}; });
}
export function getAuthorityExceptions(authorities, asOf, options={}){ return getAuthorityPortfolio(authorities,asOf,options).filter(row=>row.requiresAttention); }
export function getActiveAuthorityEvidenceExceptions(authorities, asOf, options={}){ return getAuthorityPortfolio(authorities,asOf,options).filter(row=>row.calculated.state==='Effective — controlled authority' && row.evidenceExceptions.length>0); }
