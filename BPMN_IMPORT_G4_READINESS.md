# BPMN Import G4 Readiness

**Gate:** G4 — local import, review, explicit commit, and export

## Acceptance evidence

- Candidate review supports Accept, Revise, and Reject with append-only history.
- Final accepted and rejected dispositions cannot be overwritten.
- Revised candidates require a later final disposition.
- Canonical commit requires complete review, named committer, UTC timestamp, and explicit confirmation.
- Structural-error sources are non-committable.
- Only six existing FEOA v0.2.3 collections receive records; unsupported candidates remain explicit.
- Handoff, technical-capability, participant, and evidence-gap defaults do not imply consequential states.
- Canonical source and candidate records remain distinct and source-traceable.
- Deterministic normalized-model and import-report exports are available.
- Imported labels use text-only DOM rendering.
- Full automated test suite passes.

## Deferred to G5

- Independent review.
- Full security and performance review.
- Formal visual QA across supported browsers.
- Optional BPMN diagram-viewer dependency decision.
- Push, merge, deployment, and release decision.

## Gate result

`G4 ACCEPTED—LOCAL REVIEW, EXPLICIT COMMIT, AND EXPORT FLOW COMPLETE`
