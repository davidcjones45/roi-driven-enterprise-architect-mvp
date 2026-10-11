/** Revision-qualified, noncanonical projections; never shipment execution. */
import { normalizeGraphNode,normalizeGraphEdge } from './dependency-graph-model.mjs';
import { evaluateRelianceClaim,validateConstrainingDependency,evaluateInterventionOutcome,normalizeReassessmentRecord } from './continuity-assurance-model.mjs';
import { validateWorkspaceShape,assertSafeJSON,isRecord } from './ux-safety-model.mjs';
import { validateCase,analyzeCase,economics,compareOutcomes } from './logistics-release-diagnostic.mjs';
import { logisticsFixture } from './logistics-release-fixture.mjs';
export const ROI_KEY='roi-driven-enterprise-architect-mvp-v1';
export const ARCHITECTURE_KEY='roi-ea-application-modernization-m1-v0.1';
export const ALTERNATIVES=[
 {id:'A0',name:'Retain baseline',category:'Do nothing',cost:'No incremental cost',benefit:'No claimed improvement',feasibility:'Current process',risk:'Cutoff queue persists'},
 {id:'A1',name:'Complete packet and approved qualified backup',category:'Simplify',cost:'Training/delegation; estimate $2,400 plus engagement fee',benefit:'Test authorized-review queue relief',feasibility:'Competence, permission and capacity prerequisites',risk:'Incorrect delegation or workload transfer'},
 {id:'A2',name:'Deterministic reminders and routing',category:'Automate',cost:'Unknown; obtain estimate',benefit:'Test missed acknowledgements',feasibility:'Existing-system capability review',risk:'Alerts do not remove unavailable authority'},
 {id:'A3',name:'ERP/WMS integration',category:'Integrate',cost:'Unknown; obtain estimate',benefit:'Only if synchronization is limiting',feasibility:'Interface and ownership review required',risk:'Scope expansion without proven mechanism'},
 {id:'A4',name:'Additional dock capacity',category:'Simplify',cost:'Unknown; obtain estimate',benefit:'Only if physical dock capacity is limiting',feasibility:'Capacity analysis required',risk:'Spend without relieving review queue'}
];
const current=(c,k)=>c[k].filter(r=>r.revision===c.revision).at(-1);
export function projection(input){
 const c=validateCase(input),a=analyzeCase(c),prefix=`LOG:${c.id}:r${c.revision}:`,id=x=>prefix+x;
 const reviewed=!!current(c,'reviews'),hyp=current(c,'hypotheses'),decision=current(c,'decisions'),outcome=current(c,'outcomes');
 const evidence=c.evidence.map(e=>({...e,id:id(e.id),classification:'Assumption',review_state:reviewed?'Reviewed with limitation':'Not reviewed',synthetic:true,limitation:'Synthetic source; not real operational evidence.',sourceReference:`${c.id} r${c.revision} ${e.locator}`}));
 const nodes=[['ERP','ERP','application'],['WMS','WMS','application'],['TMS','TMS','application'],['PACKET','Reviewed reconciliation packet','data'],['LEAD','Inventory-control review role','role'],['SHIP','Shipping supervisor','role'],['DOCK','Outbound dock','resource'],['EA-01','Release/hold decision before cutoff','essential-action']].map(([key,label,nodeType])=>normalizeGraphNode({id:id(key),label:`SYNTHETIC ${label}`,nodeType,sourceSystem:'Logistics diagnostic',sourceReference:`${c.id} revision ${c.revision}`,evidenceRefs:evidence.map(e=>e.id)}));
 const edgeSpecs=[['D-01','PACKET','ERP','informational'],['D-02','PACKET','WMS','informational'],['D-03','EA-01','LEAD','authority'],['D-04','EA-01','TMS','informational'],['D-05','SHIP','PACKET','process'],['D-DOCK','EA-01','DOCK','physical']];
 const graphEdges=edgeSpecs.map(([key,source,target,dimension])=>normalizeGraphEdge({id:id(key),sourceId:id(source),targetId:id(target),edgeType:'depends-on',dimension,resolutionState:reviewed?'Resolved':'Partially resolved',reviewState:reviewed?'Reviewed':'Unreviewed',sourceSystem:'Logistics diagnostic',sourceReference:`${c.id} revision ${c.revision}`,evidenceRefs:evidence.map(e=>e.id),notes:'Synthetic analytical relationship; no operational authority.'}));
 const essentialActions=[{id:id('EA-01'),name:'SYNTHETIC release/hold decision before cutoff',continuityAnchorRef:id('CA-01')}];
 const reviewWait=a.shipments[0]?.rows.reviewQueue.value,loadWait=a.shipments[0]?.rows.releaseToLoad.value;
 const prerequisiteEvidence=a.readiness.eligible==='TRUE'&&c.context.source_versions_available===true;
 const supportingEvidence=!!hyp&&['E-2','E-5','E-6','E-capacity'].every(ref=>hyp.evidenceRefs.includes(ref));
 const releaseEvent=c.events.find(e=>e.event_type==='RELEASE_AUTHORIZED');
 const dockUnavailable=releaseEvent&&Date.parse(c.context.dock_available_at)>Date.parse(releaseEvent.occurred_at);
 const mechanism=supportingEvidence&&prerequisiteEvidence&&((hyp.choice==='D-03'&&reviewWait>0&&Date.parse(c.context.dock_available_at)<=Date.parse(c.context.review_role_unavailable_until))||(hyp.choice==='D-DOCK'&&dockUnavailable&&loadWait>0));
 const constraint={id:id('CDV-01'),candidateDependencyRef:id(hyp?.choice==='D-DOCK'?'D-DOCK':'D-03'),affectedEssentialActionRef:id('EA-01'),constraintType:'OPERATIONAL',limitingCharacteristic:hyp?.rationale||'Candidate only: challenge review capacity, dock, physical and synchronization alternatives.',evidenceRefs:(hyp?.evidenceRefs||[]).map(id),validationStatus:mechanism?'VALIDATED':'CANDIDATE',performanceLimitationObserved:mechanism,reviewer:hyp?.reviewer||'',reviewedAt:hyp?.at||'',counterfactualBasis:'Synthetic event replay; not causal proof in a client operation.',limitations:'Only fictional source evidence; reviewer disposition does not establish real constraint validation.'};
 const claim={id:id('RLC-01'),relyingActorRef:id('SHIP'),essentialActionRef:id('EA-01'),relianceObjectRefs:[id('PACKET')],dependencyRefs:graphEdges.map(e=>e.id),scope:c.scope,boundary:'Diagnostic only. No live release authority.',evidenceRefs:evidence.map(e=>e.id),status:reviewed?'QUALIFIED':'PROPOSED',qualification:'Synthetic fixture conditions only; no real operating assurance.',materialUnknowns:a.readiness.flags};
 const workspace={graphNodes:nodes,graphEdges,evidence,continuityAnchors:[{id:id('CA-01'),name:'SYNTHETIC correct, timely customer fulfillment'}],essentialActions,relianceClaims:[claim],constraintValidations:[constraint],reassessmentRecords:[normalizeReassessmentRecord({id:id('RAR-01'),affectedRef:id('D-03'),trigger:'SCHEDULED_ASSURANCE_REFRESH',status:'OPEN',reason:c.pilot.review})],interventionOutcomes:[]};
 let comparison=null;
 if(outcome){comparison=compareOutcomes(c,logisticsFixture(outcome.choice));workspace.interventionOutcomes.push({id:id('CIO-01'),interventionRef:id(decision?.choice||'DEFERRED'),decisionRef:id(decision?.id||'none'),affectedEssentialActionRef:id('EA-01'),actionCompleted:false,outcomeType:comparison.types[0]==='UNRESOLVED'?'':comparison.types[0],outcomeEvidenceRefs:evidence.map(e=>e.id),evidenceState:'INSUFFICIENT_EVIDENCE',notes:'Synthetic replay only; no intervention has been executed.',residualExposure:['Delegate absence','Peak arrivals','Source synchronization','Downstream queue transfer']});}
 const roiEvidence=evidence.map(e=>({...e,claim:e.description,area:'Logistics diagnostic',recordType:'Assumption',state:'Supplied',source:e.sourceReference,sourceOwner:'Synthetic fixture',confidence:'Assumption',limitation:e.limitation,reviewDate:''}));
 const e=c.economics;
 const roi={opportunity:{id:id('OPP'),name:`SYNTHETIC ${c.name}`,sponsor:'Fictional operations manager',deadline:'2026-10-31',capability:'Outbound shipment release',problem:'Physically ready freight may wait across reconciliation/authority handoffs.',decision:'Review a bounded process pilot; never authorize a shipment here.',evidenceOwner:'Synthetic fixture reviewer',evidenceState:'Supplied'},evidence:roiEvidence,inventory:['ERP','WMS','TMS'].map(name=>({id:id(name),name:`SYNTHETIC ${name}`,type:'Application',capability:'Outbound release',businessOwner:'Fictional operations',technicalOwner:'Source owner',lifecycle:'Maintain',criticality:'High',dataClass:'Synthetic',dependencies:'See revision-qualified diagnostic graph',evidenceRef:`${prefix}E-capacity`})),
 baseline:{annualVolume:String(e.monthlyExceptions*12),hoursPerOccurrence:String(e.activeMinutesSaved/60),loadedRate:String(e.loadedRate),annualErrorCost:'0',currentToolCost:'0',laborReduction:'100',errorReduction:'0',implementationCost:String(e.implementationCost+e.consultingFee),recurringCost:String(e.monthlyRecurring*12),valueClass:'Capacity release — not cash savings',baselineEvidence:'Synthetic prospective capacity estimate; no measured labor baseline. Charges excluded until validated. Includes engagement fee.',financeOwner:'Not assigned; client finance review required'},
 architecture:{title:'SYNTHETIC outbound handoff intervention',authority:decision?.reviewer||'Not recorded',reviewDate:'',decisionStatus:'Proposed',context:c.scope,conditions:'Competence, authority, workload and evidence must be confirmed by the operating organization.',rationale:decision?.rationale||'Compare alternatives before selection.',preferredAlternative:decision&&ALTERNATIVES.some(x=>x.id===decision.choice)?String(ALTERNATIVES.findIndex(x=>x.id===decision.choice)):'',alternatives:structuredClone(ALTERNATIVES)},
 pilot:{pilotName:'SYNTHETIC outbound exception process pilot',pilotOwner:'Fictional operations manager',startDate:'',endDate:'',hypothesis:'A qualified approved backup reduces complete-packet review queue without delay transfer.',metric:c.pilot.metric,metricBaseline:'Unknown population baseline; single-shipment replay is not p90 evidence.',metricTarget:c.pilot.target,measurementOwner:'Not assigned',scope:c.pilot.scope,guardrails:c.pilot.guardrails,stopRules:c.pilot.stopRules,goNoGo:'Client-approved thresholds, comparable cohorts and independent outcome evidence required.'},results:{},risk:{},authorityEnvelope:{}};
 return {synthetic:true,canonicalization:false,prefix,workspace,roi,analysis:a,comparison,economics:economics(c),evaluations:{reliance:evaluateRelianceClaim(claim,workspace),constraint:validateConstrainingDependency(constraint,workspace),outcome:workspace.interventionOutcomes.map(x=>evaluateInterventionOutcome(x,workspace))},manifest:{caseId:c.id,revision:c.revision,diagnosticExport:`${c.id}-r${c.revision}.json`,nativeWorkspaceKeys:[ROI_KEY,ARCHITECTURE_KEY],separateStores:true,confersAuthority:false}};
}
export function mergeArchitecture(existing,input){
 if(!isRecord(existing))throw Error('Invalid architecture workspace.');assertSafeJSON(existing);
 const seed=projection(input).workspace,next=structuredClone(existing);
 for(const [key,rows] of Object.entries(seed)){
  if(next[key]!==undefined&&(!Array.isArray(next[key])||next[key].some(x=>!isRecord(x))))throw Error(`Invalid architecture collection ${key}.`);
  const retained=next[key]||[],map=new Map(retained.map(x=>[x.id,x]));
  for(const row of rows){if(map.has(row.id)&&JSON.stringify(map.get(row.id))!==JSON.stringify(row))throw Error('Projection ID collision; retain existing record and reconcile.');if(!map.has(row.id))map.set(row.id,row);}
  next[key]=[...map.values()];
 }
 return next;
}
export function mergeRoi(existing,input){
 validateWorkspaceShape(existing);const seed=projection(input).roi;
 // Existing assessment values are never replaced, including a prior logistics revision.
 for(const key of ['opportunity','baseline','architecture','pilot']){
  const prior=existing[key]||{};
  const meaningful=Object.entries(prior).some(([k,v])=>k==='alternatives'?Array.isArray(v)&&v.length>0:v!==''&&v!==null&&v!==undefined);
  if(meaningful&&JSON.stringify(prior)!==JSON.stringify(seed[key]))throw Error(`ROI ${key} contains work. Export the native seed and map it manually, or use a separate browser profile.`);
 }
 const next=structuredClone(existing);for(const key of ['opportunity','baseline','architecture','pilot'])next[key]=seed[key];
 for(const key of ['evidence','inventory']){const map=new Map((next[key]||[]).map((x,i)=>[x.id||`retained-${i}`,x]));for(const row of seed[key]){if(map.has(row.id)&&JSON.stringify(map.get(row.id))!==JSON.stringify(row))throw Error('ROI projection ID collision.');map.set(row.id,row);}next[key]=[...map.values()];}
 return next;
}
