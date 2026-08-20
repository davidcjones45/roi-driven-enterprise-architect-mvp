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
