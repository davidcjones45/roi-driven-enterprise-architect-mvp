import { dependencyGraphCifProjection } from './dependency-cif-bridge.mjs';
import {
  CONTINUITY_ASSURANCE_PROFILE, CONTINUITY_APPLICATION_PATTERN,
  migrateContinuityAssuranceWorkspace, evaluateRelianceClaim,
  normalizeConstraintValidation, normalizeReassessmentRecord,
  normalizeSuccessorAssurance, normalizeInterventionOutcome, normalizeEvidenceConflictCase
} from './continuity-assurance-model.mjs';

const clone=v=>v==null?v:structuredClone(v);

export function continuityAssuranceCifHandoff(workspace={},options={}){
  const migrated=migrateContinuityAssuranceWorkspace(workspace);
  const evalOptions={...options,asOf:options.asOf||options.generatedAt||new Date().toISOString()};
  const dependencyProjection=dependencyGraphCifProjection(migrated,options);
  const relianceClaims=migrated.relianceClaims.map(raw=>{
    const evaluation=evaluateRelianceClaim(raw,migrated,evalOptions);
    return {
      localId:evaluation.claim.id,
      specialization:CONTINUITY_ASSURANCE_PROFILE,
      essentialActionRef:evaluation.claim.essentialActionRef,
      dependencyRefs:[...evaluation.claim.dependencyRefs],
      relianceObjectRefs:[...evaluation.claim.relianceObjectRefs],
      evidenceRefs:[...evaluation.claim.evidenceRefs],
      scope:evaluation.claim.scope,
      boundary:evaluation.claim.boundary,
      requestedStatus:evaluation.requestedStatus,
      effectiveStatus:evaluation.effectiveStatus,
      evidenceState:evaluation.evidenceState,
      qualification:evaluation.claim.qualification,
      cifCandidate:{family:'OF-12',subtype:'CLAIM'},
      classificationState:'SPECIALIZATION_METADATA_ONLY',
      note:'Reliance Claim is a CIF-S-009 specialization over existing CIF semantics. This handoff does not canonicalize the claim or create Authority, Decision, Acceptance, Control effectiveness, causal improvement, or realized Outcome.'
    };
  });

  const validatedConstraints=migrated.constraintValidations.map(normalizeConstraintValidation).map(record=>({
    localId:record.id,candidateDependencyRef:record.candidateDependencyRef,affectedEssentialActionRef:record.affectedEssentialActionRef,
    constraintType:record.constraintType,validationStatus:record.validationStatus,evidenceRefs:[...record.evidenceRefs],counterfactualBasis:record.counterfactualBasis,
    cifCandidate:{family:'OF-12',subtype:'CLAIM'},classificationState:record.validationStatus==='VALIDATED'?'HUMAN_VALIDATED_LOCAL_FINDING':'LOCAL_CANDIDATE_ONLY',
    note:'Constraining-dependency classification is an evidence-bounded analytical claim about a Dependency and Essential Action. It is not a normative OF-14 Rule/Obligation and structural prominence never establishes it as fact.'
  }));

  const reassessments=migrated.reassessmentRecords.map(normalizeReassessmentRecord).map(record=>({
    localId:record.id,trigger:record.trigger,affectedRef:record.affectedRef,scope:record.scope,status:record.status,disposition:record.disposition,
    evidenceRefs:[...record.evidenceRefs],resultingUpdates:[...record.resultingUpdates],specialization:CONTINUITY_ASSURANCE_PROFILE,
    note:'Reassessment metadata is application workflow state and does not create or reopen canonical CIF objects automatically.'
  }));

  const successors=migrated.successorAssuranceRecords.map(normalizeSuccessorAssurance).map(record=>({
    localId:record.id,predecessorRef:record.predecessorRef,successorRef:record.successorRef,affectedRelianceClaimRefs:[...record.affectedRelianceClaimRefs],
    obligations:clone(record.obligations),unresolvedGaps:[...record.unresolvedGaps],transitionDisposition:record.transitionDisposition,
    specialization:'SUCCESSOR_ASSURANCE',classificationState:'SPECIALIZED_ANALYSIS_ONLY'
  }));

  const evidenceConflicts=migrated.evidenceConflictCases.map(normalizeEvidenceConflictCase).map(record=>({
    localId:record.id,affectedRelianceClaimRef:record.affectedRelianceClaimRef,affectedDecisionRef:record.affectedDecisionRef,
    conflictingEvidenceRefs:[...record.conflictingEvidenceRefs],interimRelianceDisposition:record.interimRelianceDisposition,assignedResolver:record.assignedResolver,
    investigationState:record.investigationState,resolutionRecord:record.resolutionRecord,continuingUncertainty:record.continuingUncertainty,
    classificationState:'APPLICATION_CONFLICT_WORKFLOW_ONLY',
    note:'Recording conflicting evidence does not resolve it or create a successful assurance state.'
  }));

  const interventionOutcomes=migrated.interventionOutcomes.map(normalizeInterventionOutcome).map(record=>({
    localId:record.id,decisionRef:record.decisionRef,interventionRef:record.interventionRef,affectedEssentialActionRef:record.affectedEssentialActionRef,
    actionCompleted:record.actionCompleted,consequences:clone(record.consequences),outcomeType:record.outcomeType,evidenceState:record.evidenceState,
    residualExposure:clone(record.residualExposure),classificationState:'APPLICATION_ANALYSIS_ONLY',
    note:'Action completion does not establish successful Outcome; outcome and residual exposure remain evidence-bounded.'
  }));

  return {
    profile:'AIHS-CONTINUITY-ASSURANCE-CIF-HANDOFF-V0.1',
    specialization:CONTINUITY_ASSURANCE_PROFILE,
    applicationPattern:CONTINUITY_APPLICATION_PATTERN,
    generatedAt:options.generatedAt||new Date().toISOString(),
    cifFrameworkVersion:dependencyProjection.cifFrameworkVersion,
    cifExternalValidationStatus:dependencyProjection.cifExternalValidationStatus,
    canonicalization:false,
    localAuthorityBoundary:'Continuity-assurance export is ROI-EA application-local metadata plus candidate CIF mappings under CIF v0.4.1. It does not create a canonical CIF specialization, Authority, Decision, Acceptance, legal applicability, clinical correctness, Control effectiveness, causal improvement, or realized Outcome.',
    dependencyProjection,
    relianceClaims,validatedConstraints,reassessments,evidenceConflicts,successors,interventionOutcomes,
    evidenceStates:migrated.relianceClaims.map(c=>evaluateRelianceClaim(c,migrated,evalOptions)).map(x=>({relianceClaimRef:x.claim.id,state:x.evidenceState,effectiveStatus:x.effectiveStatus})),
    summary:{
      relianceClaims:relianceClaims.length,
      unqualifiedSupported:relianceClaims.filter(x=>x.effectiveStatus==='SUPPORTED'&&x.evidenceState==='SUFFICIENT_EVIDENCE').length,
      validatedConstraintRecords:validatedConstraints.filter(x=>x.validationStatus==='VALIDATED').length,
      reassessments:reassessments.length,
      unresolvedEvidenceConflicts:evidenceConflicts.filter(x=>x.investigationState!=='RESOLVED').length,
      successorAnalyses:successors.length,
      interventionOutcomes:interventionOutcomes.length
    }
  };
}
