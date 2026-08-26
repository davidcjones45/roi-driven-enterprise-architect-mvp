import { normalizeWorkspace } from './feoa-workspace.mjs';

export const FCB_NS_001 = 'FCB-NS-001';

const participant = (id, name) => ({
  id, name, participantType: 'Independent community bank',
  status: 'Candidate participant / unresolved',
  valueProposition: 'Potential recipient and contributor for a later controlled assessment.',
  indispensable: false,
});

const form = (id, name, description, criterionIds) => ({
  id, assessmentId: FCB_NS_001, formType: name, name,
  operatingDescription: description,
  ownershipControlModel: 'Unresolved; no operating form selected.',
  coordinationMechanism: 'Unresolved', memberAutonomy: 'Retained pending later review.',
  enforcementMechanism: 'Unresolved', integrationBurden: 'Not assessed', reversibility: 'Not assessed',
  criterionIds, evidenceIds: [], status: 'Candidate / unresolved',
});

const criterion = (id, name, definition) => ({
  id, assessmentId: FCB_NS_001, name, definition, weight: '', critical: false,
  minimumAcceptableRating: '', ownerId: '', evidenceIds: [], status: 'Unresolved',
});

export function communityBankingFixture() {
  const criteria = [
    ['FCB-CRIT-01', 'Economic efficiency', 'Whether qualified future evidence supports an efficient use of resources.'],
    ['FCB-CRIT-02', 'Required-member viability', 'Whether each later-required participant can remain viable under a proposed form.'],
    ['FCB-CRIT-03', 'Authority clarity', 'Whether decisions, limits, and escalation remain explicit.'],
    ['FCB-CRIT-04', 'Accountability preservation', 'Whether each bank retains its accountable responsibilities.'],
    ['FCB-CRIT-05', 'Regulatory / third-party feasibility', 'Whether qualified review can assess applicable regulatory and third-party conditions.'],
    ['FCB-CRIT-06', 'Integration burden', 'Whether technical and operating integration requirements are proportionate and evidenced.'],
    ['FCB-CRIT-07', 'Governance burden', 'Whether proposed shared governance is justified and sustainable.'],
    ['FCB-CRIT-08', 'Provider concentration / dependency', 'Whether reliance on providers and dependencies remains visible and governable.'],
    ['FCB-CRIT-09', 'Resilience', 'Whether the work retains a safe degraded or manual path.'],
    ['FCB-CRIT-10', 'Exit / reversibility', 'Whether withdrawal, substitution, and exit can be assessed before commitment.'],
    ['FCB-CRIT-11', 'Institutional independence', 'Whether each participating bank preserves independent authority and accountability.'],
    ['FCB-CRIT-12', 'Time to usable capability', 'Whether a proposed path can reach a usable, reviewable capability in an evidenced timeframe.'],
  ].map(([id, name, definition]) => criterion(id, name, definition));
  const criterionIds = criteria.map(item => item.id);

  return normalizeWorkspace({
    fixtureMetadata: {
      id: FCB_NS_001,
      name: 'North Star Community Banking — Regulatory Intelligence and Compliance Operations',
      classification: 'Synthetic / illustrative fixture',
      boundary: 'This fixture represents no real bank, consortium, regulatory conclusion, operating arrangement, or implementation.',
    },
    assessment: {
      id: FCB_NS_001,
      name: 'North Star Community Banking — Regulatory Intelligence and Compliance Operations',
      currentPhase: '0 Qualify',
      decision: 'Determine whether any shared operating form is justified for selected regulatory-intelligence and compliance-support work, and if so which form should proceed to later evidence, economic, authority, and pilot review.',
      federationContext: { valueProposition: 'Potentially shared support for limited regulatory-intelligence and compliance operations; all conclusions remain unresolved.' },
      majorGapIds: ['FCB-GAP-ECONOMICS', 'FCB-GAP-AUTHORITY', 'FCB-GAP-APPLICABILITY', 'FCB-GAP-IMPLEMENTATION'],
      requiredNextAction: 'Obtain qualified evidence, economic, authority, regulatory-applicability, and pilot review before any operating-form decision.',
    },
    participants: [
      participant('PAR-RIVERBEND', 'Riverbend Community Bank'),
      participant('PAR-HERITAGE', 'Heritage Valley Bank'),
      participant('PAR-MAGNOLIA', 'Magnolia Community Bank'),
      participant('PAR-PRAIRIE', 'Prairie State Community Bank'),
      participant('PAR-SUMMIT', 'Summit Community Bank'),
    ],
    capabilities: [
      { id: 'CAP-SHARED-SOURCE', name: 'Shared source acquisition and normalization', scope: 'Potential shared support only', status: 'Illustrative / unresolved' },
      { id: 'CAP-BANK-LOCAL-REVIEW', name: 'Bank-local applicability and control review', scope: 'Reserved to each bank', status: 'Illustrative / unresolved' },
    ],
    valueStreams: [{ id: 'VS-REG-INTEL-001', name: 'Regulatory intelligence and compliance-support flow', status: 'Illustrative / unresolved' }],
    processSteps: [
      { id: 'PS-01-SOURCE-PUBLISHED', name: 'Regulatory source published', valueStreamId: 'VS-REG-INTEL-001', ownerParticipantId: 'External source', scope: 'Source event; not a regulatory conclusion.' },
      { id: 'PS-02-SOURCE-ACQUISITION', name: 'Shared source acquisition', valueStreamId: 'VS-REG-INTEL-001', ownerParticipantId: 'Potential shared capability', actionIds: ['ACT-SOURCE-ACQUIRE'] },
      { id: 'PS-03-NORMALIZATION', name: 'Source normalization', valueStreamId: 'VS-REG-INTEL-001', ownerParticipantId: 'Potential shared capability', actionIds: ['ACT-NORMALIZE'] },
      { id: 'PS-04-RELEVANCE-CANDIDATE', name: 'Change or relevance candidate identified', valueStreamId: 'VS-REG-INTEL-001', ownerParticipantId: 'Potential shared capability', actionIds: ['ACT-RELEVANCE-FLAG'] },
      { id: 'PS-05-MEMBER-RECEIPT', name: 'Member receives candidate', valueStreamId: 'VS-REG-INTEL-001', ownerParticipantId: 'Receiving bank', scope: 'Transmission is not receipt, validation, or acceptance.' },
      { id: 'PS-06-APPLICABILITY', name: 'Bank-local applicability review', valueStreamId: 'VS-REG-INTEL-001', ownerParticipantId: 'Receiving bank', actionIds: ['ACT-APP-RIVERBEND', 'ACT-APP-HERITAGE', 'ACT-APP-MAGNOLIA', 'ACT-APP-PRAIRIE', 'ACT-APP-SUMMIT'] },
      { id: 'PS-07-CONTROL-IMPACT', name: 'Control-impact review', valueStreamId: 'VS-REG-INTEL-001', ownerParticipantId: 'Receiving bank', scope: 'No control approval or change is represented.' },
      { id: 'PS-08-EVIDENCE-ACTION', name: 'Evidence action', valueStreamId: 'VS-REG-INTEL-001', ownerParticipantId: 'Receiving bank', scope: 'Evidence is not authority.' },
      { id: 'PS-09-DISPOSITION', name: 'Accountable bank disposition', valueStreamId: 'VS-REG-INTEL-001', ownerParticipantId: 'Receiving bank', scope: 'No accountable disposition has been recorded.' },
    ],
    handoffs: [
      { id: 'HOF-RELEVANCE-TO-BANK', name: 'Candidate relevance transmission to a bank', communicationState: 'Sent', responsibilityState: 'Not Offered', authorityState: 'Not Applicable', transmissionEventId: 'TX-RELEVANCE-001', receiptEventId: '', validationEventId: '', acceptanceEventId: '', acceptingAuthorityId: '', provenanceIds: ['EVD-SHARED-SOURCE-001'], scope: 'Illustrative transmission only; receipt, validation, and acceptance remain unresolved.' },
    ],
    actions: [
      { id: 'ACT-SOURCE-ACQUIRE', name: 'Acquire published source candidate', performer: 'Potential shared capability', decisionAuthority: '', accountableOrganization: '', residualAccountableOrganization: '', aiEligibility: 'Not assessed', authorityEnvelopeId: '', evidenceRequirementIds: ['EVD-SHARED-SOURCE-001'] },
      { id: 'ACT-NORMALIZE', name: 'Normalize source and preserve provenance', performer: 'Potential shared capability', decisionAuthority: '', accountableOrganization: '', residualAccountableOrganization: '', aiEligibility: 'Not assessed', authorityEnvelopeId: '', evidenceRequirementIds: ['EVD-SHARED-SOURCE-001'] },
      { id: 'ACT-RELEVANCE-FLAG', name: 'Flag preliminary relevance candidate', performer: 'Potential shared capability', decisionAuthority: '', accountableOrganization: '', residualAccountableOrganization: '', aiEligibility: 'Not assessed', authorityEnvelopeId: '', evidenceRequirementIds: ['EVD-SHARED-SOURCE-001'], scope: 'Advisory and nonbinding; relevance is not applicability or authority.' },
      ...['RIVERBEND', 'HERITAGE', 'MAGNOLIA', 'PRAIRIE', 'SUMMIT'].map(bank => ({ id: `ACT-APP-${bank}`, name: `Bank-local applicability review — ${bank}`, performer: `PAR-${bank}`, decisionAuthority: '', accountableOrganization: `PAR-${bank}`, residualAccountableOrganization: `PAR-${bank}`, aiEligibility: 'Not assessed', authorityEnvelopeId: '', evidenceRequirementIds: ['EVD-SHARED-SOURCE-001'], scope: 'Placeholder only; no applicability conclusion or authority is recorded.' })),
    ],
    constraints: [
      { id: 'CON-LOCAL-ACCOUNTABILITY', name: 'Bank-local accountability and authority remain reserved', status: 'Unresolved / illustrative' },
      { id: 'CON-NO-BASELINE-POOLING', name: 'No baseline customer-data pooling is represented', status: 'Unresolved / illustrative' },
    ],
    evidence: [{ id: 'EVD-SHARED-SOURCE-001', name: 'Illustrative shared regulatory source evidence artifact', classification: 'Illustrative', source: 'Synthetic fixture', status: 'Unresolved', limitation: 'Does not establish applicability, authority, compliance, or a regulatory conclusion.' }],
    formAlternatives: [
      form('FCB-FORM-00', 'Independent internal operation', 'Each bank operates the selected work internally.', criterionIds),
      form('FCB-FORM-01', 'Commercial provider / managed service', 'A commercial provider or managed service could support selected work.', criterionIds),
      form('FCB-FORM-02', 'Correspondent or bankers’ bank service', 'A correspondent or bankers’ bank service could support selected work.', criterionIds),
      form('FCB-FORM-03', 'Association-sponsored shared capability', 'An association-sponsored shared capability could support selected work.', criterionIds),
      form('FCB-FORM-04', 'Bank Service Company / jointly owned service entity', 'A service company or jointly owned entity could support selected work.', criterionIds),
      form('FCB-FORM-05', 'Governed network', 'A governed network could coordinate limited shared support.', criterionIds),
      form('FCB-FORM-06', 'Governed federation', 'A governed federation could coordinate limited shared support.', criterionIds),
      form('FCB-FORM-07', 'Common ownership / acquisition', 'Common ownership or acquisition could be considered as a comparator.', criterionIds),
    ],
    decisionCriteria: criteria,
    governedDependencies: [
      { id: 'DEP-ERIR-001', name: 'ERIR Regulatory Intelligence Service', providerParticipantId: 'DEP-ERIR-001', sponsorMemberId: '', dependencyType: 'Read-only regulatory intelligence', permittedUse: 'Retrieve reference information for qualified review.', prohibitedUse: 'Membership, authority, applicability, compliance, or decision-making.', status: 'Illustrative dependency / non-member' },
      { id: 'DEP-REG-ANALYSIS-001', name: 'Specialist Regulatory Analysis Provider', providerParticipantId: 'DEP-REG-ANALYSIS-001', sponsorMemberId: '', dependencyType: 'Specialist analysis', permittedUse: 'Potential qualified analysis support.', prohibitedUse: 'Member governance or bank-local accountable disposition.', status: 'Illustrative dependency / non-member' },
      { id: 'DEP-INTEGRATION-001', name: 'Shared Technology / Integration Provider', providerParticipantId: 'DEP-INTEGRATION-001', sponsorMemberId: '', dependencyType: 'Technology / integration', permittedUse: 'Potential technical support.', prohibitedUse: 'Member status, authority, or acceptance of work.', status: 'Illustrative dependency / non-member' },
      { id: 'DEP-SECURITY-001', name: 'Security / Monitoring Provider', providerParticipantId: 'DEP-SECURITY-001', sponsorMemberId: '', dependencyType: 'Security / monitoring', permittedUse: 'Potential security and monitoring support.', prohibitedUse: 'Member status, authority, or bank-local disposition.', status: 'Illustrative dependency / non-member' },
    ],
    membershipEvents: [],
    reviews: ['RIVERBEND', 'HERITAGE', 'MAGNOLIA', 'PRAIRIE', 'SUMMIT'].map(bank => ({ id: `REV-${bank}-SOURCE-001`, reviewType: 'Bank-local source review', question: 'Does this illustrative source artifact require qualified bank-local applicability review?', scopeObjectIds: ['EVD-SHARED-SOURCE-001'], requiredEvidenceIds: ['EVD-SHARED-SOURCE-001'], reviewerId: `PAR-${bank}`, reviewerQualification: 'Unresolved', finding: 'No conclusion recorded.', conditions: 'Illustrative / unresolved; no divergent conclusion represented.', status: 'Unresolved' })),
    lifecycleEvents: [],
    reassessmentTriggers: [{ id: 'RST-FCB-001', name: 'Material source, authority, evidence, or dependency change', status: 'Illustrative / non-mutating' }],
    formDecisions: [], alternativeRatings: [], counterfactuals: [], economicFlows: [], participantEconomicCases: [], riskAdjustments: [], aiCapabilities: [], aiCases: [], aiReleaseDecisions: [],
  }, {});
}
