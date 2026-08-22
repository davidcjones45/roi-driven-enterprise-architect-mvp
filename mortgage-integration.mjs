import { evaluateMortgageCase } from './mortgage-model.mjs';

const inputValue = (fixture, field) => fixture.caseInputs?.find(row => row.field === field)?.value;
const notQuantified = reason => ({ state:'NOT QUANTIFIED', reason });

export function executeMortgageIntegration(fixture={}, options={}) {
  const assessment = evaluateMortgageCase(fixture, options);
  if (!assessment.valid) return { valid:false, errors:assessment.errors, finalState:'EXECUTION REJECTED—INVALID FIXTURE' };

  const applicationId = String(inputValue(fixture, 'application_id') || 'UNIDENTIFIED');
  const outputArtifactId = `TRACE-${applicationId}`;
  const sourceIds = (fixture.erirSources || []).map(source => source.id);
  const incompleteEvidence = assessment.evidenceGaps.length > 0;
  const capabilitySuspended = !assessment.capability.configurationMatch;
  const finalState = capabilitySuspended
    ? 'CAPABILITY SUSPENDED—REASSESSMENT REQUIRED; NO CREDIT DECISION'
    : incompleteEvidence
      ? 'AWAITING EVIDENCE AND QUALIFIED HUMAN REVIEW; NO CREDIT DECISION'
      : 'READY FOR QUALIFIED HUMAN DISPOSITION; NO CREDIT DECISION';

  const roiEa = {
    layer:'ROI-EA',
    artifactId:'ROI-MTG-001',
    status:'CONTROLLED SYNTHETIC COMPARISON COMPLETE',
    inputIds:assessment.metricTrace.flatMap(metric => metric.inputIds),
    outputs:{ metrics:assessment.metrics, policyTrace:assessment.policyTrace, evidenceState:assessment.evidenceState, financialReviewRoute:assessment.financialReviewRoute },
    contribution:'Provides decision context, deterministic measures, fictional policy comparison, evidence gaps, and the current review route.',
    limit:'Does not approve, deny, determine eligibility, price, counteroffer, issue a notice, waive policy, or establish realized ROI.',
  };

  const erir = {
    layer:'ERIR',
    artifactId:'ERIR-TRACE-MTG-001',
    status:'CONTROLLED SOURCE SEED LOADED—LIVE RECORD VERIFICATION PENDING',
    sourceIds,
    seedCount:sourceIds.length,
    repositoryVerification:{ state:'NOT ATTEMPTED', returnedIds:[], missingIds:sourceIds, message:'The controlled source seed is not proof that corresponding records exist in the deployed ERIR repository.' },
    applicabilityState:'UNRESOLVED—QUALIFIED REVIEW REQUIRED',
    contribution:'Preserves stable source identifiers, source type, status, URL, and unresolved applicability for accountable review.',
    limit:'Source presence or repository return does not establish applicability, obligation, legal sufficiency, compliance, or control effectiveness.',
  };

  const facem = {
    layer:'FACEM',
    artifactId:'FACEM-MTG-001',
    status:'BOUNDARIES RESOLVED; HUMAN DISPOSITION PENDING',
    states:{
      access:'PERMITTED—CONTROLLED SYNTHETIC CASE ONLY',
      evidence:incompleteEvidence?'INCOMPLETE':'COMPLETE FOR CONTROLLED COMPARISON',
      recommendation:'REVIEW QUESTIONS AND COMPARISON ROUTE ONLY',
      authority:'NONE—NO CREDIT OR ACTION AUTHORITY',
      accountability:'RETAINED BY QUALIFIED BANK PERSONNEL',
      acceptance:'NOT RECORDED',
      commitment:'NONE',
    },
    contribution:'Prevents access, evidence, an analytic output, or a review route from becoming authority, acceptance, accountability transfer, or organizational commitment.',
    limit:'No machine output, technical connection, source return, or workbook import may become a credit decision or bank commitment.',
  };

  const bacrm = {
    layer:'BACRM',
    artifactId:'BACRM-MTG-001',
    capabilityId:assessment.capability.id,
    reviewedConfigurationId:assessment.capability.reviewedConfigurationId,
    currentConfigurationId:assessment.capability.currentConfigurationId,
    configurationMatch:assessment.capability.configurationMatch,
    status:capabilitySuspended?'SUSPENDED—CONFIGURATION REASSESSMENT REQUIRED':assessment.aiActionState,
    permittedPurposes:assessment.capability.permittedPurposes,
    prohibitedActions:assessment.capability.prohibitedActions,
    manualFallback:'Qualified personnel reproduce the evidence checklist, deterministic calculations, fictional policy comparison, review questions, and disposition process without AI.',
    suspensionTriggers:['Reviewed/current configuration mismatch','Loss of manual fallback','Prohibited data or purpose','Attempted consequential action','Material trace or evidence-control failure'],
    recovery:'No automatic reactivation. Qualified review must verify the exact capability, version, configuration, data, purpose, controls, fallback, and recovery evidence before reauthorization.',
    contribution:'Binds the advisory capability to one reviewed configuration and operating context with abstention, logging, fallback, suspension, and controlled recovery.',
    limit:'Configuration approval is not permanent product approval and does not create credit or action authority.',
  };

  const humanDisposition = {
    disposition_id:'DISP-MTG-001',
    application_id:applicationId,
    output_artifact:outputArtifactId,
    human_disposition:'PENDING QUALIFIED HUMAN DISPOSITION',
    rationale:incompleteEvidence?'Required evidence remains unresolved; analytic comparisons cannot be converted into a credit decision.':'The controlled comparison is complete, but an authorized person has not recorded a disposition.',
    actor:null,
    authority_evidence:null,
    effective_time:null,
    prior_state:'CONTROLLED CASE EXECUTED',
    successor_state:capabilitySuspended?'CAPABILITY SUSPENDED—REASSESSMENT REQUIRED':incompleteEvidence?'AWAITING EVIDENCE AND REVIEW':'AWAITING QUALIFIED HUMAN DISPOSITION',
  };

  const manualPath = [
    { id:'MAN-MTG-001', step:'Verify permitted synthetic inputs and source provenance.', owner:'Qualified bank reviewer' },
    { id:'MAN-MTG-002', step:'Reproduce DTI, LTV, reserve, and sensitivity calculations.', owner:'Qualified bank reviewer' },
    { id:'MAN-MTG-003', step:'Review evidence completeness and fictional policy comparisons.', owner:'Qualified bank reviewer' },
    { id:'MAN-MTG-004', step:'Resolve applicable legal, policy, and authority questions using controlled sources.', owner:'Authorized bank functions' },
    { id:'MAN-MTG-005', step:'Record any disposition, rationale, actor, authority evidence, effective time, and state transition outside MERCA.', owner:'Authorized bank decision authority' },
  ];

  const stages = [
    { order:1, layer:'ROI-EA', input:`${fixture.sourceArtifact} / ${fixture.sourceSha256}`, output:roiEa.artifactId, state:roiEa.status, boundary:roiEa.limit },
    { order:2, layer:'ERIR', input:`${sourceIds.length} controlled source candidates`, output:erir.artifactId, state:erir.status, boundary:erir.limit },
    { order:3, layer:'FACEM', input:`${roiEa.artifactId} + ${erir.artifactId}`, output:facem.artifactId, state:facem.status, boundary:facem.limit },
    { order:4, layer:'BACRM', input:`${facem.artifactId} + ${assessment.capability.reviewedConfigurationId}`, output:bacrm.artifactId, state:bacrm.status, boundary:bacrm.limit },
  ];

  return {
    valid:true,
    executionId:'EXEC-MTG-001',
    applicationId,
    outputArtifactId,
    sourceArtifact:fixture.sourceArtifact,
    sourceSha256:fixture.sourceSha256,
    synthetic:fixture.synthetic === true,
    protectedDataState:'EXCLUDED FROM EXECUTION',
    roiEa, erir, facem, bacrm, stages, manualPath, humanDisposition,
    economics:{
      federationIncrement_C2_minus_C1:notQuantified('No member-specific baseline, shared-capability cost, participation, or measured operating evidence was supplied.'),
      boundedAiIncrement_C3_minus_C2:notQuantified('No measured AI effectiveness, cost, error, capacity, or control-performance evidence was supplied.'),
    },
    finalState,
    decisionState:'NOT MADE',
    fairnessClaim:'NOT ESTABLISHED',
    complianceClaim:'NOT ESTABLISHED',
  };
}

export function recordMortgageErirVerification(execution, response={}) {
  if (!execution?.valid) return execution;
  const expected = execution.erir.sourceIds;
  const returnedIds = [...new Set((response.records || []).map(record => record.id).filter(id => expected.includes(id)))];
  const explicitMissing = (response.missing_ids || []).filter(id => expected.includes(id));
  const missingIds = [...new Set([...explicitMissing, ...expected.filter(id => !returnedIds.includes(id))])];
  const state = returnedIds.length === expected.length ? 'ALL SOURCE IDS RETURNED' : returnedIds.length ? 'PARTIAL SOURCE IDS RETURNED' : 'NO SOURCE IDS RETURNED';
  return {
    ...execution,
    erir:{
      ...execution.erir,
      status:`${state}—APPLICABILITY STILL UNRESOLVED`,
      repositoryVerification:{ state, returnedIds, missingIds, message:'Repository return verifies record retrieval only; it does not establish applicability, obligation, compliance, or control effectiveness.' },
    },
    stages:execution.stages.map(stage => stage.layer === 'ERIR' ? {...stage,state:`${state}—APPLICABILITY STILL UNRESOLVED`} : stage),
  };
}

export function recordMortgageErirUnavailable(execution, message='Read-only ERIR service unavailable.') {
  if (!execution?.valid) return execution;
  const status='ERIR SERVICE UNAVAILABLE—CONTROLLED SOURCE SEED REMAINS UNVERIFIED';
  return {
    ...execution,
    erir:{...execution.erir,status,repositoryVerification:{state:'UNAVAILABLE',returnedIds:[],missingIds:execution.erir.sourceIds,message}},
    stages:execution.stages.map(stage => stage.layer === 'ERIR' ? {...stage,state:status} : stage),
  };
}
