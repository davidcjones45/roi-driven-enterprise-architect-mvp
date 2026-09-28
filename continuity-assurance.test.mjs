import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeRelianceClaim,evaluateRelianceClaim,continuityAssuranceSummary,
  validateConstrainingDependency,evaluateInterventionOutcome,designedObservedAssuredView,
  authorityPracticeDivergence,targetedReassessmentScope,evaluateSuccessorAssurance,
  evaluateHumanAgencyGate,evaluateGraduation,interactionDivergence,
  dependencyAccumulationAnalysis,migrateContinuityAssuranceWorkspace,evidenceConflictCaseIssues
} from './continuity-assurance-model.mjs';

const evidence=(id,extra={})=>({evidence_id:id,classification:'Verified fact',review_state:'Reviewed with limitation',...extra});
const baseWorkspace=()=>({
  graphNodes:[{id:'APP',nodeType:'application'},{id:'IDP',nodeType:'external-service'},{id:'ALT',nodeType:'external-service'}],
  graphEdges:[{id:'DEP-IDP',sourceId:'APP',targetId:'IDP',edgeType:'depends-on',dimension:'technical',resolutionState:'Resolved'}],
  essentialActions:[{id:'EA-AUTH',label:'Authenticate customer',dependencyNodeIds:['IDP'],fallbackNodeIds:[]}],
  evidence:[evidence('E1')],relianceClaims:[],constraintValidations:[],reassessmentRecords:[]
});

test('CA-01 observed dependency does not create justified Reliance',()=>{
  const ws=baseWorkspace();
  assert.equal(ws.graphEdges.length,1);
  assert.equal(continuityAssuranceSummary(ws).relianceClaims,0);
});

test('CA-02 material unknown dependency prevents unqualified SUPPORTED',()=>{
  const ws=baseWorkspace();ws.graphEdges[0].materialUnknown=true;
  const result=evaluateRelianceClaim({id:'R1',relyingActorRef:'ROLE-OPS',essentialActionRef:'EA-AUTH',dependencyRefs:['DEP-IDP'],evidenceRefs:['E1'],scope:'Production',boundary:'Current configuration',status:'SUPPORTED'},ws);
  assert.equal(result.evidenceState,'UNKNOWN');
  assert.equal(result.effectiveStatus,'UNRESOLVED');
  assert.equal(result.unqualifiedSupported,false);
});

test('CA-03 materially conflicting evidence remains unresolved',()=>{
  const ws=baseWorkspace();ws.evidence.push(evidence('E2',{conflicting:true}));
  const result=evaluateRelianceClaim({id:'R2',relyingActorRef:'ROLE-OPS',essentialActionRef:'EA-AUTH',dependencyRefs:['DEP-IDP'],evidenceRefs:['E1','E2'],scope:'Production',boundary:'Current configuration',status:'SUPPORTED'},ws);
  assert.equal(result.evidenceState,'CONFLICTING_EVIDENCE');
  assert.equal(result.effectiveStatus,'UNRESOLVED');
  assert.ok(result.limitations.length>0);
});

test('CA-04 structural hotspot is not a validated constraint',()=>{
  const ws=baseWorkspace();
  const result=validateConstrainingDependency({candidateDependencyRef:'DEP-IDP',affectedEssentialActionRef:'EA-AUTH',constraintType:'OPERATIONAL',limitingCharacteristic:'High centrality',evidenceRefs:['E1'],validationStatus:'VALIDATED',reviewer:'Architect',reviewedAt:'2026-09-28',structuralSignals:['HIGH_CENTRALITY']},ws);
  assert.equal(result.effectiveValidationStatus,'CANDIDATE');
  assert.equal(result.valid,false);
  assert.match(result.issues.join(' '),/screening signal/i);
});

test('CA-05 evidence-backed operational constraint can be locally validated',()=>{
  const ws=baseWorkspace();
  const result=validateConstrainingDependency({candidateDependencyRef:'DEP-IDP',affectedEssentialActionRef:'EA-AUTH',constraintType:'OPERATIONAL',limitingCharacteristic:'Authentication stops when IDP is unavailable',evidenceRefs:['E1'],counterfactualBasis:'Observed outage interrupted authentication while unrelated functions continued.',validationStatus:'VALIDATED',reviewer:'Architect',reviewedAt:'2026-09-28',performanceLimitationObserved:true},ws);
  assert.equal(result.valid,true);
  assert.equal(result.effectiveValidationStatus,'VALIDATED');
  assert.equal(result.provesInterventionImprovement,false);
});

test('CA-06 completed intervention does not prove an Outcome',()=>{
  const ws=baseWorkspace();
  const result=evaluateInterventionOutcome({interventionRef:'MIT-1',affectedEssentialActionRef:'EA-AUTH',actionCompleted:true,outcomeType:'RELIEVED',outcomeEvidenceRefs:[]},ws);
  assert.equal(result.evidenceState,'INSUFFICIENT_EVIDENCE');
  assert.equal(result.outcomeStatus,'UNRESOLVED');
  assert.equal(result.actionCompletionProvesOutcome,false);
});

test('CA-07 transferred/reshaped burden remains visible as Residual Exposure',()=>{
  const ws=baseWorkspace();
  const result=evaluateInterventionOutcome({interventionRef:'MIT-2',affectedEssentialActionRef:'EA-AUTH',actionCompleted:true,outcomeType:'TRANSFERRED',outcomeEvidenceRefs:['E1'],evidenceState:'SUFFICIENT_EVIDENCE',residualExposure:[{type:'VENDOR_DEPENDENCY',description:'Fallback shifts reliance to alternate vendor'}]},ws);
  assert.equal(result.realizedOutcomeSupported,true);
  assert.equal(result.outcomeStatus,'TRANSFERRED');
  assert.equal(result.residualExposure.length,1);
});

test('CA-08 Designed and Observed may diverge without authority inference',()=>{
  const ws=baseWorkspace();
  ws.assuranceViewRecords=[
    {id:'D1',subjectRef:'EA-AUTH',perspective:'DESIGNED',statement:'BPMN says Role A performs approval',evidenceRefs:['E1'],sourceRef:'BPMN'},
    {id:'O1',subjectRef:'EA-AUTH',perspective:'OBSERVED',statement:'Walkthrough shows Role B performs approval',evidenceRefs:['E1'],sourceRef:'WALKTHROUGH'}
  ];
  const view=designedObservedAssuredView(ws).rows[0];
  assert.ok(view.comparison.includes('DESIGNED_OBSERVED_DIVERGENCE'));
  assert.ok(view.comparison.includes('DESIGNED_AND_OBSERVED_NOT_ASSURED'));
  assert.equal(view.ASSURED.length,0);
});

test('CA-09 formal authority and observed influence remain distinct',()=>{
  const ws=baseWorkspace();ws.governanceObservations=[{subjectRef:'EA-AUTH',formalAuthorityRef:'ROLE-CIO',observedInfluenceRef:'ROLE-OPS-LEAD',actualPerformerRef:'ROLE-ANALYST',evidenceRefs:['E1'],validationStatus:'CANDIDATE'}];
  const rows=authorityPracticeDivergence(ws);
  assert.equal(rows.length,1);
  assert.equal(rows[0].formalAuthorityRef,'ROLE-CIO');
  assert.equal(rows[0].observedInfluenceRef,'ROLE-OPS-LEAD');
  assert.equal(rows[0].createsAuthority,false);
  assert.equal(rows[0].createsPowerObject,false);
});

test('CA-10 reassessment is targeted to materially implicated references',()=>{
  const ws=baseWorkspace();
  ws.relianceClaims=[
    normalizeRelianceClaim({id:'R-A',relyingActorRef:'A',essentialActionRef:'EA-AUTH',dependencyRefs:['DEP-IDP'],scope:'Prod',boundary:'Current'}),
    normalizeRelianceClaim({id:'R-B',relyingActorRef:'B',essentialActionRef:'EA-OTHER',dependencyRefs:['DEP-OTHER'],scope:'Prod',boundary:'Current'})
  ];
  ws.essentialActions.push({id:'EA-OTHER',dependencyNodeIds:['OTHER']});
  const scope=targetedReassessmentScope({trigger:'CONFIGURATION_CHANGE',affectedRef:'DEP-IDP',materialityBasis:'IDP configuration changed',scope:'Authentication'},ws);
  assert.ok(scope.affectedRefs.includes('R-A'));
  assert.ok(scope.affectedRefs.includes('EA-AUTH'));
  assert.ok(!scope.affectedRefs.includes('R-B'));
  assert.equal(scope.repositoryWideInvalidation,false);
});

test('CA-11 nominally equivalent successor fails when semantic continuity is unresolved',()=>{
  const result=evaluateSuccessorAssurance({predecessorRef:'VENDOR-A',successorRef:'VENDOR-B',nominalFunctionEquivalent:true,obligations:{ROLE_ADEQUACY:{status:'SATISFIED',evidenceRefs:['E1']},SEMANTIC_CONTINUITY:{status:'UNRESOLVED'},BEHAVIORAL_BOUNDARY_CONTINUITY:{status:'SATISFIED',evidenceRefs:['E1']},ARCHITECTURAL_CONTINUITY:{status:'SATISFIED',evidenceRefs:['E1']}},unresolvedGaps:['Context semantics not demonstrated']});
  assert.equal(result.status,'NOT_SATISFIED');
  assert.equal(result.nominalSimilaritySufficient,false);
});

test('CA-12 Human Agency Gate does not turn technical capability into admissibility or authorization',()=>{
  const result=evaluateHumanAgencyGate({affectedHumanRefs:['PERSON-1'],scope:'Support transition',technicalCapability:true,rightsStatus:'NOT_ASSESSED',preferenceStatus:'SUPPORTED',consentStatus:'UNRESOLVED',meaningfulAlternatives:['Option A','Option B']});
  assert.equal(result.status,'REVIEW_REQUIRED');
  assert.equal(result.technicalCapabilityCreatesAuthorization,false);
  assert.ok(result.unresolved.includes('consent'));
});

test('CA-13 Graduation supports reassessment/re-entry without rewriting history as failure',()=>{
  const base={priorSupport:'Daily support',proposedSupport:'Weekly check-in',affectedEssentialActions:['EA-LIFE'],evidenceRefs:['E1'],followUpMethod:'Monthly review',reassessmentTriggers:['Material health or context change'],reEntryPath:'Restore prior support'};
  const initial=evaluateGraduation(base);
  const reentry=evaluateGraduation(base,{materialChange:true});
  assert.equal(initial.status,'GRADUATION_SUPPORTED');
  assert.equal(reentry.status,'REENTRY_REASSESSMENT_REQUIRED');
  assert.equal(reentry.historicalGraduationRewritten,false);
  assert.equal(reentry.reentryIsFailure,false);
});

test('CA-14 imported structure remains evidence and does not become assured authority',()=>{
  const ws=baseWorkspace();
  ws.assuranceViewRecords=[
    {subjectRef:'ROLE-1',perspective:'DESIGNED',statement:'BPMN lane allocation',sourceRef:'BPMN',evidenceRefs:['E1']},
    {subjectRef:'ROLE-1',perspective:'OBSERVED',statement:'Microsoft Graph reports manager relationship',sourceRef:'MICROSOFT_GRAPH',evidenceRefs:['E1']}
  ];
  const row=designedObservedAssuredView(ws).rows[0];
  assert.equal(row.ASSURED.length,0);
  assert.ok(row.comparison.includes('DESIGNED_AND_OBSERVED_NOT_ASSURED'));
});

test('dependency accumulation exposes separate dimensions and no composite score',()=>{
  const ws=baseWorkspace();ws.graphEdges.push({id:'D2',sourceId:'APP',targetId:'ALT',dimension:'organizational',resolutionState:'Unresolved'});ws.essentialActions[0].dependencyNodeIds=['IDP','ALT'];
  const a=dependencyAccumulationAnalysis(ws);
  assert.equal(a.compositeScore,null);
  assert.ok(a.breadth.edgeCount>=2);
  assert.ok(a.fragmentation.length>=1);
  assert.ok(a.opacity.unresolvedEdgeCount>=1);
});

test('Interaction Divergence creates a bounded reassessment trigger only when material',()=>{
  const x=interactionDivergence({relianceClaimRef:'R-A',material:true,baseline:{functionAllocation:'Human review',authorityAllocation:'Human'},current:{functionAllocation:'AI drafts, human reviews',authorityAllocation:'Human'}});
  assert.equal(x.material,true);
  assert.equal(x.reassessmentTrigger,'INTERACTION_OR_PERFORMANCE_DIVERGENCE');
  assert.equal(x.harcRequiredForNonAi,false);
});

test('migration is additive and defaults absent new semantics to NOT_ASSESSED rather than UNKNOWN',()=>{
  const source={graphNodes:[{id:'A'}],essentialActions:[{id:'EA'}]};
  const migrated=migrateContinuityAssuranceWorkspace(source);
  assert.equal(migrated.graphNodes[0].id,'A');
  assert.equal(migrated.continuityAssuranceDefaults.missingSemanticState,'NOT_ASSESSED');
  assert.deepEqual(migrated.relianceClaims,[]);
});


test('recording conflicting evidence does not itself resolve the conflict',()=>{
  const x=evidenceConflictCaseIssues({affectedRelianceClaimRef:'R-A',conflictingEvidenceRefs:['E1','E2'],interimRelianceDisposition:'SUSPEND',assignedResolver:'Architect',investigationState:'IN_REVIEW'});
  assert.equal(x.valid,true);
  assert.equal(x.record.conflictResolved,false);
  assert.equal(x.representationIsResolution,false);
});
