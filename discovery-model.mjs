export const DISCOVERY_STATES = Object.freeze([
  'Verified fact', 'Client assertion', 'Consultant inference', 'Assumption', 'Estimate', 'Unknown'
]);

export const DISCOVERY_SECTIONS = Object.freeze([
  { id: 'business_problem', title: 'Business problem', fields: [
    ['problem_statement', 'Problem statement'], ['affected_population', 'Affected population'], ['pain_points', 'Current pain points'], ['frequency_volume', 'Frequency or volume'], ['annual_cost', 'Current annual cost'], ['service_performance', 'Current service or performance level'], ['do_nothing_consequence', 'Consequence of doing nothing'], ['strategic_objective', 'Strategic objective']
  ] },
  { id: 'proposed_initiative', title: 'Proposed initiative', fields: [
    ['ai_use_case', 'Proposed AI use case'], ['origin_sponsor', 'Origin or sponsor'], ['maturity', 'Current maturity'], ['model_vendor', 'Proposed model or vendor'], ['proposed_users', 'Proposed users'], ['intended_actions', 'Intended decisions or actions'], ['timeline', 'Planned timeline'], ['committed_budget', 'Committed budget if known']
  ] },
  { id: 'current_operating_model', title: 'Current operating model', fields: [
    ['current_workflow', 'Current workflow'], ['major_systems', 'Major systems'], ['major_data_sources', 'Major data sources'], ['process_owner', 'Process owner'], ['manual_activities', 'Key manual activities'], ['current_controls', 'Current controls'], ['dependencies', 'Known dependencies']
  ] },
  { id: 'ai_rationale', title: 'AI rationale', fields: [
    ['necessity_rationale', 'Why AI is believed necessary'], ['alternatives_considered', 'Alternatives already considered'], ['expected_benefits', 'Expected benefits'], ['assumptions', 'Assumptions'], ['claims_needing_evidence', 'Claims requiring evidence']
  ] },
  { id: 'governance', title: 'Governance', fields: [
    ['accountable_executive', 'Accountable executive'], ['process_owner', 'Process owner'], ['system_owner', 'System owner'], ['data_owner', 'Data owner'], ['risk_compliance_stakeholders', 'Risk or compliance stakeholders'], ['legal_stakeholder', 'Legal stakeholder if applicable'], ['decision_authority', 'Decision authority'], ['human_oversight', 'Proposed human oversight']
  ] },
  { id: 'evidence_readiness', title: 'Evidence readiness', fields: [
    ['business_case', 'Existing business case'], ['process_documentation', 'Process documentation'], ['architecture_documentation', 'Architecture documentation'], ['cost_data', 'Cost data'], ['regulatory_analysis', 'Regulatory analysis'], ['vendor_claims', 'Vendor claims'], ['pilot_test_results', 'Pilot or test results'], ['known_gaps', 'Known gaps']
  ] }
]);

export function emptyDiscovery() {
  return Object.fromEntries(DISCOVERY_SECTIONS.map(section => [section.id, Object.fromEntries(section.fields.map(([id]) => [id, { value: '', state: 'Unknown', source: '' }]))]));
}

export function normalizeDiscovery(value = {}) {
  const input = value && typeof value === 'object' ? value : {};
  const normalized = emptyDiscovery();
  for (const section of DISCOVERY_SECTIONS) {
    for (const [field] of section.fields) {
      const candidate = input?.[section.id]?.[field] || {};
      normalized[section.id][field] = {
        value: String(candidate.value ?? ''),
        state: DISCOVERY_STATES.includes(candidate.state) ? candidate.state : 'Unknown',
        source: String(candidate.source ?? '')
      };
    }
  }
  return normalized;
}

export function discoveryCompleteness(value = {}) {
  const discovery = normalizeDiscovery(value);
  let total = 0, recorded = 0, unknown = 0, sourced = 0;
  for (const section of DISCOVERY_SECTIONS) for (const [field] of section.fields) {
    total += 1;
    const statement = discovery[section.id][field];
    if (statement.value.trim()) recorded += 1;
    if (statement.state === 'Unknown') unknown += 1;
    if (statement.source.trim()) sourced += 1;
  }
  return { total, recorded, unknown, sourced, percentage: total ? Math.round((recorded / total) * 100) : 0, complete: recorded === total && unknown === 0 };
}

export function discoveryValidationErrors(value = {}) {
  const errors = [];
  const discovery = normalizeDiscovery(value);
  for (const section of DISCOVERY_SECTIONS) for (const [field, label] of section.fields) {
    const statement = discovery[section.id][field];
    if (!DISCOVERY_STATES.includes(statement.state)) errors.push(`${section.title}: ${label} has an unrecognized state.`);
    if (statement.value.trim() && !statement.source.trim()) errors.push(`${section.title}: ${label} needs a source or reviewer reference.`);
  }
  return errors;
}
