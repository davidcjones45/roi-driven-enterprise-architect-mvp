// PUBLIC INFORMATION ONLY. NOT A CATERPILLAR INTERNAL MODEL OR CLIENT DIAGNOSIS.
// NOT A VENDOR RECOMMENDATION, FINANCIAL OR OPERATIONAL ASSURANCE, OR CONFIDENTIAL CLIENT DATA.
import { evaluateESA } from './enterprise-scalability-model.mjs';

const source = (id, sourceClass, title, url, statement) => ({ id, sourceClass, title, url, statement });

export const CAT_TEKS_ESA_001 = {
  caseId: 'CAT-TEKS-ESA-001',
  assessmentId: 'CAT-TEKS-ESA-001',
  organization: 'Caterpillar Inc.',
  primaryDecisionQuestion: 'How should planning capabilities, authority, evidence, transition states, and legacy-system retirement be governed while Caterpillar moves from an incumbent supply/capacity-planning environment toward a successor during a period of material demand and capacity pressure?',
  evidenceSources: [
    source('CAT-SRC-TEKS-001', 'TEKSYSTEMS_POSTING', 'Product Owner planning-platform opportunity', '', 'Unnamed client; supply and capacity planning, incumbent support, two shortlisted vendors, and transition continuity are reported. Client identity and platforms are unconfirmed.'),
    source('CAT-SRC-OFFICIAL-001', 'CATERPILLAR_OFFICIAL', 'Senior Digital Product Owner — S&OP Order Planning', 'https://careers.caterpillar.com/hu/allasok/r0000376553/senior-digital-product-owner-sop-order-planning/', 'Caterpillar Strategic Procurement & Planning Division role describes enterprise S&OP and Dealer Order Planning digital products, including demand planning, supply planning, and inventory optimization.'),
    source('CAT-SRC-SEC-001', 'CATERPILLAR_SEC', 'Caterpillar 2025 Form 10-K', 'https://www.sec.gov/Archives/edgar/data/18230/000130817926000360/cat015318-ars.pdf', 'Firm backlog was approximately $30.0B at December 31, 2024 and $51.2B at December 31, 2025; Power & Energy had the largest increase. The filing also describes Caterpillar’s worldwide dealer network.'),
    source('CAT-SRC-OFFICIAL-002', 'CATERPILLAR_OFFICIAL', 'Senior Manager Supply Chain', 'https://careers.caterpillar.com/ja/%E3%82%B8%E3%83%A7%E3%83%96%E3%82%BA/r0000386552/senior-manager-supply-chain/', 'Public hiring describes S&OP transformation, planning performance, inventory planning, production alignment, customer availability, and cross-functional planning work.'),
    source('CAT-SRC-INDUSTRY-001', 'INDUSTRY_CORROBORATION', 'Reported Q2 2026 Caterpillar results', '', 'Industry/news reporting supplied for this case reports backlog of approximately $72.1B after Q2 2026; this is corroborative, not causal evidence for a platform transition.'),
    source('CAT-SRC-INF-001', 'ANALYST_INFERENCE', 'Client identity inference', '', 'Chillicothe/Mossville geography and public Caterpillar planning hiring support VERY_HIGH_CONFIDENCE_INFERENCE, not confirmation, that the TEKsystems requisition concerns Caterpillar.'),
  ],
  facts: [
    { id: 'CAT-FACT-001', sourceId: 'CAT-SRC-INF-001', sourceClass: 'ANALYST_INFERENCE', value: 'VERY_HIGH_CONFIDENCE_INFERENCE', statement: 'TEKsystems client identity is inferred as Caterpillar, not confirmed.' },
    { id: 'CAT-FACT-002', sourceId: 'CAT-SRC-TEKS-001', sourceClass: 'TEKSYSTEMS_POSTING', value: 'TEKSYSTEMS_POSTING_UNCONFIRMED_BY_CLIENT', statement: 'Incumbent may be o9 or Coupa; no actual platform is selected or inferred.' },
    { id: 'CAT-FACT-003', sourceId: 'CAT-SRC-OFFICIAL-001', sourceClass: 'CATERPILLAR_OFFICIAL', value: 'ENTERPRISE_PLANNING_IS_AN_ACTIVE_INVESTMENT_AREA', statement: 'Public hiring supports an active planning investment area, not a confirmed common program.' },
    { id: 'CAT-FACT-004', sourceId: 'CAT-SRC-SEC-001', sourceClass: 'CATERPILLAR_SEC', value: 'PLATFORM_TRANSITION_AND_HIGH_DEMAND_PRESSURE_ARE_CONTEMPORANEOUS', statement: 'Backlog observations do not establish that demand pressure caused a platform transition.' },
  ],
  unknowns: ['confirmed TEKsystems client identity', 'incumbent platform', 'successor vendor', 'second candidate vendor', 'detailed architecture', 'integrations', 'planning data model', 'system-of-record rules', 'authoritative-source assignments', 'program schedule', 'user groups', 'actual performance', 'planning-cycle duration', 'defects/rework', 'current pain points', 'internal business case', 'program costs', 'expected benefits', 'authority assignments', 'supplier/dealer data-sharing terms', 'actual AI use', 'migration sequence', 'legacy-retirement criteria'],
  transitionStates: ['LEGACY_AUTHORITATIVE', 'PARALLEL_VALIDATION', 'SUCCESSOR_CANDIDATE', 'SUCCESSOR_READY_FOR_RELEASE_DECISION', 'SUCCESSOR_AUTHORITATIVE', 'LEGACY_RETIREMENT_CANDIDATE', 'LEGACY_RETIRED'],
  transitionInvariants: ['READY_FOR_RELEASE_DECISION != RELEASED_OR_AUTHORITATIVE', 'SUCCESSOR_AUTHORITATIVE != LEGACY_RETIRED'],
  candidateCapabilities: [
    ['CAT-CAP-01', 'Demand Planning', 'HETEROGENEOUS_OR_CONDITIONAL', 'HIGH', 'RETAIN_SEGMENT_OR_LOCAL_CONTEXT'],
    ['CAT-CAP-02', 'Dealer Order Planning', 'HETEROGENEOUS_OR_CONDITIONAL', 'HIGH', 'EXTERNAL_DEALER_AUTHORITY_REMAINS_EXTERNAL'],
    ['CAT-CAP-03', 'Supply Planning', 'LOWER_SCALE_PRESSURE', 'MEDIUM', 'CONDITIONAL_SHARED_SCALE_LOGIC'],
    ['CAT-CAP-04', 'Capacity Planning', 'HETEROGENEOUS_OR_CONDITIONAL', 'HIGH', 'RETAIN_FACILITY_AND_SEGMENT_CONTEXT'],
    ['CAT-CAP-05', 'Enterprise S&OP', 'ECONOMIES_OF_SCALE', 'LOW', 'CONDITIONAL_ENTERPRISE_STANDARDIZATION'],
    ['CAT-CAP-06', 'Inventory Planning / Optimization', 'HETEROGENEOUS_OR_CONDITIONAL', 'MEDIUM', 'HETEROGENEOUS_SCALE_REQUIREMENTS'],
    ['CAT-CAP-07', 'Supplier Planning Signals', 'HETEROGENEOUS_OR_CONDITIONAL', 'HIGH', 'EXTERNAL_SUPPLIER_COMMITMENT_REMAINS_EXTERNAL'],
    ['CAT-CAP-08', 'Constraint Management', 'HETEROGENEOUS_OR_CONDITIONAL', 'HIGH', 'RETAIN_OPERATIONAL_CONTEXT'],
    ['CAT-CAP-09', 'Scenario Analysis', 'ECONOMIES_OF_SCALE', 'LOW', 'CONDITIONAL_SHARED_SCALE_LOGIC'],
    ['CAT-CAP-10', 'Planning Exception Management', 'HETEROGENEOUS_OR_CONDITIONAL', 'HIGH', 'RETAIN_OPERATIONAL_CONTEXT'],
    ['CAT-CAP-11', 'Planning Analytics', 'ECONOMIES_OF_SCALE', 'MEDIUM', 'CONDITIONAL_SHARED_SCALE_LOGIC'],
    ['CAT-CAP-12', 'Planning Workflow / Orchestration', 'HETEROGENEOUS_OR_CONDITIONAL', 'MEDIUM', 'HETEROGENEOUS_SCALE_REQUIREMENTS'],
    ['CAT-CAP-13', 'Planning Data Integration', 'ECONOMIES_OF_SCALE', 'MEDIUM', 'CONDITIONAL_SHARED_SCALE_LOGIC'],
    ['CAT-CAP-14', 'Financial / Business Impact Analysis', 'INSUFFICIENT_EVIDENCE', 'MEDIUM', 'UNDETERMINED'],
  ],
  alternativeComparisons: [
    ['ALT-CAT-01', 'Current-State Support / Controlled Delay', 'Maintain current environment while improving support and transition preparation.', 'continuity readiness', 'continuing legacy exposure'],
    ['ALT-CAT-02', 'Coordinated Platform Migration', 'Maintain incumbent during build and move substantially as one coordinated successor release.', 'clearer system boundary', 'concentrated cutover risk'],
    ['ALT-CAT-03', 'Capability-Phased Migration', 'Migrate capabilities when capability-specific evidence is sufficient.', 'staged and reversible transition', 'dual-system and source-authority complexity'],
    ['ALT-CAT-04', 'Platform Transition Plus Planning Operating-Model Redesign', 'Reconsider planning authority, standardization, scale, and governance while transitioning technology.', 'possible structural/process improvement', 'technology and operating-model risks are coupled'],
  ],
  candidateValueMeasures: ['planning-cycle time', 'reconciliation failures', 'exception-resolution time', 'manual intervention', 'planner adoption', 'forecast usefulness', 'capacity-plan usefulness', 'supplier response', 'inventory implications', 'backlog/service effects', 'platform operating cost', 'transition incidents', 'legacy retirement', 'decision latency'],
  discoveryQuestions: [
    'Which planning capabilities are authoritative in the incumbent today, and which are proposed for the successor at each transition state?',
    'What evidence and accountable owner are required to authorize successor release and, separately, legacy retirement?',
    'What unresolved integration, reconciliation, capacity/constraint, and exception-path differences prevent a capability-specific transition decision?',
    'Which dealers, suppliers, and logistics interfaces exchange planning signals, and what authority or data-sharing terms govern each interface?',
    'What baseline measures and decision criteria would distinguish controlled delay, coordinated migration, capability-phased migration, or broader operating-model redesign?'
  ],
};

export function executeCaterpillarESA(caseFile = CAT_TEKS_ESA_001) {
  const workspace = {
    assessmentId: caseFile.assessmentId,
    functionalBoundary: {
      assessmentId: caseFile.assessmentId,
      name: 'Caterpillar public-information planning functional system',
      formalOrganizationIds: ['CATERPILLAR_INC', 'CATERPILLAR_ENTERPRISE_PLANNING', 'CATERPILLAR_BUSINESS_SEGMENTS', 'CATERPILLAR_MANUFACTURING', 'CATERPILLAR_PROCUREMENT_SUPPLY_CHAIN'],
      functionalSystemIds: ['CATERPILLAR_INC', 'CATERPILLAR_ENTERPRISE_PLANNING', 'CATERPILLAR_BUSINESS_SEGMENTS', 'CATERPILLAR_MANUFACTURING', 'CATERPILLAR_PROCUREMENT_SUPPLY_CHAIN', 'INDEPENDENT_DEALERS', 'SUPPLIERS', 'LOGISTICS_SERVICE_DEPENDENCIES'],
      relevantParticipantIds: ['CATERPILLAR_ENTERPRISE_PLANNING', 'CATERPILLAR_BUSINESS_SEGMENTS', 'CATERPILLAR_MANUFACTURING', 'CATERPILLAR_PROCUREMENT_SUPPLY_CHAIN'],
      externalDependencyIds: ['INDEPENDENT_DEALERS', 'SUPPLIERS', 'LOGISTICS_SERVICE_DEPENDENCIES'],
      evidenceIds: ['CAT-SRC-OFFICIAL-001', 'CAT-SRC-SEC-001'],
      boundaryMismatch: true,
      unresolvedConditions: ['dealer authority not established', 'supplier commitment authority not established', 'logistics authority not established']
    },
    capabilityScaleBoundaries: caseFile.candidateCapabilities.map(([capabilityId, name, pressure, localityRequirement, conclusion]) => ({
      assessmentId: caseFile.assessmentId, capabilityId, alternativeId: 'CAT-TRANSITION', observedScalePressure: pressure,
      localityRequirement, mechanism: name, evidenceIds: ['CAT-SRC-OFFICIAL-001'],
      unresolvedConditions: ['ANALYST_CANDIDATE_DECOMPOSITION', 'internal capability taxonomy unknown'], analyticalConclusion: conclusion
    })),
    alternatives: caseFile.alternativeComparisons.map(([id, name, principalCondition, _potentialStrength, principalRisk]) => ({
      id, name, evidenceStatus: 'UNDETERMINED', comparisonStatus: 'COMPARISON_UNDETERMINED',
      comparisonEvidenceIds: [], comparisonRationale: '', unresolvedEvidence: caseFile.unknowns,
      principalCondition, principalRisk
    }))
  };
  const result = evaluateESA(workspace);
  return { ...result, caseId: caseFile.caseId, clientIdentityStatus: 'VERY_HIGH_CONFIDENCE_INFERENCE',
    capabilityDecompositionStatus: 'ANALYST_CANDIDATE_DECOMPOSITION', transitionStates: caseFile.transitionStates,
    transitionInvariants: caseFile.transitionInvariants, candidateValueMeasureStatus: 'CANDIDATE_VALUE_MEASURE',
    alternativeComparisonContext: caseFile.alternativeComparisons.map(([id]) => ({ id, comparedAgainstAlternativeIds: [], comparisonDimensions: [], unresolvedComparisonDimensions: ['capability continuity', 'transition reversibility', 'source-authority clarity', 'integration complexity', 'operational disruption', 'external dependency handling', 'scalability', 'governance burden', 'evidence sufficiency', 'economics/value', 'implementation risk'], reviewerRole: '', comparisonStatus: 'COMPARISON_UNDETERMINED' })),
    createsAIRecommendation: false, preferredNextMove: 'EVIDENCE_ACQUISITION_AND_ACCOUNTABLE_TRANSITION_GOVERNANCE_DISCOVERY', discoveryQuestions: caseFile.discoveryQuestions };
}
