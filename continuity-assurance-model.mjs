const text=v=>String(v??'').trim();
const list=v=>Array.isArray(v)?v:(v==null||v==='')?[]:[v];
const unique=v=>[...new Set(list(v).map(text).filter(Boolean))];
const clone=v=>v==null?v:structuredClone(v);
const bool=v=>v===true;
const upper=v=>text(v).toUpperCase();
const isoTime=v=>{const raw=text(v);if(!raw||Number.isNaN(Date.parse(raw)))return '';return new Date(raw).toISOString();};
const enumValue=(value,allowed,fallback)=>allowed.includes(value)?value:fallback;

function stableId(seed,prefix='CA'){
  let h=2166136261;
  for(const ch of String(seed||prefix)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}
  return `${prefix}-${(h>>>0).toString(36).toUpperCase()}`;
}

export const CONTINUITY_ASSURANCE_PROFILE='ROI-EA-CONTINUITY-ASSURANCE-PROFILE-V0.1';
export const CONTINUITY_APPLICATION_PATTERN='ROI-EA-CONTINUITY-ASSURANCE-PATTERN-V0.1';
export const LEGACY_CONTINUITY_PROFILE_LABEL='CIF-S-009';
export const LEGACY_CONTINUITY_PATTERN_LABEL='CIF-AP-002';
export const CONTINUITY_SCHEMA_VERSION='ROI-EA-CONTINUITY-ASSURANCE-V0.1';

export const RELIANCE_STATUSES=Object.freeze(['PROPOSED','SUPPORTED','QUALIFIED','UNRESOLVED','SUPERSEDED','SUSPENDED','RETIRED']);
export const EPISTEMIC_STATES=Object.freeze(['UNKNOWN','UNRESOLVED','NOT_ASSESSED','NOT_APPLICABLE','INSUFFICIENT_EVIDENCE','CONFLICTING_EVIDENCE','SUFFICIENT_EVIDENCE']);
export const REASSESSMENT_TRIGGERS=Object.freeze(['CONFIGURATION_CHANGE','INTERACTION_OR_PERFORMANCE_DIVERGENCE','OUTCOME_DIVERGENCE','SCHEDULED_ASSURANCE_REFRESH','EVIDENCE_DEGRADATION']);
export const REASSESSMENT_DISPOSITIONS=Object.freeze(['CONFIRM','MODIFY','SUPERSEDE','SUSPEND','RETIRE']);
export const REASSESSMENT_STATUSES=Object.freeze(['OPEN','IN_REVIEW','DISPOSED','DEFERRED']);
export const CONSTRAINT_TYPES=Object.freeze(['OPERATIONAL','ADAPTATION_CONSTRAINING']);
export const CONSTRAINT_VALIDATION_STATUSES=Object.freeze(['CANDIDATE','VALIDATED','REJECTED','UNRESOLVED']);
export const OUTCOME_ANALYSIS_TYPES=Object.freeze(['RELIEVED','TRANSFERRED','RESHAPED','NEW_EXPOSURE','WORSENED','UNCHANGED_EXPOSURE']);
export const SUCCESSOR_OBLIGATIONS=Object.freeze(['ROLE_ADEQUACY','SEMANTIC_CONTINUITY','BEHAVIORAL_BOUNDARY_CONTINUITY','ARCHITECTURAL_CONTINUITY']);
export const OBLIGATION_STATES=Object.freeze(['SATISFIED','QUALIFIED','UNRESOLVED','NOT_ASSESSED','NOT_APPLICABLE']);
export const VIEW_PERSPECTIVES=Object.freeze(['DESIGNED','OBSERVED','ASSURED']);
export const EVIDENCE_CONFLICT_INVESTIGATION_STATES=Object.freeze(['OPEN','IN_REVIEW','RESOLVED','CONTINUING_UNCERTAINTY']);
export const INTERIM_RELIANCE_DISPOSITIONS=Object.freeze(['QUALIFY','SUSPEND','RESTRICT','CONTINUE_AS_AUTHORIZED']);

function evidenceCollections(workspace={}){
  return [workspace.evidence,workspace.evidence_register,workspace.evidenceRegister,workspace.engagementEvidence,workspace.evidenceInventory]
    .filter(Array.isArray).flat();
}

function evidenceId(record={}){return text(record.id||record.evidence_id||record.evidenceId||record.sourceId);}

function evidenceIndex(workspace={}){
  return new Map(evidenceCollections(workspace).map(r=>[evidenceId(r),r]).filter(([id])=>id));
}

function recordEvidenceState(record={}){
  const explicit=upper(record.epistemicState||record.evidenceState||record.semanticState);
  if(EPISTEMIC_STATES.includes(explicit))return explicit;
  const reviewState=upper(record.review_state||record.reviewState),classification=upper(record.classification);
  if(record.conflicting===true||record.materialConflict===true)return 'CONFLICTING_EVIDENCE';
  if(record.unresolved===true)return 'UNRESOLVED';
  if(record.notApplicable===true)return 'NOT_APPLICABLE';
  if(record.stale===true||reviewState==='SUPERSEDED')return 'INSUFFICIENT_EVIDENCE';
  if(classification==='UNKNOWN')return 'UNKNOWN';
  if(reviewState==='QUALIFIED REVIEW REQUIRED')return 'INSUFFICIENT_EVIDENCE';
  if(reviewState==='NOT REVIEWED')return 'NOT_ASSESSED';
  if(record.materialLimitation===true)return 'INSUFFICIENT_EVIDENCE';
  if(['CLIENT ASSERTION','CONSULTANT INFERENCE','ASSUMPTION','ESTIMATE'].includes(classification))return 'INSUFFICIENT_EVIDENCE';
  if(['REVIEWED','REVIEWED WITH LIMITATION','VALIDATED','VERIFIED'].includes(reviewState))return 'SUFFICIENT_EVIDENCE';
  return 'NOT_ASSESSED';
}

function allDependencyRecords(workspace={}){
  const graphEdges=Array.isArray(workspace.graphEdges)?workspace.graphEdges:[];
  const dependencies=Array.isArray(workspace.dependencies)?workspace.dependencies:[];
  return [...graphEdges,...dependencies];
}

function dependencyId(record={}){return text(record.id||record.dependencyId);}

function dependencyIndex(workspace={}){
  return new Map(allDependencyRecords(workspace).map(r=>[dependencyId(r),r]).filter(([id])=>id));
}

function dependencyMaterialIssue(dep={}){
  const resolution=upper(dep.resolutionState||dep.status);
  const state=upper(dep.epistemicState||dep.evidenceState);
  if(dep.materialUnknown===true||state==='UNKNOWN')return 'UNKNOWN';
  if(dep.materialConflict===true||state==='CONFLICTING_EVIDENCE')return 'CONFLICTING_EVIDENCE';
  if(['UNRESOLVED','PARTIALLY RESOLVED'].includes(resolution)||state==='UNRESOLVED')return 'UNRESOLVED';
  if(dep.stale===true)return 'INSUFFICIENT_EVIDENCE';
  return null;
}

export function normalizeRelianceClaim(raw={}){
  const action=text(raw.essentialActionRef||raw.essentialActionId);
  const relyingActor=text(raw.relyingActorRef||raw.relyingActorId);
  const relianceObjects=unique(raw.relianceObjectRefs||raw.relianceObjects);
  const deps=unique(raw.dependencyRefs||raw.dependencies);
  const ev=unique(raw.evidenceRefs||raw.evidenceIds);
  const seed=[relyingActor,action,...relianceObjects,...deps,text(raw.scope)].join('|');
  return {
    ...clone(raw),
    id:text(raw.id)||stableId(seed,'RLC'),
    relyingActorRef:relyingActor,
    essentialActionRef:action,
    relianceObjectRefs:relianceObjects,
    dependencyRefs:deps,
    conditions:unique(raw.conditions),
    scope:text(raw.scope),
    boundary:text(raw.boundary),
    evidenceRefs:ev,
    effectiveFrom:text(raw.effectiveFrom),
    effectiveTo:text(raw.effectiveTo),
    reviewBy:text(raw.reviewBy),
    status:enumValue(upper(raw.status),RELIANCE_STATUSES,'PROPOSED'),
    qualification:text(raw.qualification),
    provenance:Array.isArray(raw.provenance)?clone(raw.provenance):[],
    createdBy:text(raw.createdBy),
    createdAt:text(raw.createdAt),
    updatedAt:text(raw.updatedAt),
    materialUnknowns:unique(raw.materialUnknowns),
    interimDisposition:upper(raw.interimDisposition),
  };
}

export function relianceClaimIssues(raw={},workspace={}){
  const claim=normalizeRelianceClaim(raw),issues=[];
  if(!claim.relyingActorRef)issues.push('relyingActorRef is required.');
  if(!claim.essentialActionRef)issues.push('essentialActionRef is required.');
  if(!claim.relianceObjectRefs.length&&!claim.dependencyRefs.length)issues.push('At least one reliance object or dependency reference is required.');
  if(!claim.scope)issues.push('scope is required.');
  if(!claim.boundary)issues.push('boundary is required.');
  if(claim.effectiveFrom&&!isoTime(claim.effectiveFrom))issues.push('effectiveFrom must be a valid time when supplied.');
  if(claim.effectiveTo&&!isoTime(claim.effectiveTo))issues.push('effectiveTo must be a valid time when supplied.');
  if(claim.reviewBy&&!isoTime(claim.reviewBy))issues.push('reviewBy must be a valid time when supplied.');
  if(isoTime(claim.effectiveFrom)&&isoTime(claim.effectiveTo)&&isoTime(claim.effectiveFrom)>=isoTime(claim.effectiveTo))issues.push('effectiveTo must be later than effectiveFrom.');
  const deps=dependencyIndex(workspace),ev=evidenceIndex(workspace);
  for(const id of claim.dependencyRefs)if(!deps.has(id))issues.push(`Referenced dependency ${id} is not recorded.`);
  for(const id of claim.evidenceRefs)if(!ev.has(id))issues.push(`Referenced evidence ${id} is not recorded.`);
  return {claim,issues,valid:issues.length===0};
}

export function evaluateRelianceClaim(raw={},workspace={},options={}){
  const structural=relianceClaimIssues(raw,workspace),claim=structural.claim,deps=dependencyIndex(workspace),ev=evidenceIndex(workspace);
  const dependencyConditions=[],evidenceConditions=[];
  for(const issue of structural.issues)dependencyConditions.push({ref:claim.id,state:'INSUFFICIENT_EVIDENCE',reason:issue});
  for(const id of claim.dependencyRefs){
    const dep=deps.get(id);
    if(!dep){dependencyConditions.push({ref:id,state:'INSUFFICIENT_EVIDENCE',reason:'Referenced dependency is missing.'});continue;}
    const issue=dependencyMaterialIssue(dep);
    dependencyConditions.push({ref:id,state:issue||'SUFFICIENT_EVIDENCE',reason:issue?'Material dependency condition limits assurance.':'No material limiting condition recorded.'});
  }
  for(const id of claim.evidenceRefs){
    const item=ev.get(id);
    if(!item){evidenceConditions.push({ref:id,state:'INSUFFICIENT_EVIDENCE',reason:'Referenced evidence is missing.'});continue;}
    evidenceConditions.push({ref:id,state:recordEvidenceState(item),reason:'Evidence state derived from the recorded review/epistemic state.'});
  }
  for(const unknown of claim.materialUnknowns)dependencyConditions.push({ref:unknown,state:'UNKNOWN',reason:'Material unknown explicitly recorded on Reliance Claim.'});
  if(!claim.evidenceRefs.length)evidenceConditions.push({ref:'',state:'INSUFFICIENT_EVIDENCE',reason:'No evidence is linked to this Reliance Claim.'});
  const asOf=isoTime(options.asOf);
  if(asOf&&isoTime(claim.effectiveFrom)&&asOf<isoTime(claim.effectiveFrom))evidenceConditions.push({ref:claim.effectiveFrom,state:'NOT_ASSESSED',reason:'Reliance Claim is not yet effective at the evaluation time.'});
  if(asOf&&isoTime(claim.effectiveTo)&&asOf>=isoTime(claim.effectiveTo))evidenceConditions.push({ref:claim.effectiveTo,state:'INSUFFICIENT_EVIDENCE',reason:'Reliance Claim effective period has ended.'});
  if(asOf&&isoTime(claim.reviewBy)&&asOf>=isoTime(claim.reviewBy))evidenceConditions.push({ref:claim.reviewBy,state:'INSUFFICIENT_EVIDENCE',reason:'Reliance review date has passed.'});
  const all=[...dependencyConditions,...evidenceConditions];
  const states=new Set(all.map(x=>x.state));
  let evidenceState='SUFFICIENT_EVIDENCE';
  if(states.has('CONFLICTING_EVIDENCE'))evidenceState='CONFLICTING_EVIDENCE';
  else if(states.has('UNKNOWN'))evidenceState='UNKNOWN';
  else if(states.has('UNRESOLVED'))evidenceState='UNRESOLVED';
  else if(states.has('INSUFFICIENT_EVIDENCE'))evidenceState='INSUFFICIENT_EVIDENCE';
  else if(states.has('NOT_ASSESSED'))evidenceState='NOT_ASSESSED';

  let effectiveStatus=claim.status;
  const materialLimit=evidenceState!=='SUFFICIENT_EVIDENCE'&&evidenceState!=='NOT_APPLICABLE';
  if(claim.status==='SUPPORTED'&&materialLimit){
    if(claim.interimDisposition==='SUSPEND')effectiveStatus='SUSPENDED';
    else if(evidenceState==='INSUFFICIENT_EVIDENCE'&&claim.qualification)effectiveStatus='QUALIFIED';
    else effectiveStatus='UNRESOLVED';
  }
  if(claim.status==='QUALIFIED'&&(!claim.qualification||materialLimit&&evidenceState!=='INSUFFICIENT_EVIDENCE'))effectiveStatus='UNRESOLVED';
  if(!structural.valid&&['SUPPORTED','QUALIFIED'].includes(effectiveStatus))effectiveStatus=claim.interimDisposition==='SUSPEND'?'SUSPENDED':'UNRESOLVED';
  return {
    claim,
    requestedStatus:claim.status,
    effectiveStatus,
    evidenceState,
    unqualifiedSupported:structural.valid&&effectiveStatus==='SUPPORTED'&&evidenceState==='SUFFICIENT_EVIDENCE',
    dependencyConditions,
    evidenceConditions,
    limitations:all.filter(x=>!['SUFFICIENT_EVIDENCE','NOT_APPLICABLE'].includes(x.state)),
    assuranceScore:null,
    interpretation:'Assurance is evidence-bounded. Dependency existence alone never establishes justified reliance.'
  };
}

export function normalizeConstraintValidation(raw={}){
  const candidate=text(raw.candidateDependencyRef||raw.dependencyRef);
  const action=text(raw.affectedEssentialActionRef||raw.essentialActionRef);
  return {
    ...clone(raw),
    id:text(raw.id)||stableId(`${candidate}|${action}|${text(raw.constraintType)}`,'CDV'),
    candidateDependencyRef:candidate,
    affectedEssentialActionRef:action,
    constraintType:enumValue(upper(raw.constraintType),CONSTRAINT_TYPES,'OPERATIONAL'),
    limitingCharacteristic:text(raw.limitingCharacteristic),
    evidenceRefs:unique(raw.evidenceRefs),
    counterfactualBasis:text(raw.counterfactualBasis),
    alternativeOrSubstituteRefs:unique(raw.alternativeOrSubstituteRefs),
    validationStatus:enumValue(upper(raw.validationStatus),CONSTRAINT_VALIDATION_STATUSES,'CANDIDATE'),
    limitations:text(raw.limitations),
    reviewer:text(raw.reviewer),
    reviewedAt:text(raw.reviewedAt),
    performanceLimitationObserved:bool(raw.performanceLimitationObserved),
    changeLimitationObserved:bool(raw.changeLimitationObserved),
    structuralSignals:unique(raw.structuralSignals),
  };
}

export function validateConstrainingDependency(raw={},workspace={}){
  const record=normalizeConstraintValidation(raw),issues=[];
  if(!record.candidateDependencyRef)issues.push('candidateDependencyRef is required.');
  if(!record.affectedEssentialActionRef)issues.push('affectedEssentialActionRef is required.');
  if(!record.limitingCharacteristic)issues.push('limitingCharacteristic is required.');
  if(record.validationStatus==='VALIDATED'){
    if(!record.evidenceRefs.length)issues.push('Validated constraint requires evidenceRefs.');
    if(!record.reviewer||!record.reviewedAt)issues.push('Validated constraint requires reviewer and reviewedAt.');
    if(record.constraintType==='OPERATIONAL'&&!record.performanceLimitationObserved)issues.push('Operational constraint requires evidence that the dependency materially limits Essential Action performance.');
    if(record.constraintType==='ADAPTATION_CONSTRAINING'&&!record.changeLimitationObserved)issues.push('Adaptation-constraining dependency requires evidence that it materially limits change while preserving the Essential Action.');
  }
  const dep=dependencyIndex(workspace).get(record.candidateDependencyRef);
  if(record.candidateDependencyRef&&!dep)issues.push('Candidate dependency is not recorded in the dependency architecture.');
  const action=(workspace.essentialActions||[]).find(x=>text(x.id)===record.affectedEssentialActionRef);
  if(record.affectedEssentialActionRef&&!action)issues.push('Affected Essential Action is not recorded.');
  const structuralOnly=record.structuralSignals.length>0&&!record.performanceLimitationObserved&&!record.changeLimitationObserved;
  const effectiveValidationStatus=record.validationStatus==='VALIDATED'&&(issues.length||structuralOnly)?'CANDIDATE':record.validationStatus;
  return {
    record,effectiveValidationStatus,valid:issues.length===0&&!structuralOnly,
    issues:structuralOnly?[...issues,'Structural prominence is only a screening signal and cannot validate a constraint.']:issues,
    provesInterventionImprovement:false,
  };
}

function graphRecords(workspace={}){
  const nodes=[...(workspace.graphNodes||[]),...(workspace.applications||[]).map(a=>({id:a.id,label:a.name||a.id,nodeType:'application'}))];
  const edges=[...(workspace.graphEdges||[]),...(workspace.dependencies||[]).map(d=>({id:d.id,sourceId:d.sourceId,targetId:d.targetId,dimension:d.dimension||d.dependencyType||'unknown',resolutionState:d.resolutionState||'Resolved'}))];
  return {nodes,edges};
}

function longestDepth(edges=[]){
  const adj=new Map();
  for(const e of edges){if(!adj.has(e.sourceId))adj.set(e.sourceId,[]);adj.get(e.sourceId).push(e.targetId);}
  let max=0;
  const visit=(id,seen)=>{if(seen.has(id))return 0;const n=new Set(seen);n.add(id);let d=0;for(const next of adj.get(id)||[])d=Math.max(d,1+visit(next,n));return d;};
  for(const id of adj.keys())max=Math.max(max,visit(id,new Set()));
  return max;
}

export function dependencyAccumulationAnalysis(workspace={}){
  const {nodes,edges}=graphRecords(workspace),actions=workspace.essentialActions||[];
  const inDegree=new Map(nodes.map(n=>[text(n.id),0]));
  for(const e of edges)inDegree.set(text(e.targetId),(inDegree.get(text(e.targetId))||0)+1);
  const actionRefs=new Map();
  for(const a of actions)for(const id of unique(a.dependencyNodeIds)){if(!actionRefs.has(id))actionRefs.set(id,[]);actionRefs.get(id).push(text(a.id));}
  const concentration=[...inDegree].filter(([,n])=>n>1).map(([nodeId,inbound])=>({nodeId,inbound})).sort((a,b)=>b.inbound-a.inbound||a.nodeId.localeCompare(b.nodeId));
  const commonality=[...actionRefs].filter(([,ids])=>ids.length>1).map(([nodeId,essentialActionIds])=>({nodeId,essentialActionIds:[...essentialActionIds].sort(),count:essentialActionIds.length})).sort((a,b)=>b.count-a.count||a.nodeId.localeCompare(b.nodeId));
  const fragmentation=actions.map(a=>({essentialActionId:text(a.id),dependencyCount:unique(a.dependencyNodeIds).length})).filter(x=>x.dependencyCount>1).sort((a,b)=>b.dependencyCount-a.dependencyCount||a.essentialActionId.localeCompare(b.essentialActionId));
  const substitutability=actions.map(a=>({essentialActionId:text(a.id),dependencyCount:unique(a.dependencyNodeIds).length,substituteCount:unique(a.fallbackNodeIds).length,bufferRecorded:Boolean(text(a.bufferDescription)),recoveryRecorded:Boolean(text(a.recoveryDescription))}));
  const coordinationDimensions=new Set(['human','organizational','process','relational','authority']);
  const coordinationBurden={edgeCount:edges.filter(e=>coordinationDimensions.has(text(e.dimension))).length,dimensions:unique(edges.map(e=>text(e.dimension)).filter(x=>coordinationDimensions.has(x))).sort()};
  const opacity={unresolvedEdgeCount:edges.filter(e=>['UNRESOLVED','PARTIALLY RESOLVED'].includes(upper(e.resolutionState))).length,unknownDimensionCount:edges.filter(e=>!text(e.dimension)||upper(e.dimension)==='UNKNOWN').length};
  return {
    breadth:{nodeCount:nodes.length,edgeCount:edges.length,essentialActionDependencyCounts:actions.map(a=>({essentialActionId:text(a.id),count:unique(a.dependencyNodeIds).length}))},
    depth:{maximumRecordedDependencyDepth:longestDepth(edges)},
    concentration,commonality,fragmentation,substitutability,coordinationBurden,opacity,
    compositeScore:null,
    status:'Analytical lens — candidate findings require human validation',
  };
}

export function normalizeAssuranceViewRecord(raw={}){
  return {
    id:text(raw.id)||stableId(`${text(raw.subjectRef)}|${upper(raw.perspective)}|${text(raw.statement)}`,'DAV'),
    subjectRef:text(raw.subjectRef),
    perspective:enumValue(upper(raw.perspective),VIEW_PERSPECTIVES,'OBSERVED'),
    statement:text(raw.statement),
    evidenceRefs:unique(raw.evidenceRefs),
    sourceRef:text(raw.sourceRef),
    qualification:text(raw.qualification),
  };
}

export function designedObservedAssuredView(workspace={},options={}){
  const records=(workspace.assuranceViewRecords||[]).map(normalizeAssuranceViewRecord);
  const rows=new Map();
  const row=ref=>{if(!rows.has(ref))rows.set(ref,{subjectRef:ref,DESIGNED:[],OBSERVED:[],ASSURED:[]});return rows.get(ref);};
  for(const r of records)row(r.subjectRef)[r.perspective].push(r);
  for(const cRaw of workspace.relianceClaims||[]){
    const a=evaluateRelianceClaim(cRaw,workspace,options);
    if(['SUPPORTED','QUALIFIED'].includes(a.effectiveStatus))row(a.claim.essentialActionRef).ASSURED.push({id:a.claim.id,subjectRef:a.claim.essentialActionRef,perspective:'ASSURED',statement:`Reliance ${a.effectiveStatus.toLowerCase()} within recorded scope and boundary.`,evidenceRefs:a.claim.evidenceRefs,qualification:a.claim.qualification,status:a.effectiveStatus});
  }
  const result=[...rows.values()].map(r=>{
    const designed=r.DESIGNED.length>0,observed=r.OBSERVED.length>0,assured=r.ASSURED.length>0;
    const comparison=[];
    if(designed&&!observed)comparison.push('DESIGNED_NOT_OBSERVED');
    if(observed&&!designed)comparison.push('OBSERVED_NOT_DESIGNED');
    if(observed&&!assured)comparison.push('OBSERVED_NOT_ASSURED');
    if(designed&&observed&&!assured)comparison.push('DESIGNED_AND_OBSERVED_NOT_ASSURED');
    if(designed&&observed){
      const d=new Set(r.DESIGNED.map(x=>x.statement).filter(Boolean));
      const o=new Set(r.OBSERVED.map(x=>x.statement).filter(Boolean));
      if(d.size&&o.size&&![...d].some(x=>o.has(x)))comparison.push('DESIGNED_OBSERVED_DIVERGENCE');
    }
    if(r.ASSURED.some(x=>x.status==='QUALIFIED'||x.qualification))comparison.push('ASSURED_WITH_QUALIFICATION');
    return {...r,comparison};
  });
  return {rows:result.sort((a,b)=>a.subjectRef.localeCompare(b.subjectRef)),nonhierarchical:true,maturityProgression:false};
}

export function authorityPracticeDivergence(workspace={}){
  return (workspace.governanceObservations||[]).map((raw,index)=>({
    id:text(raw.id)||stableId(`${index}|${text(raw.subjectRef)}`,'GOV'),
    subjectRef:text(raw.subjectRef),formalAuthorityRef:text(raw.formalAuthorityRef),roleAssignmentRef:text(raw.roleAssignmentRef),
    observedInfluenceRef:text(raw.observedInfluenceRef),actualPerformerRef:text(raw.actualPerformerRef),escalationPathRef:text(raw.escalationPathRef),
    deviation:text(raw.deviation),evidenceRefs:unique(raw.evidenceRefs),validationStatus:upper(raw.validationStatus||'CANDIDATE')
  })).filter(r=>r.evidenceRefs.length&&(r.deviation||(r.formalAuthorityRef&&r.observedInfluenceRef&&r.formalAuthorityRef!==r.observedInfluenceRef)))
    .map(r=>({...r,finding:'Formal authority and observed practice diverge.',requiresValidation:r.validationStatus!=='VALIDATED',createsAuthority:false,createsPowerObject:false}));
}

export function normalizeInterventionOutcome(raw={}){
  return {
    ...clone(raw),
    id:text(raw.id)||stableId(`${text(raw.interventionRef)}|${text(raw.affectedEssentialActionRef)}|${text(raw.completedAt)}`,'CIO'),
    decisionRef:text(raw.decisionRef),interventionRef:text(raw.interventionRef),affectedEssentialActionRef:text(raw.affectedEssentialActionRef),
    actionCompleted:bool(raw.actionCompleted),consequences:Array.isArray(raw.consequences)?clone(raw.consequences):[],outcomeEvidenceRefs:unique(raw.outcomeEvidenceRefs),
    outcomeType:OUTCOME_ANALYSIS_TYPES.includes(upper(raw.outcomeType))?upper(raw.outcomeType):'',residualExposure:Array.isArray(raw.residualExposure)?clone(raw.residualExposure):[],
    evidenceState:EPISTEMIC_STATES.includes(upper(raw.evidenceState))?upper(raw.evidenceState):'NOT_ASSESSED',completedAt:text(raw.completedAt),notes:text(raw.notes)
  };
}

export function evaluateInterventionOutcome(raw={},workspace={}){
  const record=normalizeInterventionOutcome(raw),ev=evidenceIndex(workspace),issues=[];
  if(!record.interventionRef)issues.push('interventionRef is required.');
  if(!record.affectedEssentialActionRef)issues.push('affectedEssentialActionRef is required.');
  const missing=record.outcomeEvidenceRefs.filter(id=>!ev.has(id));
  if(missing.length)issues.push(`Outcome evidence not recorded: ${missing.join(', ')}.`);
  let evidenceState=record.evidenceState;
  if(!record.outcomeEvidenceRefs.length||missing.length)evidenceState='INSUFFICIENT_EVIDENCE';
  const realizedOutcomeSupported=record.actionCompleted&&Boolean(record.outcomeType)&&evidenceState==='SUFFICIENT_EVIDENCE';
  return {record,evidenceState,realizedOutcomeSupported,outcomeStatus:realizedOutcomeSupported?record.outcomeType:'UNRESOLVED',residualExposure:record.residualExposure,issues,actionCompletionProvesOutcome:false};
}


export function normalizeEvidenceConflictCase(raw={}){
  const affectedRelianceClaimRef=text(raw.affectedRelianceClaimRef||raw.relianceClaimRef);
  const affectedDecisionRef=text(raw.affectedDecisionRef||raw.decisionRef);
  const investigationState=enumValue(upper(raw.investigationState),EVIDENCE_CONFLICT_INVESTIGATION_STATES,'OPEN');
  const interimRelianceDisposition=INTERIM_RELIANCE_DISPOSITIONS.includes(upper(raw.interimRelianceDisposition))?upper(raw.interimRelianceDisposition):'';
  const resolutionRecord=text(raw.resolutionRecord);
  return {
    ...clone(raw),
    id:text(raw.id)||stableId(`${affectedRelianceClaimRef}|${affectedDecisionRef}|${text(raw.assignedResolver)}`,'ECF'),
    affectedRelianceClaimRef,affectedDecisionRef,conflictingEvidenceRefs:unique(raw.conflictingEvidenceRefs||raw.evidenceRefs),
    interimRelianceDisposition,assignedResolver:text(raw.assignedResolver),investigationState,
    restrictionOrQualification:text(raw.restrictionOrQualification),authorityRef:text(raw.authorityRef),resolutionRecord,
    continuingUncertainty:text(raw.continuingUncertainty),createdAt:text(raw.createdAt),updatedAt:text(raw.updatedAt),
    conflictResolved:investigationState==='RESOLVED'&&Boolean(resolutionRecord),
  };
}

export function evidenceConflictCaseIssues(raw={}){
  const record=normalizeEvidenceConflictCase(raw),issues=[];
  if(!record.affectedRelianceClaimRef&&!record.affectedDecisionRef)issues.push('Affected Reliance Claim or Decision reference is required.');
  if(record.conflictingEvidenceRefs.length<2)issues.push('At least two conflicting evidence references should be recorded.');
  if(!record.interimRelianceDisposition)issues.push('Interim reliance disposition is required for a material conflict.');
  if(!record.assignedResolver)issues.push('Assigned resolver is required for a material conflict.');
  if(record.investigationState==='RESOLVED'&&!record.resolutionRecord)issues.push('Resolved conflict requires a resolution record.');
  return {record,issues,valid:issues.length===0,representationIsResolution:record.conflictResolved};
}

export function normalizeReassessmentRecord(raw={}){
  const trigger=enumValue(upper(raw.trigger),REASSESSMENT_TRIGGERS,'SCHEDULED_ASSURANCE_REFRESH');
  const affected=text(raw.affectedRef||raw.affectedObjectRef);
  return {
    ...clone(raw),id:text(raw.id)||stableId(`${trigger}|${affected}|${text(raw.createdAt)}`,'RAS'),trigger,affectedRef:affected,
    materialityBasis:text(raw.materialityBasis),scope:text(raw.scope),evidenceRefs:unique(raw.evidenceRefs),
    status:enumValue(upper(raw.status),REASSESSMENT_STATUSES,'OPEN'),disposition:REASSESSMENT_DISPOSITIONS.includes(upper(raw.disposition))?upper(raw.disposition):'',
    resultingUpdates:unique(raw.resultingUpdates),reviewer:text(raw.reviewer),authorityRef:text(raw.authorityRef),createdAt:text(raw.createdAt),completedAt:text(raw.completedAt)
  };
}

export function targetedReassessmentScope(raw={},workspace={}){
  const record=normalizeReassessmentRecord(raw),refs=new Set([record.affectedRef].filter(Boolean));
  const claims=(workspace.relianceClaims||[]).map(normalizeRelianceClaim);
  const actions=workspace.essentialActions||[];
  const affectedDep=record.affectedRef;
  for(const claim of claims){
    if(claim.id===record.affectedRef||claim.essentialActionRef===record.affectedRef||claim.dependencyRefs.includes(affectedDep)){
      refs.add(claim.id); if(claim.essentialActionRef)refs.add(claim.essentialActionRef);
    }
  }
  for(const action of actions){
    if(text(action.id)===record.affectedRef||unique(action.dependencyNodeIds).includes(affectedDep))refs.add(text(action.id));
  }
  return {record,affectedRefs:[...refs].sort(),targetedFirst:true,repositoryWideInvalidation:false,interpretation:'Reassess the smallest implicated assurance scope first; expand only when material dependency, traceability, evidence, or consequence supports expansion.'};
}

export function normalizeSuccessorAssurance(raw={}){
  const obligations={};
  for(const key of SUCCESSOR_OBLIGATIONS){
    const src=raw.obligations?.[key]||{};
    obligations[key]={status:enumValue(upper(src.status),OBLIGATION_STATES,'NOT_ASSESSED'),evidenceRefs:unique(src.evidenceRefs),basis:text(src.basis)};
  }
  return {
    ...clone(raw),id:text(raw.id)||stableId(`${text(raw.predecessorRef)}|${text(raw.successorRef)}`,'SAS'),
    predecessorRef:text(raw.predecessorRef),successorRef:text(raw.successorRef),affectedRelianceClaimRefs:unique(raw.affectedRelianceClaimRefs),
    obligations,supportingEvidenceRefs:unique(raw.supportingEvidenceRefs),unresolvedGaps:unique(raw.unresolvedGaps),reassessmentRequired:raw.reassessmentRequired!==false,
    transitionDisposition:text(raw.transitionDisposition),nominalFunctionEquivalent:bool(raw.nominalFunctionEquivalent)
  };
}

export function evaluateSuccessorAssurance(raw={}){
  const record=normalizeSuccessorAssurance(raw),states=Object.values(record.obligations).map(x=>x.status);
  const satisfied=states.every(x=>['SATISFIED','NOT_APPLICABLE'].includes(x))&&record.unresolvedGaps.length===0;
  return {record,satisfied,status:satisfied?'SATISFIED':'NOT_SATISFIED',nominalSimilaritySufficient:false,requiresReassessment:record.reassessmentRequired||!satisfied};
}

export function evaluateHumanAgencyGate(raw={}){
  const affected=unique(raw.affectedHumanRefs),rights=upper(raw.rightsStatus||'NOT_ASSESSED'),preferences=upper(raw.preferenceStatus||'NOT_ASSESSED'),consent=upper(raw.consentStatus||'NOT_ASSESSED');
  const unresolved=[['rights',rights],['preferences',preferences],['consent',consent]].filter(([,v])=>['UNKNOWN','UNRESOLVED','NOT_ASSESSED','CONFLICTING_EVIDENCE'].includes(v)).map(([k])=>k);
  return {
    id:text(raw.id)||stableId(`${affected.join('|')}|${text(raw.scope)}`,'HAG'),affectedHumanRefs:affected,scope:text(raw.scope),rightsStatus:rights,preferenceStatus:preferences,consentStatus:consent,
    meaningfulAlternatives:unique(raw.meaningfulAlternatives),decisionSupportRequired:bool(raw.decisionSupportRequired),challengeOrAppeal:text(raw.challengeOrAppeal),reversible:raw.reversible!==false,
    unresolvedConflicts:unique(raw.unresolvedConflicts),technicalCapability:bool(raw.technicalCapability),status:unresolved.length||unique(raw.unresolvedConflicts).length?'REVIEW_REQUIRED':'REVIEW_READY',
    unresolved,manufacturesLegitimacy:false,technicalCapabilityCreatesAuthorization:false
  };
}

export function evaluateGraduation(raw={},options={}){
  const evidence=unique(raw.evidenceRefs),reentryPath=text(raw.reEntryPath),triggers=unique(raw.reassessmentTriggers),priorSupport=text(raw.priorSupport),proposedSupport=text(raw.proposedSupport);
  const eligible=Boolean(priorSupport&&proposedSupport&&evidence.length&&text(raw.followUpMethod)&&triggers.length&&reentryPath);
  const materialChange=options.materialChange===true;
  return {
    id:text(raw.id)||stableId(`${priorSupport}|${proposedSupport}`,'GRD'),priorSupport,proposedSupport,affectedEssentialActions:unique(raw.affectedEssentialActions),evidenceRefs:evidence,
    followUpMethod:text(raw.followUpMethod),reassessmentTriggers:triggers,reEntryPath:reentryPath,status:materialChange?'REENTRY_REASSESSMENT_REQUIRED':eligible?'GRADUATION_SUPPORTED':'NOT_READY',
    historicalGraduationRewritten:false,reentryIsFailure:false,continuousSurveillanceRequired:false
  };
}

export function interactionDivergence(raw={}){
  const dimensions=['functionAllocation','authorityAllocation','informationRelationship','verificationChallenge','coordinationEscalation','continuityFallback'];
  const differences=[];
  for(const key of dimensions){
    const before=raw.baseline?.[key],after=raw.current?.[key];
    if(JSON.stringify(before)!==JSON.stringify(after))differences.push({dimension:key,baseline:clone(before),current:clone(after)});
  }
  const material=raw.material===true&&differences.length>0;
  return {
    id:text(raw.id)||stableId(`${text(raw.relianceClaimRef)}|${differences.map(x=>x.dimension).join('|')}`,'HAD'),relianceClaimRef:text(raw.relianceClaimRef),differences,
    subtype:raw.gradual===true?'INTERACTION_DRIFT':'INTERACTION_DIVERGENCE',material,reassessmentTrigger:material?'INTERACTION_OR_PERFORMANCE_DIVERGENCE':null,
    humanFactorsNoveltyClaim:false,harcRequiredForNonAi:false
  };
}

export function migrateContinuityAssuranceWorkspace(input={}){
  const next=clone(input)||{};
  next.continuityAssuranceSchema=CONTINUITY_SCHEMA_VERSION;
  next.relianceClaims=(next.relianceClaims||[]).map(normalizeRelianceClaim);
  next.constraintValidations=(next.constraintValidations||[]).map(normalizeConstraintValidation);
  next.reassessmentRecords=(next.reassessmentRecords||[]).map(normalizeReassessmentRecord);
  next.evidenceConflictCases=(next.evidenceConflictCases||[]).map(normalizeEvidenceConflictCase);
  next.assuranceViewRecords=(next.assuranceViewRecords||[]).map(normalizeAssuranceViewRecord);
  next.interventionOutcomes=(next.interventionOutcomes||[]).map(normalizeInterventionOutcome);
  next.successorAssuranceRecords=(next.successorAssuranceRecords||[]).map(normalizeSuccessorAssurance);
  next.humanAgencyReviews=Array.isArray(next.humanAgencyReviews)?clone(next.humanAgencyReviews):[];
  next.graduationRecords=Array.isArray(next.graduationRecords)?clone(next.graduationRecords):[];
  next.interactionDivergenceRecords=Array.isArray(next.interactionDivergenceRecords)?clone(next.interactionDivergenceRecords):[];
  next.continuityAssuranceDefaults={...(next.continuityAssuranceDefaults||{}),missingSemanticState:'NOT_ASSESSED'};
  return next;
}

export function continuityAssuranceSummary(workspace={},options={}){
  const migrated=migrateContinuityAssuranceWorkspace(workspace);
  const claims=migrated.relianceClaims.map(c=>evaluateRelianceClaim(c,migrated,options));
  const constraints=migrated.constraintValidations.map(c=>validateConstrainingDependency(c,migrated));
  return {
    profile:CONTINUITY_ASSURANCE_PROFILE,applicationPattern:CONTINUITY_APPLICATION_PATTERN,
    relianceClaims:claims.length,supported:claims.filter(x=>x.unqualifiedSupported).length,qualified:claims.filter(x=>x.effectiveStatus==='QUALIFIED').length,
    unresolved:claims.filter(x=>['UNRESOLVED','SUSPENDED'].includes(x.effectiveStatus)).length,
    validatedConstraints:constraints.filter(x=>x.effectiveValidationStatus==='VALIDATED'&&x.valid).length,
    reassessmentOpen:migrated.reassessmentRecords.filter(x=>x.status!=='DISPOSED').length,
    unresolvedEvidenceConflicts:migrated.evidenceConflictCases.filter(x=>!x.conflictResolved).length,
    successorAnalyses:migrated.successorAssuranceRecords.length,
    assuranceScore:null,
  };
}
