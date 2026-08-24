# Methodology Extension Register

## BPMN-MOA-001 — Multi-organization process assessment relationship

- **Date:** 2026-08-24
- **Source:** BPMN multi-organization assessment design package
- **Affected modules:** Candidate BPMN assessment layer; prospective FEOA/Authority/Evidence references
- **Finding type:** Proposed representational extension
- **Description:** Controlled BPMN intake preserves source notation, provenance, review, bounded candidate mapping, and visualization. It does not yet represent first-class, source-linked candidate objects for cross-organization boundaries, handoffs, information boundaries, dependencies, customer touchpoints, qualified obligation/control assessments, unresolved gaps, or bounded-AI suitability.
- **Evidence:** `BPMN_MULTI_ORGANIZATION_ASSESSMENT_EXTENSION_V0.1.md`
- **Severity:** Non-blocking / material for future BPMN assessment capability
- **Proposed disposition:** Design and separately review a candidate assessment layer. Retain the distinctions among performer, authority, accountable organization, evidence, permission, commitment, dependency, and control. Do not infer legal applicability, compliance, violation, operating authorization, realized benefit, or AI decision authority from BPMN notation or mappings.
- **Status:** Proposed design; no implementation authorized by this entry.

## NSI-001 — Multi-year economic calculation relationship

- **Date:** 2026-08-20
- **Source:** North Star integrated execution
- **Affected modules:** MCVSM
- **Finding type:** Missing logical object/relationship
- **Description:** MCVSM currently accepts and compares explicit collective and member economic values, but does not represent a discounted multi-year cash-flow schedule from which NPV, ROI, PV benefit-cost ratio, and allocation outcomes can be reproducibly derived.
- **Evidence:** `north-star-integrated-execution.test.mjs`; the synthetic C2/C1 and C3/C2 reviewed values were retained as fixture inputs because no accepted calculator relationship exists.
- **Severity:** Non-blocking / material for future calculation automation
- **Proposed disposition:** Candidate model extension, separately reviewed; do not alter the accepted modules in this integrated-execution pass.
- **Status:** Implemented candidate extension — pending independent review.
- **Implementation:** `mcvsm-economic-calculation.test.mjs` demonstrates explicit periodized flows, 8% discounting, 3% annual growth, NPV, and public-path incremental `TOTAL_DISCOUNTED_COST` ROI/BCR reconciliation from calculated-case cash-flow schedules against the synthetic targets. Real-data validation remains outstanding.
