import { CIF_BINDING, relationshipFindings } from './roi-ea-cif-registry.mjs';
import {
  buildDependencyGraph, analyzeDependencyGraph, normalizeDependencyMitigation,
  normalizeDependencyFindingReview
} from './dependency-graph-model.mjs';

const text=v=>String(v??'').trim();
const isoDate=v=>text(v).slice(0,10);

function nodeFamily(node={}) {
  switch(node.nodeType){
    case 'person': return {family:'OF-01',subtype:'HUMAN_PERSON',confidence:'HIGH'};
    case 'role': return {family:'OF-01',subtype:'ROLE_OR_OFFICE',confidence:'HIGH'};
    case 'org-unit': return {family:'OF-01',subtype:'ORGANIZATION',confidence:'MODERATE'};
    case 'vendor': return {family:'OF-01',subtype:'ORGANIZATION',confidence:'LOW'};
    case 'activity': return {family:'OF-18',subtype:'ACTION',confidence:'MODERATE'};
    case 'application':
    case 'process':
    case 'external-service':
    case 'infrastructure': return {family:'OF-06',subtype:'CONTEXT_SYSTEM',confidence:'MODERATE'};
    case 'data':
    case 'resource': return {family:'OF-08',subtype:'RESOURCE',confidence:'MODERATE'};
    case 'authority': return {family:'OF-15',subtype:'AUTHORITY',confidence:'MODERATE'};
    case 'continuity-anchor': return {family:null,subtype:null,confidence:'UNRESOLVED'};
    case 'essential-action': return {family:'OF-18',subtype:'ACTION',confidence:'HIGH'};
    default: return {family:null,subtype:null,confidence:'UNRESOLVED'};
  }
}

export function dependencyGraphCifProjection(workspace={}, options={}) {
  const graph=buildDependencyGraph(workspace);
  const analysis=analyzeDependencyGraph(workspace,{minimumInbound:3,minimumDependencies:4,...(options.analysisOptions||{})});
  const nodes=graph.nodes.map(node=>({
    localId:node.id,label:node.label,nodeType:node.nodeType,provenance:node.provenance||[],
    cifCandidate:nodeFamily(node),
    note:'Candidate family mapping only; local graph identity remains authoritative for this workspace until a qualified human explicitly classifies and commits a CIF object.'
  }));

  const nodeMap=new Map(nodes.map(x=>[x.localId,x]));
  const dependencies=[];
  for(const edge of graph.edges.filter(e=>e.edgeType==='depends-on')){
    const source=nodeMap.get(edge.sourceId), target=nodeMap.get(edge.targetId);
    const objectId=`CIF-DEP-CAND-${edge.id}`;
    const relation={
      relationshipType:'DEPENDS_ON',
      sourceId:edge.sourceId,
      sourceFamily:source?.cifCandidate.family||'',
      sourceSubtype:source?.cifCandidate.subtype||'',
      targetId:edge.targetId,
      targetFamily:target?.cifCandidate.family||'',
      targetSubtype:target?.cifCandidate.subtype||'',
      representationMode:'OBJECT_REIFIED',
      basisRef:edge.evidenceRefs?.[0]||edge.sourceReference||'',
      scopeRef:edge.id,
      authoritativeRecordRef:objectId,
      authoritativeRecord:{id:objectId,family:'OF-09',sourceId:edge.sourceId,targetId:edge.targetId},
    };
    const findings=relationshipFindings(relation);
    dependencies.push({
      localEdgeId:edge.id,
      cifDependencyCandidate:{id:objectId,family:'OF-09',subtype:'DEPENDENCY',sourceId:edge.sourceId,targetId:edge.targetId,
        dimension:edge.dimension,criticality:edge.criticality,evidenceRefs:edge.evidenceRefs||[],sourceReference:edge.sourceReference||''},
      relationshipCandidate:relation,
      conformanceFindings:findings,
      conformanceState:findings.some(x=>x.status==='FAIL')?'FAIL':findings.some(x=>x.status==='INSUFFICIENT_EVIDENCE')?'INSUFFICIENT_EVIDENCE':'PASS',
    });
  }

  const continuityAnchors=(workspace.continuityAnchors||[]).map(a=>({
    localId:a.id,label:a.label,
    cifCandidateFamilies:['OF-02','OF-03'],
    classificationState:'HUMAN_CLASSIFICATION_REQUIRED',
    note:'Continuity Anchor is a local specialization. It may bind to Purpose, Outcome, or both; the tool does not choose automatically.'
  }));

  const essentialActions=(workspace.essentialActions||[]).map(a=>({
    localId:a.id,label:a.label,cifCandidate:{family:'OF-18',subtype:'ACTION'},
    anchorId:a.anchorId||'',evidenceRefs:a.evidenceRefs||[],
    note:'Action mapping is a candidate projection; essentiality and continuity semantics remain local specialization metadata.'
  }));

  const findings=(analysis.findingsSummary||[]).map(f=>({
    candidateId:f.candidateId,type:f.type,subjectId:f.subjectId,statement:f.statement,limitation:f.limitation,
    cifCandidate:{family:'OF-12',subtype:'CLAIM'},
    note:'Structural candidate remains an epistemic claim until reviewed; graph structure does not establish fact, risk, or recommendation.'
  }));

  const mitigations=(workspace.dependencyMitigations||[]).map(normalizeDependencyMitigation).map(m=>({
    localId:m.id,type:m.type,status:m.status,targetType:m.targetType,targetId:m.targetId,
    possibleCifFamilies:['OF-21','OF-18','OF-08'],
    classificationState:'HUMAN_CLASSIFICATION_REQUIRED',
    note:'A mitigation may be a Control, Action, Resource, or combination. Status alone does not establish control classification or effectiveness.'
  }));

  const lifecycle=(workspace.dependencyMitigationLifecycle||[]).map(x=>({
    localId:x.id,mitigationId:x.mitigationId,appliedAt:x.appliedAt,appliedBy:x.appliedBy,
    beforeSnapshotId:x.beforeSnapshotId,afterSnapshotId:x.afterSnapshotId,transition:x.transition,
    cifCandidate:{family:'OF-22',subtype:'LIFECYCLE_OBJECT'},
    note:'Lifecycle projection records a structural transition. It does not establish causal improvement or realized outcome.'
  }));

  return {
    profile:'AIHS-DEPENDENCY-CIF-HANDOFF-V0.1',
    cifFrameworkVersion:CIF_BINDING.framework_version,
    cifExternalValidationStatus:CIF_BINDING.external_validation_status,
    generatedAt:options.generatedAt||new Date().toISOString(),
    localAuthorityBoundary:'Projection only. No CIF canonical object, Decision, Authority, Acceptance, Control effectiveness, or Outcome is created by this handoff.',
    continuityAnchors,essentialActions,nodes,dependencies,findings,mitigations,lifecycle,
    summary:{
      nodes:nodes.length,dependencyCandidates:dependencies.length,
      dependencyPass:dependencies.filter(x=>x.conformanceState==='PASS').length,
      dependencyInsufficient:dependencies.filter(x=>x.conformanceState==='INSUFFICIENT_EVIDENCE').length,
      dependencyFail:dependencies.filter(x=>x.conformanceState==='FAIL').length,
      unresolvedNodeMappings:nodes.filter(x=>!x.cifCandidate.family).length,
      findingCandidates:findings.length,mitigations:mitigations.length,lifecycleTransitions:lifecycle.length,
    }
  };
}

export function dependencyAnalysisEngagementEvidence(workspace={}, options={}) {
  const projection=dependencyGraphCifProjection(workspace,options);
  const analysis=analyzeDependencyGraph(workspace,{minimumInbound:3,minimumDependencies:4});
  const reviewer=text(options.reviewer);
  const observedAt=options.observedAt||new Date().toISOString();
  const acceptedReviews=(workspace.dependencyFindingReviews||[]).map(normalizeDependencyFindingReview)
    .filter(x=>['Accept','Revise'].includes(x.disposition));
  return {
    evidence_id:'',
    title:'Dependency graph analysis and CIF alignment handoff',
    evidence_type:'System or architecture document',
    classification:'Consultant inference',
    review_state:'Reviewed with limitation',
    source_reference:`${projection.profile}; generated ${projection.generatedAt}`,
    received_or_observed_date:isoDate(observedAt),
    reviewer,
    relevance:[
      `${projection.summary.dependencyCandidates} CIF dependency relationship candidates`,
      `${analysis.constrainingDependencyCandidates.length} candidate constraining dependencies`,
      `${analysis.concentrationCandidates.length} concentration candidates`,
      `${analysis.fragmentationCandidates.length} fragmentation candidates`,
      `${projection.summary.mitigations} mitigation records`,
      `${projection.summary.lifecycleTransitions} mitigation lifecycle transitions`,
      `${acceptedReviews.length} accepted/revised dependency findings`,
    ].join('; '),
    limitation_or_gap:'Graph-derived structures and CIF mappings are qualified analytical projections. They do not establish operating truth, legal applicability, authority, implementation, control effectiveness, causal improvement, realized risk reduction, or business outcome.',
    linked_discovery_references:'current_operating_model.dependencies; current_operating_model.major_systems',
    recorded_at:observedAt,
  };
}
