const text=v=>String(v??'').trim();
const list=v=>Array.isArray(v)?v:v==null?[]:[v];
const unique=v=>[...new Set(list(v).map(text).filter(Boolean))];
export const AGENT_SYSTEM_DIMENSIONS=Object.freeze([
{id:1,key:'roleStructure',label:'Role structure'},
{id:2,key:'coordinationTopology',label:'Coordination topology'},
{id:3,key:'sharedStateArchitecture',label:'Shared-state architecture'},
{id:4,key:'collectiveSynthesisRule',label:'Collective synthesis rule'},
{id:5,key:'collectiveAuthorityStructure',label:'Collective authority structure'},
{id:6,key:'collectiveCapabilityComposition',label:'Collective capability composition'},
{id:7,key:'conflictDissentHandling',label:'Conflict and dissent handling'},
{id:8,key:'collectiveContinuityFailureMode',label:'Collective continuity and failure mode'}]);
const nd=raw=>({value:text(raw?.value),status:text(raw?.status||(raw?.value?'RESOLVED':'UNRESOLVED')).toUpperCase(),
 rationale:text(raw?.rationale),evidenceIds:unique(raw?.evidenceIds),reviewerId:text(raw?.reviewerId)});
export function normalizeAgentSystemProfile(record={}) {
 const dimensions=Object.fromEntries(AGENT_SYSTEM_DIMENSIONS.map(d=>[d.key,nd(record.dimensions?.[d.key]||{})]));
 return {id:text(record.id),systemId:text(record.systemId),componentDeploymentIds:unique(record.componentDeploymentIds),
 componentClassificationIds:unique(record.componentClassificationIds),dimensions,evidenceIds:unique(record.evidenceIds),
 reviewerId:text(record.reviewerId),effectiveFrom:text(record.effectiveFrom),effectiveTo:text(record.effectiveTo),
 reassessmentTriggerRefs:unique(record.reassessmentTriggerRefs),status:text(record.status||'Draft')};
}
export function validateAgentSystemProfile(record={}) {
 const p=normalizeAgentSystemProfile(record),issues=[];
 if(!p.id) issues.push('profile id is required.'); if(!p.systemId) issues.push('systemId is required.');
 if(!p.componentDeploymentIds.length) issues.push('at least one componentDeploymentId is required.');
 if(!p.reviewerId) issues.push('reviewerId is required.'); if(!p.effectiveFrom) issues.push('effectiveFrom is required.');
 for(const d of AGENT_SYSTEM_DIMENSIONS){const x=p.dimensions[d.key]; if(x.status==='UNRESOLVED') issues.push(`${d.label} is unresolved.`);
 if(x.status==='RESOLVED'&&!x.value) issues.push(`${d.label} requires a value.`);
 if(x.status==='RESOLVED'&&!x.evidenceIds.length) issues.push(`${d.label} requires evidence.`);}
 return {profile:p,valid:!issues.length,status:issues.length?'INCOMPLETE':'PASS',issues,inferredFromComponents:false,
 createsAuthority:false,createsDecision:false,aggregateAutonomyScore:null};
}
export function projectLegacySwarmClassification(legacy={}) {
 const m={roleScope:'roleStructure',coordinationTopology:'coordinationTopology',sharedStateModel:'sharedStateArchitecture',collectiveSynthesisRule:'collectiveSynthesisRule'},dimensions={};
 for(const [a,b] of Object.entries(m)) if(legacy.dimensions?.[a]) dimensions[b]=legacy.dimensions[a];
 for(const d of AGENT_SYSTEM_DIMENSIONS) if(!dimensions[d.key]) dimensions[d.key]={status:'UNRESOLVED'};
 return normalizeAgentSystemProfile({...legacy,dimensions});
}
