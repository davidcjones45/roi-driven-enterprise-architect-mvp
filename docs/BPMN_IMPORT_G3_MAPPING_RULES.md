# BPMN Import G3 Mapping Rules

**Version:** 0.1.0
**Date:** 2026-08-23
**Status:** Deterministic candidate generation only

## Mapping boundary

`mapBpmnToFeoaCandidates()` converts a structurally processed BPMN import model into review-pending candidate records. It does not create or update canonical FEOA records. Every candidate retains the source SHA-256, BPMN source ID, exact BPMN type, mapping-rule ID, related source IDs, qualification flags, and a deterministic candidate ID.

| Rule | BPMN source | Candidate | Mandatory unresolved qualifications |
|---|---|---|---|
| BPMN-MAP-001 | Process | Value stream | Operating currency and scope |
| BPMN-MAP-002 | Participant/pool | Participant | Legal identity, accountability, federation membership |
| BPMN-MAP-003 | Lane | Performer role | Authority and capacity |
| BPMN-MAP-004 | Supported non-service task, subprocess, call activity | Process step | Owner, baseline, current state, evidence |
| BPMN-MAP-005 | Sequence flow | Transition | Timing and success |
| BPMN-MAP-006 | Message flow | Handoff | Delivery, permitted information use, acceptance, commitment |
| BPMN-MAP-007 | Service task | Technical capability | Implementation, AI classification, action authority |
| BPMN-MAP-008 | Exclusive, inclusive, event-based, or complex gateway | Decision point | Decision authority and rule evidence |
| BPMN-MAP-009 | Parallel gateway | Control point | Synchronization semantics and control effectiveness |
| BPMN-MAP-010 | Boundary/error/escalation and selected recovery event definitions | Exception/recovery | Recovery owner and residual accountability |
| BPMN-MAP-011 | Selected data objects/associations | Dependency | Classification, provenance, permission, quality |
| BPMN-MAP-012 | Preserved but unmapped element | Evidence gap | Extension trust and semantics |

All candidates additionally carry `SOURCE_MODELED_ONLY`, `HUMAN_REVIEW_REQUIRED`, `CANONICAL_COMMIT_NOT_AUTHORIZED`, and `LABEL_UNTRUSTED_SOURCE_TEXT`. Structurally defective source models add `SOURCE_HAS_STRUCTURAL_ERRORS`. Supported BPMN elements containing vendor/extension attributes add `EXTENSION_PRESENT_UNTRUSTED`.

## Deliberate non-mappings

- BPMN Diagram Interchange creates no FEOA candidate.
- Children within a deferred choreography or other deferred container are not independently coerced into supported FEOA candidates.
- Start/end and ordinary intermediate events do not automatically become actions.
- A service task becomes a technical-capability candidate, not an AI capability or process authority.
- No mapping rule produces a canonical ID, accepted disposition, organization commitment, compliance conclusion, economic claim, or automation recommendation.

## Candidate identity

Candidate identity is the first 96 bits of SHA-256 over source hash, source ID, and mapping-rule ID, prefixed by the rule number. Runtime validation rejects duplicate candidate IDs. Source-byte changes therefore create different candidate identities rather than overwriting prior candidates.

The 96-bit truncation makes accidental collision highly unlikely but does not make it mathematically impossible. Duplicate detection remains mandatory.
