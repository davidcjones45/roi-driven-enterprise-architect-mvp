# Federated Logical Model Extension Candidate v0.1 — Increment 1

## Status and purpose

This is a **candidate**, additive logical-model extension for the browser-local ROI-EA workspace. It establishes stable, normalized shapes for later federated-enterprise work; it does not claim validation, compliance, safety, effectiveness, or ROI.

## Baseline and authority boundary preserved

Increment 1 preserves the existing FEOA workflow, Q1–Q8 Authority Envelope semantics, Authority Envelope decision history, browser-local persistence, and read-only ERIR integration. Existing participants remain canonical parties; existing Authority Envelopes remain canonical authority records; evidence and typed ERIR references remain canonical evidence references. ERIR remains authoritative for regulatory sources, obligations, applicability assessments, controls, and ERIR evidence. No ERIR schemas or records are copied or changed.

## Implemented Increment 1 scope

- Generalized counterfactual/scenario records with controlled `caseType`, optional comparator, form and AI references, and de-duplicated relationship IDs. Legacy case names, including an empty legacy counterfactual, retain their prior Case 0 normalization; missing comparators remain blank rather than inferred. Explicit generalized scenarios may use `CUSTOM`.
- Candidate normalizers for accountable decisions, reviews, lifecycle events, and reassessment triggers.
- Optional normalized collections for FOFA, MCVSM, FACEM, and BACRM foundations, with deterministic IDs and relationship ID preservation.
- Pure cross-cutting checks for permission/authority separation, lifecycle-event completeness and predecessor preservation, and non-mutating reassessment triggers.

For backward compatibility, an incoming permission that says `createsAuthority: true` is normalized to `false`; no authority is created. Candidate IDs use an explicit ID or a canonical natural key, never a collection position; a record lacking both remains unresolved with a blank ID. Candidate accountable decisions coexist with, rather than replace, Authority Envelope `decisionHistory`. `formDecisions` use `selectedAlternativeId` and `distributionRules` use `participantId`; ambiguous legacy plural references are retained but are not converted into those specific relationships.

## Not implemented

This increment does not add UI, an event store, membership/master-party redesign, FACEM/BACRM business logic, release checks, authority mutation, ERIR writes, or automatic relationship resolution. Later increments must supply those capabilities only with separately reviewed scope and tests.

## Increment 2 — FOFA and MCVSM candidate behavior

Increment 2 adds dedicated candidate normalizers and pure analytical checks for federation form alternatives, decision criteria, alternative ratings, form decisions, member economic thresholds, participant-specific distribution rules, unpriced effects, and expanded participant/federation economic cases. These records retain unresolved values and legacy ambiguous fields without guessing relationships.

Scenario comparison is comparator-ID-based. It classifies a federation increment only for an explicit `FEDERATION_NON_AI` versus `BEST_NON_FEDERATION` comparison, and a bounded-AI increment only for an explicit `FEDERATION_BOUNDED_AI` versus `FEDERATION_NON_AI` comparison. No comparator is inferred from position, case label, or current-state status.

Member viability is a separate non-override check: a positive collective result cannot pass required-member viability. Distribution checks distinguish mechanical share validity from participant acceptance; neither a valid allocation nor a ranking is a fairness conclusion, negotiated consent, form decision, authorization, or implementation decision. Unpriced effects remain qualitative and decision relevant.

FACEM lifecycle/dependency enforcement, BACRM release/recovery behavior, UI changes, ERIR writes or schema changes, and deployment changes remain excluded. Increment 2 remains candidate logical-model work, not validated methodology, compliance, safety, effectiveness, or ROI validation.

## Increment 3 — FACEM candidate behavior

Increment 3 adds dedicated candidate records and pure checks for membership events, governed dependencies, permissions, delegations, commitments, work-execution events, observations, evidence lineage, and selected accountable-decision/lifecycle checks. Participants remain the canonical parties, Authority Envelopes remain canonical authorities, and the existing Handoff object is extended in place with transmission, receipt, validation, acceptance, provenance, and correction references.

Membership state is derived from explicit effective-time events rather than record order; future events do not alter earlier state and ambiguous same-time transitions remain unresolved. A governed dependency is not a member merely because it supplies a service. Permission cannot create authority, and delegation cannot transfer residual accountability in this increment.

Commitment progression keeps request, offer, acceptance, execution, and completion distinct. Handoff, execution, evidence-lineage, and decision checks preserve explicit references and append-only predecessor links. The as-of helper is a limited logical reconstruction from currently normalized records, not a production event store or a claim of complete historical reconstruction.

BACRM input/output enforcement, abstention, fallback, suspension, recovery, and release behavior remain excluded, as do UI changes, persistence architecture, authentication, ERIR writes/schema changes, and deployment changes. Increment 3 remains candidate work only: it is not independently validated and makes no legal, compliance, safety, effectiveness, or production event-sourcing claim.

## Increment 4 — BACRM candidate behavior

Increment 4 adds dedicated candidate records and pure business-rule checks for a Bounded AI Capability & Recovery Model (BACRM). It introduces AI capability, explicit non-AI baseline, input and output boundary, Authority/FACEM crosswalk, evaluation, abstention, fallback, monitoring, suspension, recovery, release-criterion, and accountable release-decision records. These records reference the existing Participant, Authority Envelope, FACEM Permission, Commitment, Handoff, Accountable Decision, and evidence records; they do not duplicate or create those canonical objects.

The model requires an explicit viable non-AI baseline and fallback before a bounded release can be ready for an accountable release decision. Input boundaries preserve permission, provenance, quality, prohibited-inference, and missing/invalid-input response requirements. Output boundaries preserve review, uncertainty, prohibited use, and the rule that an output cannot create authority, a commitment, completion, or an autonomous action. Authority crosswalks check effective canonical authority and permission at the relevant time, while keeping the human decision owner distinct from the AI role.

Evaluation, abstention, monitoring, and release criteria are evidence and review inputs, not release authority. Abstention is a permitted safe response where configured and does not cause side effects. Monitoring may create an observation or review input but cannot suspend a capability automatically. Effective suspension blocks new use and preserves historical outputs/evidence. Recovery requires independent technical, authority/acceptance, and person-centered gates; even a passing recovery only supports a later accountable reactivation decision and never automatically reactivates the capability. Lifecycle derivation is effective-time based, excludes future records, and treats same-time conflicting lifecycle records as unresolved.

The minimal `CAP-RANK-001` synthetic fixture represents a fictional versioned assistant that ranks already-eligible staffing/service-coordination options for accountable human review. It is limited to approved-constraint filtering, ranking, and explanation/uncertainty/missing-data flags. It prohibits diagnosis, eligibility or referral decisions, assignment, scheduling, messaging, commitment, legal/compliance decisions, and autonomous record updates other than audit logging. Its process-test values are synthetic/modeled only.

Increment 4 is candidate work only and is not independently validated. It makes no production safety, effectiveness, compliance, fairness, ROI, legal, clinical, or operational-performance claim. The synthetic fixture is process-test evidence only. Autonomous execution, autonomous scheduling/assignment/messaging, model hosting/training infrastructure, UI/database/authentication/deployment changes, and ERIR schema or write changes remain explicitly excluded.
