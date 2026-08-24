# BPMN Import G4 Implementation

**Implemented:** 2026-08-23
**Scope:** Browser-local review, explicit bounded commit, and deterministic export

## Flow

1. Secure intake and standards-aware parsing produce a normalized source model.
2. Structural validation records diagnostics without inventing operating meaning.
3. Mapping produces source-traceable, review-pending candidates.
4. A named reviewer records Accept, Revise, or Reject with a UTC timestamp and rationale.
5. A revised candidate remains unresolved until it is finally accepted or rejected.
6. Canonical commit requires every candidate to have a final disposition plus a separate explicit confirmation.
7. The commit creates only supported FEOA v0.2.3 records and retains provenance and qualifications.
8. Normalized JSON and a deterministic import report can be exported locally.

## Supported canonical targets

| Candidate | FEOA collection | Conservative initialization |
|---|---|---|
| Participant | `participants` | Alignment and membership remain unresolved |
| Value stream | `valueStreams` | Modeled source only |
| Process step | `processSteps` | Current operation and ownership remain unverified |
| Handoff | `handoffs` | Communication `Created`; responsibility `Not Offered`; authority `Pending` |
| Technical capability | `capabilities` | AI classification `Unresolved`; implementation `Unverified` |
| Evidence gap | `evidenceGaps` | Status `Open` |

Every other G3 candidate type is exported with `NO_CANONICAL_TARGET_V0_2_3`. It is not forced into an inaccurate record type.

## Prohibitions retained

Neither review nor commit establishes BPMN conformance, operating truth, process effectiveness, authority, accountability, responsibility acceptance, compliance, federation membership, AI classification, or implementation. Sources carrying structural errors cannot be committed.

## Viewer decision

The optional BPMN diagram viewer was deferred. G4 does not need another runtime dependency to satisfy its review and traceability gate. The source-element inventory and stable source IDs provide the bounded review surface; viewer value, license, bundle size, and security implications can be assessed separately.
