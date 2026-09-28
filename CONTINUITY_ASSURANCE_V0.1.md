# Continuity Assurance v0.1

This increment implements the ROI-EA application layer for **CIF-S-009 — Continuity Assurance Profile** and **CIF-AP-002 — Continuity Assurance Application Pattern**. It does not modify CIF Core.

## Added application records

- `relianceClaims`
- `constraintValidations`
- `reassessmentRecords`
- `assuranceViewRecords`
- `interventionOutcomes`
- `successorAssuranceRecords`
- optional `humanAgencyReviews`
- optional `graduationRecords`
- optional `interactionDivergenceRecords`

All fields are additive to the existing browser-local modernization workspace. Existing workspaces remain valid. The migration adapter initializes missing new collections and uses `NOT_ASSESSED` as the default absence state for new continuity semantics.

## Reliance Claim
A Reliance Claim answers what the application is currently justified in asserting may be relied upon for an Essential Action within stated conditions, scope, and boundary. It references existing dependencies rather than duplicating dependency edges.

A requested `SUPPORTED` state is downgraded when material dependency/evidence conditions are unknown, unresolved, stale, missing, or conflicting. The implementation returns separate `effectiveStatus` and `evidenceState` values and never produces a universal assurance score.

## Designed / Observed / Assured
These are nonhierarchical analytical perspectives. The comparison view can identify designed-only, observed-only, observed-not-assured, designed-and-observed-not-assured, designed/observed divergence, and qualified assurance. They are not maturity stages and do not create CIF Core objects.

## Dependency accumulation
The application exposes breadth, recorded dependency depth, concentration, commonality, fragmentation, substitutability, and coordination burden separately. Opacity is kept as an epistemic property. There is no composite dependency score.

## Constraining Dependency validation
Existing structural candidates remain screening signals. A local `VALIDATED` finding requires evidence of a material operating limitation for `OPERATIONAL`, or evidence that the dependency materially limits change while preserving the Essential Action for `ADAPTATION_CONSTRAINING`. Centrality or dependency count alone cannot validate the constraint.

## Intervention, outcome, and residual exposure
Action completion and structural mitigation transitions remain distinct from Outcome. A realized outcome classification requires outcome evidence. Residual Exposure remains explicit and is not collapsed into a universal risk score.

## Reassessment
Supported triggers are:

- `CONFIGURATION_CHANGE`
- `INTERACTION_OR_PERFORMANCE_DIVERGENCE`
- `OUTCOME_DIVERGENCE`
- `SCHEDULED_ASSURANCE_REFRESH`
- `EVIDENCE_DEGRADATION`

Targeted reassessment begins with the affected reference and expands only to directly implicated Essential Actions and Reliance Claims. It does not reopen the repository.

## Successor Assurance
Successor analysis checks Role Adequacy, Semantic Continuity, Behavioral-Boundary Continuity, and Architectural Continuity. Nominal functional similarity does not satisfy the analysis by itself.

## Optional human-centered patterns
Human Agency and Graduation are displayed only when activated or when matching records exist. The Human Agency Gate structures rights/preference/consent review without manufacturing legitimacy or authorization. Graduation supports later reassessment and re-entry without rewriting the earlier supported condition as historical failure.

## Human+AI Interaction Divergence
Interaction Divergence compares the active Human+AI interaction against an assured/reconstructed baseline across function allocation, authority allocation, information relationship, verification/challenge, coordination/escalation, and continuity/fallback. A material difference creates the `INTERACTION_OR_PERFORMANCE_DIVERGENCE` reassessment trigger.

## CIF handoff
`continuityAssuranceCifHandoff()` wraps the existing dependency CIF projection and adds specialization metadata for Reliance Claims, local constraint validations, reassessment records, successor analyses, evidence states, and intervention/outcome records. It explicitly sets `canonicalization: false`.

The handoff does not create canonical Authority, Decision, Acceptance, legal applicability, clinical correctness, Control effectiveness, causal improvement, or realized Outcome.

## Runtime identity boundary
This increment adds no authentication layer. Reviewer, creator, actor, and authority references are application records only:

**Modeled identity/authority != authenticated identity/runtime authorization.**

## Tests
`continuity-assurance.test.mjs` contains deterministic CA-01 through CA-14 acceptance coverage plus additional regression checks for dependency accumulation, Interaction Divergence, and migration defaults. `continuity-assurance-ui.test.mjs` protects progressive-disclosure UI wiring and CIF handoff exposure.
