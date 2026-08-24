# BPMN Multi-Organization Assessment Extension v0.1

**Status:** Proposed design package — no code, schema migration, or release authorization
**Date:** 2026-08-24
**Applies to:** Controlled BPMN intake, read-only visualization, and prospective ROI-EA candidate-assessment views

## Purpose

This proposed extension turns a controlled, staged BPMN source that describes work across organizations and reaches a customer/end user into an evidence-controlled **assessment**. It makes process boundaries, handoffs, dependencies, customer touchpoints, evidence needs, potential control gaps, and bounded-AI opportunities visible for accountable human review.

It is not a workflow engine, BPMN conformance checker, legal-analysis engine, compliance certification, violation detector, operating authorization mechanism, customer-decision system, or ROI calculator.

The supported question is:

> Is there enough traceable process, authority, evidence, control, and operational information to pursue a bounded human review of the current process and a proposed improvement?

## Guardrails

- BPMN source remains immutable evidence. All mapped records retain source element IDs, source SHA-256, mapping version, and recorded time.
- A pool, lane, performer, message, flow, data association, system, or technical connection does not establish authority, acceptance, commitment, information permission, legal applicability, compliance, or customer preference.
- An ERIR link is a reference/retrieval record. It does not prove applicability, compliance, accepted evidence, effective control, or authorization.
- A control mapping is traceability, not proof a control applies or operates effectively.
- AI output, alert, ranking, omission check, routing suggestion, and abstention are not accountable decisions, authorization, acceptance, completion, escalation, or resumption.
- Every candidate AI task must retain a viable non-AI baseline, explicit abstention, and accountable human disposition.
- All economic outputs are hypotheses with stated assumptions; no realized savings, ROI, effectiveness, or causality claim is permitted without independently supplied evidence.
- Any semantic problem discovered during implementation is entered in the Methodology Extension Register; it is not silently resolved in UI presentation code.

## Reused source-intake boundary

The extension reuses `AIHS-BPMN-SUBSET-V0.1` and does not widen the parser. Existing intake, security, review, disposition, and provenance rules remain controlling.

| Normalized source record | Candidate assessment use | What it cannot establish |
|---|---|---|
| Process, participant/pool, lane | Candidate organization, role, or scope boundary | Legal identity, membership, authority, accountability |
| Task, event, gateway, subprocess | Candidate work, decision/review point, or handoff trigger | Authority or an accountable decision |
| Sequence/message flow | Candidate workflow connection or handoff | Receipt, validation, acceptance, commitment |
| Data object/store, association | Candidate information/evidence boundary | Permission, consent, valid evidence |
| Service task/technical extension | Candidate dependency or bounded technical-support question | AI capability, authority, validated operation |
| BPMN-DI | Visualization location only | Assessment semantics |

Rejected, malformed, incomplete, or unsupported sources may remain visible as evidence, but must not generate unqualified findings.

## Candidate model

These are prospective candidate objects. They do not modify Authority Envelope, ERIR, accepted FEOA objects, or canonical BPMN schemas. Every object has a stable identifier independent of collection order; an ID derives from an explicit ID or documented natural key such as source SHA-256 + BPMN element ID + object type. Missing natural keys remain unresolved.

| Object | Purpose | Required links | Prohibited inference |
|---|---|---|---|
| `ProcessParticipant` | Candidate organization, role, system, dependency, customer/end user, or unclassified party. | Source BPMN IDs; participant type; qualification. | Membership, verified identity, authority, customer relationship. |
| `ProcessHandoff` | Proposed cross-boundary transfer/review path. | Sender, intended recipient, purpose, source flow IDs, information/evidence IDs. | Transmission ≠ receipt ≠ validation ≠ accountable acceptance. |
| `ProcessDecisionPoint` | Process decision or decision-like review gate. | Affected work, required reviewer/authority/evidence, unresolved state. | Gateway/task/AI output is not authority or decision. |
| `InformationBoundary` | Data category, purpose, source, recipient, permitted/restricted-use question. | Handoff, work, customer touchpoint, evidence links. | Access/association/delivery is not permission. |
| `ProcessDependency` | Non-member technology/provider or external prerequisite. | Sponsor question, affected work, failure/fallback, evidence. | Dependency is not a member, decision maker, or accepting party. |
| `CustomerTouchpoint` | Customer/end-user consequence and human consideration. | Related work/organization/information boundary. | Current preference, consent, suitability, or need. |
| `AuthorityAccountabilityAssessment` | Qualified comparison of performer, authority, accountable organization, and residual accountability. | Existing Authority Envelope refs when supplied; evidence links. | No authority created from BPMN mapping. |
| `ObligationAssessment` | Potentially applicable obligation/reference and review status. | ERIR reference; scope; evidence/control links. | Legal applicability, legal conclusion, compliance. |
| `ControlAssessment` | Candidate/evidenced control and its evidence state. | Control ref, scope, owner question, evidence/gap IDs. | Control effectiveness or compliance. |
| `AssessmentGap` | Missing, stale, conflicting, unsupported, or unverified information. | Affected objects; requested reviewer/action. | Breach or violation. |
| `BoundedAiCapabilityCase` | Non-AI baseline versus bounded support candidate. | Inputs/output, abstention, prohibited actions, fallback, reviewer. | Authority, acceptance, completion, or resumption. |
| `EconomicHypothesis` | Modeled delay, rework, capacity, cost category, or customer consequence. | Baseline/evidence assumptions, comparator, uncertainty. | Realized savings, ROI, effectiveness, causality. |
| `QualifiedFinding` | Decision-facing qualified result. | Source/candidate IDs, rationale, qualification, disposition. | Compliance, violation, implementation, authorization. |

### Lifecycle and reconstruction

Candidate assessment records are append-only. Corrections, challenges, supersession, suspension, withdrawal, and changed evidence are later records with predecessor links. Point-in-time reconstruction filters future records before sequence/consistency validation.

## Finding vocabulary

Automated mapping may use only this controlled vocabulary:

| Finding | Meaning |
|---|---|
| `REVIEW_REQUIRED` | Decision-relevant evidence or accountable review is missing. |
| `UNRESOLVED_BOUNDARY` | Participant, handoff, information, authority, or dependency cannot be determined from admitted evidence. |
| `POTENTIAL_CONTROL_GAP` | A process/control mapping is absent, conflicting, stale, incomplete, or unverified. |
| `POTENTIALLY_APPLICABLE_OBLIGATION` | An ERIR reference may warrant qualified applicability review. |
| `MISSING_EVIDENCE` | Required or claimed evidence is absent, stale, malformed, inaccessible, or unlinked. |
| `DEPENDENCY_RISK` | A dependency lacks a represented failure, fallback, or recovery condition. |
| `AI_SUPPORT_CANDIDATE` | A bounded non-authoritative support task may merit review. |
| `AI_NOT_SUITABLE_OR_INSUFFICIENT_EVIDENCE` | AI task has an impermissible action, insufficient evidence, inadequate fallback, or unresolved boundary. |
| `MODELED_EFFICIENCY_HYPOTHESIS` | A transparent model suggests a potential delay, rework, capacity, or cost-pool change. |

The product must not emit `COMPLIANT`, `NONCOMPLIANT`, `VIOLATION`, `APPROVED`, `AUTHORIZED`, `IMPLEMENTED`, `SAVINGS_ACHIEVED`, or `ROI_PROVEN`.

## Mapping rules

### Process boundaries and handoffs

1. Detect pools, lanes, message flows, cross-boundary connections, external-system references, data objects/stores, and decision-like nodes.
2. Generate source-linked candidate records only; do not enrich absent facts from labels or diagram placement.
3. Separate transmission, intended receipt, validation, accountable acceptance, correction, and historical state for every handoff.
4. Where sender, recipient, purpose, information category, or evidence requirement is absent, emit `UNRESOLVED_BOUNDARY` or `MISSING_EVIDENCE`.

### Authority, accountability, obligations, and controls

1. A lane can provide a performer label only.
2. Existing Authority Envelope, evidence, and ERIR references may be linked when supplied; none is generated from BPMN notation.
3. Missing authority/evidence creates `REVIEW_REQUIRED` rather than blocking visualization.
4. ERIR links begin as `POTENTIALLY_APPLICABLE_OBLIGATION`; a qualified reviewer must record any later applicability disposition.
5. A mapped control remains a candidate/evidence relationship and can never produce a compliance result.

### Bounded AI

First-release permitted candidates are evidence-completeness/provenance checks, unlinked-record detection, routing suggestions using approved non-customer-decision criteria, observed-delay/rework identification from supplied measurements, and traceability/report assembly.

Excluded: customer eligibility or credit decisions; authority interpretation; legal applicability conclusions; work acceptance; exception approval; completion inference; escalation decisions; and recovery/resumption authorization.

Every candidate states the manual baseline, permitted inputs/output, abstention conditions, prohibited actions, accountable reviewer, fallback, monitoring, and suspension/withdrawal behavior.

## Comparative assessment and outputs

The system compares:

- **Case 0 — current/non-AI baseline:** observed or explicitly modeled workflow, evidence quality, and assumptions.
- **Candidate support case:** bounded AI-supported or non-AI improvement option; never presumed selected or authorized.

| Output | Minimum content | Boundary |
|---|---|---|
| Process Boundary Map | Parties, dependencies, customer touchpoints, work, handoffs, information/evidence boundaries, source IDs. | Read-only; no BPMN execution. |
| Authority/Accountability View | Performer vs authority vs accountable/residual organization; missing evidence. | Does not grant authority or accept responsibility. |
| Risk and Control Matrix | Qualified obligation refs, control candidates, evidence states, gaps, reviewers. | No applicability, effectiveness, or compliance conclusion. |
| Bounded-AI Suitability View | Case 0, candidate task, abstention, fallback, reviewer, monitoring, prohibited actions. | No AI deployment authorization. |
| Economic Hypothesis View | Assumptions, baseline, cost categories, uncertainty, comparator, measurement plan. | No ROI claim without supported inputs. |
| Accountable Review Dossier | Findings, provenance, gaps, requested decisions, download-only handoff. | No public writeback to ERIR. |

## Delivery sequence

| Increment | Scope | Gate |
|---|---|---|
| A — Source mapping | Multi-organization parties, handoffs, dependencies, information boundaries, decision points, customer-touchpoint placeholders, synthetic fixture. | Immutable source, stable IDs, no authority/permission/commitment/compliance inference. |
| B — Handoff and evidence | Append-only handoff/gap records, links to independently supplied authority/evidence, point-in-time reconstruction, reviewer disposition. | Transmission/receipt/validation/acceptance and performer/authority/accountability remain distinct. |
| C — Obligation/control | ERIR links, qualified obligation/control/gap findings, risk/control matrix. | Retrieval does not infer applicability; mapping does not infer effectiveness/compliance. |
| D — Baseline and AI | Case 0 friction/economic hypotheses; bounded AI for completeness/traceability. | Viable non-AI fallback and abstention; no consequential AI action. |
| E — Dossier | Read-only reports and download-only handoff; synthetic cross-organization execution. | Every result has provenance, assumptions, qualification, and accountable disposition. |

## Acceptance tests

1. A collaboration with three organizations, a vendor dependency, and a customer touchpoint yields source-linked records without treating a vendor/customer as a member.
2. A message flow creates a handoff candidate but not receipt, acceptance, authority, or commitment.
3. A lane creates a performer label only; missing authority evidence yields `REVIEW_REQUIRED`.
4. A data/service connection does not establish permission, consent, evidence validity, or AI authority.
5. An ERIR link remains `POTENTIALLY_APPLICABLE_OBLIGATION` until accountable review records a supported disposition.
6. Missing control evidence yields `POTENTIAL_CONTROL_GAP`, never a violation or noncompliance conclusion.
7. Reordered BPMN elements yield identical candidate IDs/findings.
8. Later correction/suspension preserves earlier point-in-time reconstruction.
9. An AI completeness candidate abstains on missing evidence and exposes a non-AI fallback.
10. Routing support cannot create acceptance, customer decisions, authority, completion, or recovery.
11. Missing quantitative inputs prevent numeric cost/benefit or ROI assertions.
12. Export preserves IDs, qualifications, assumptions, and unresolved gaps without public write routes.

## Initial synthetic reference case

Use a fictional process with three independent organizations, one non-member platform dependency, one optional analytics dependency, and a customer interaction through one organization. Include two cross-organization handoffs, incomplete evidence, missing authority, missing control evidence, a viable non-AI review path, and a candidate AI completeness/traceability task that abstains and routes to human review.

Do not include protected customer data, a live regulatory decision, real organizational claims, legal conclusion, agreement, operating authorization, realized financial outcome, or customer recommendation.

## Human approvals required before implementation

1. First approved industry/process reference and source-owner authorization.
2. Initial controlled data-category and customer-touchpoint vocabulary.
3. Reviewer roles permitted to record authority, evidence, control, obligation, and economic-hypothesis dispositions.
4. Minimum evidence before numeric economic hypotheses may be shown.
5. Public-demo policy for live ERIR retrieval versus static/synthetic references.
6. Future persistence boundary for browser-local versus organization-governed assessment records.

## Methodology Extension Register disposition

This package proposes `BPMN-MOA-001 — Multi-organization process assessment relationship`: controlled BPMN currently preserves source notation, provenance, review, bounded candidate mapping, and visualization, but not first-class source-linked cross-organization authority/evidence/control/gap assessment objects.

**Status:** Proposed; separate implementation approval required.
**Constraint:** Frozen FEOA v0.2.3 and accepted Authority/Evidence semantics must not be changed from this design alone.
