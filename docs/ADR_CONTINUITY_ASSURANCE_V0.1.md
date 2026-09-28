# ADR — Continuity Assurance specialization/application layer v0.1

## Status
Accepted for implementation against ROI-EA `main` baseline `ceae144a217728a9dfba4362844aefd9d3116b5c`.

## Context
ROI-EA already represents Continuity Anchors, Essential Actions, dependency graphs, evidence provenance, candidate dependency findings, validated mitigation lifecycle, BPMN projection, Microsoft Graph reporting structure, and CIF v0.4.1 candidate handoff. Existing code deliberately prevents graph structure or imports from manufacturing operating truth, Authority, Acceptance, Control effectiveness, causal improvement, or realized Outcome.

CIF-S-009 and CIF-AP-002 require the application to make justified Reliance, evidence-bounded assurance, reassessment, successor transition, outcome/residual exposure, and optional human-centered assurance explicit without changing CIF Core.

## Decision
Add an application-level continuity-assurance layer composed of:

- Reliance Claim records linked to existing Essential Actions, dependency references, reliance objects, and evidence;
- deterministic assurance evaluation that prevents unqualified `SUPPORTED` when material dependency/evidence conditions are unknown, unresolved, stale, missing, or conflicting;
- local constraining-dependency validation records that distinguish structural screening signals from evidence-backed operational or adaptation constraints;
- explicit Reassessment Records and targeted-first scope derivation;
- nonhierarchical Designed / Observed / Assured comparison records and views;
- separate dependency-accumulation dimensions with opacity represented separately and no universal score;
- intervention/consequence/outcome/residual-exposure analysis that does not equate action completion with successful Outcome;
- Successor Assurance across Role Adequacy, Semantic Continuity, Behavioral-Boundary Continuity, and Architectural Continuity;
- optional Human Agency Gate and Graduation patterns;
- Human+AI Interaction Divergence as a specialized reassessment trigger;
- an additive CIF handoff wrapper that exports specialization metadata and candidate mappings without canonicalization.

The browser-local modernization workspace remains the persistence boundary. New fields are additive JSON arrays; old records remain valid. `migrateContinuityAssuranceWorkspace()` supplies empty arrays and `NOT_ASSESSED` as the semantic default for absent new fields. Missing values are not silently converted to `UNKNOWN`.

## Deliberately not added

- no CIF Core families or changes to canonical CIF v0.4.1;
- no duplicate dependency graph or Dependency Accumulation object;
- no universal assurance, risk, power, or dependency-accumulation score;
- no automatic Authority, process ownership, permission, accountability, or delegation inference from Microsoft Graph;
- no conversion of BPMN into verified operating truth;
- no automatic canonicalization in CIF handoff;
- no repository-wide reassessment invalidation;
- no inference that completed mitigation proves realized Outcome or Control effectiveness;
- no authentication, sign-in, session, credential validation, access-token, refresh-token, or runtime authorization layer;
- no AI inference where deterministic rules and explicit evidence states suffice.

## Authentication/non-goal boundary
ROI-EA models actors, authority, permissions, evidence, and governance semantics as analytical records. These records do not authenticate HTTP callers or prove the identity of a person. Therefore:

**Modeled identity/authority != authenticated identity/runtime authorization.**

The continuity-assurance layer preserves that distinction. `createdBy`, `reviewer`, `relyingActorRef`, or `authorityRef` are recorded references, not authentication assertions.

## CIF Core rationale
No CIF Core change is required. The new capability either:

1. specializes existing CIF objects/relationships;
2. records application workflow/review state;
3. derives analytical views over existing dependency/evidence structures; or
4. exports candidate mappings for governed CIF review.

The implementation therefore preserves the four-layer separation among canonical CIF semantics, specialization/application pattern, application schema/logic, and user-facing decision views.

## Semantic invariants

- Dependency != justified Reliance.
- Capability != Authority.
- Access != Permission.
- Evidence != Fact != Inference != Recommendation != Decision.
- Action completion != successful Outcome.
- Structural prominence != validated Constraint.
- Designed != Observed != Assured.
- Representation != reality.
- Recording conflict != resolving conflict.
- Unknown material dependencies limit assurance.
- Imported process/org structure != verified operating authority.
- Successor similarity != Successor Assurance.
- Human capability != admissibility.
- Graduation != permanent independence.
- Re-entry != automatic failure.
- CIF handoff != canonicalization.
- Application implementation != empirical validation of CIF.

## Consequences
The application can make reliance boundaries, evidence limitations, targeted reassessment, successor gaps, and residual exposure visible without implying that the system is fully knowable. Existing browser-local and CIF v0.4.1 behavior remains intact because the change is additive and opt-in.
