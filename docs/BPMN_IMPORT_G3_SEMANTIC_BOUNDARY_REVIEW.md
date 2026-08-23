# BPMN Import G3 Semantic-Boundary Review

**Date:** 2026-08-23
**Review type:** Skeptical developer self-review; not an independent security or specialist review
**Scope:** WP-06 candidate mapping only

## Result

No open Critical or Material semantic-boundary defect was identified in the controlled G3 scope.

The review confirmed:

- Every generated candidate is `PENDING_REVIEW` while the import remains `STAGED`.
- Candidate objects contain no authority, accountable-organization, accepted-responsibility, federation-member, compliance, AI-eligibility, approval, or implementation field.
- Participant, lane, message-flow, service-task, gateway, recovery, data, extension, and structural-error qualifications remain explicit and unresolved.
- BPMN DI is excluded from FEOA mapping.
- Deferred-container children are not silently coerced into supported candidates.
- Mapping returns a new import model and does not call or mutate the canonical FEOA workspace.
- Source mutation changes candidate identities; repeated semantic input produces a deterministic projection.

## Open limitations

- Candidate labels are untrusted source text. G4 must render them with text-only escaping and must not use raw HTML.
- The mapping profile is bounded; it is not a complete semantic interpretation of every BPMN 2.0 construct or vendor dialect.
- Candidate review history, partial disposition, explicit commit, rollback, UI behavior, and report generation remain unimplemented.
- The candidate-ID digest is truncated to 96 bits. Collision detection is enforced, but mathematical impossibility is not claimed.
- Independent review remains a G5 requirement.
