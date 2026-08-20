# Federated Logical Model Extension Candidate v0.1 — Increment 1

## Status and purpose

This is a **candidate**, additive logical-model extension for the browser-local ROI-EA workspace. It establishes stable, normalized shapes for later federated-enterprise work; it does not claim validation, compliance, safety, effectiveness, or ROI.

## Baseline and authority boundary preserved

Increment 1 preserves the existing FEOA workflow, Q1–Q8 Authority Envelope semantics, Authority Envelope decision history, browser-local persistence, and read-only ERIR integration. Existing participants remain canonical parties; existing Authority Envelopes remain canonical authority records; evidence and typed ERIR references remain canonical evidence references. ERIR remains authoritative for regulatory sources, obligations, applicability assessments, controls, and ERIR evidence. No ERIR schemas or records are copied or changed.

## Implemented Increment 1 scope

- Generalized counterfactual/scenario records with controlled `caseType`, optional comparator, form and AI references, and de-duplicated relationship IDs. Legacy case names remain readable; missing comparators remain blank rather than inferred.
- Candidate normalizers for accountable decisions, reviews, lifecycle events, and reassessment triggers.
- Optional normalized collections for FOFA, MCVSM, FACEM, and BACRM foundations, with deterministic IDs and relationship ID preservation.
- Pure cross-cutting checks for permission/authority separation, lifecycle-event completeness and predecessor preservation, and non-mutating reassessment triggers.

For backward compatibility, an incoming permission that says `createsAuthority: true` is normalized to `false`; no authority is created. Candidate accountable decisions coexist with, rather than replace, Authority Envelope `decisionHistory`.

## Not implemented

This increment does not add UI, an event store, membership/master-party redesign, FACEM/BACRM business logic, release checks, authority mutation, ERIR writes, or automatic relationship resolution. Later increments must supply those capabilities only with separately reviewed scope and tests.
