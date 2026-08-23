# BPMN Import G1 Fixture Inventory

**Status:** Approved design inventory; fixture implementation and expected-output snapshots are WP-02/WP-04 controlled work.
**Profile:** `ROI-EA-BPMN-IMPORT-V0.1`

| ID | Fixture | Principal coverage | Expected disposition |
|---|---|---|---|
| BPMN-FX-01 | Existing North Star mortgage workflow | Current controlled subset and AIHS attributes | Parse with zero warnings; preserve 14 nodes, 13 flows, and inert AIHS attributes |
| BPMN-FX-02 | Minimal process | Definitions, non-executable process, start/task/end | Accept |
| BPMN-FX-03 | Collaboration and message flows | Participants, two processes, message endpoints | Accept; produce party and handoff candidates only |
| BPMN-FX-04 | Lanes and nested lanes | Lane hierarchy and flow-node references | Accept; authority remains unresolved |
| BPMN-FX-05 | Events and gateways | Boundary/intermediate events; exclusive/inclusive/parallel/event gateways | Accept recognized structures; preserve event definitions |
| BPMN-FX-06 | Subprocess and call activity | Nested containment and called-element reference | Accept if references resolve; do not flatten silently |
| BPMN-FX-07 | Data objects and associations | Data object/reference, input/output associations | Accept supported inventory; permission and quality unresolved |
| BPMN-FX-08 | Diagram Interchange | BPMNDiagram, plane, shapes, edges, waypoints | Accept for rendering metadata only |
| BPMN-FX-09 | Unknown extension namespace | Synthetic vendor attributes/elements | Preserve inertly and report; never execute |
| BPMN-FX-10 | Choreography/conversation | Recognized but mapping-deferred constructs | Parse if possible; report unsupported for v0.1 mapping |
| BPMN-FX-11 | Duplicate IDs | Duplicate element identifiers | Reject staged import deterministically |
| BPMN-FX-12 | Dangling references | Missing source, target, lane, or called-element target | Reject or retain staged-only with complete diagnostics; no canonical candidates |
| BPMN-FX-13 | Malformed XML | Unclosed/misnested elements and invalid encoding declaration | Reject safely |
| BPMN-FX-14 | DTD/entity attack | DOCTYPE, internal/external entity, expansion pattern | Reject before parser invocation |
| BPMN-FX-15 | External-resource attempts | Schema locations, imports, URLs, image/script-like extension data | Never retrieve; reject active constructs or preserve inert text as defined by the safety gate |
| BPMN-FX-16 | Resource bounds | Oversize file, depth 65, excessive nodes/attributes/value length | Reject at the applicable limit |
| BPMN-FX-17 | Vendor dialect samples | Synthetic Camunda/Flowable-style namespaces without executable payloads | Preserve inert extensions and report coverage |
| BPMN-FX-18 | Idempotence pair | Same input, parser version, mapping version | Byte-equivalent normalized JSON after volatile import metadata is excluded |
| BPMN-FX-19 | Mutation/provenance | Same IDs with changed source bytes | New source hash and import record; no overwrite |
| BPMN-FX-20 | Regression corpus | Existing ROI-EA/FEOA/mortgage/public-demo suite | All existing tests remain green |

## Fixture controls

- Every fixture must be synthetic, publicly redistributable, or generated from an official machine-readable example with provenance recorded.
- No client, applicant, ClearWellness, production-bank, or confidential workflow data may be included.
- Hostile fixtures must be stored and read only as inert text.
- Each fixture requires a source SHA-256, expected parser result, expected normalized inventory, and expected diagnostic set.
- Vendor namespaces do not imply vendor endorsement, compatibility, or operational support.
