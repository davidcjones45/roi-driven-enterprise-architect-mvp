# BPMN Assessment Gate C Readiness

**Status:** Candidate implementation; human review required

Gate C adds a browser-local, source-linked obligation/control assessment over a controlled staged BPMN import. It accepts only reviewer-supplied reference IDs and retains the originating BPMN candidate ID and source SHA-256 in deterministic assessment IDs.

## Boundary preserved

- An obligation ID is a `POTENTIALLY_APPLICABLE_OBLIGATION`, not a legal applicability conclusion.
- A control ID is an unverified review reference, not an effective control or compliance result.
- Missing control evidence yields `POTENTIAL_CONTROL_GAP`, never a violation or noncompliance conclusion.
- No ERIR write, Authority Envelope change, commitment, acceptance, or operating authorization occurs.

## Gate behavior

- `GATE_C_HOLD`: controlled source provenance is absent.
- `GATE_C_CONDITIONAL`: reviewer mappings or control evidence remain unresolved.
- `GATE_C_REVIEW_READY`: supplied references are source-linked but still require qualified review.

This implements the bounded Gate C portion of proposed `BPMN-MOA-001`; it does not amend frozen FEOA v0.2.3 or Authority/Evidence semantics.
