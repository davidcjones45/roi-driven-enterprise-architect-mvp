# BPMN Import Methodology Extension Register

**Status:** Candidate extensions only; FEOA v0.2.3 remains frozen.
**Recorded:** 2026-08-23

| ID | Candidate extension | Reason | Disposition |
|---|---|---|---|
| BPMN-ME-001 | Imported representation boundary | A standards-valid model remains a modeled source, not operating truth or accepted architecture evidence. | Retain for later methodology reconciliation |
| BPMN-ME-002 | Parser provenance tuple | Source SHA-256, parser library/version, adapter version, mapping version, and import event must remain traceable together. | Retain for later methodology reconciliation |
| BPMN-ME-003 | Deterministic semantic projection | Volatile import-event metadata must be separable from the normalized semantic projection used for idempotence tests. | Retain for later methodology reconciliation |
| BPMN-ME-004 | Deferred-semantics visibility | Recognized but unmapped BPMN and vendor-extension content must remain visible and inert rather than being silently discarded or coerced. | Retain for later methodology reconciliation |
| BPMN-ME-005 | Reference-defect gate | Duplicate identifiers and missing endpoints are representation defects that block acceptance but do not themselves prove an operating-process defect. | Retain for later methodology reconciliation |

No entry changes the frozen FEOA baseline, assigns authority, establishes acceptance, or authorizes canonical persistence.
