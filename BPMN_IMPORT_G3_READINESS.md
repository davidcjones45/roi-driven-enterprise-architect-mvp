# BPMN Import G3 Readiness Record

**Decision date:** 2026-08-23
**Branch:** `feature/bpmn-import-v0.1`
**G2 commit:** `694156f555e5b3f34b51447318b55ef4891608dc`

## Acceptance evidence

| G3 requirement | Evidence | Result |
|---|---|---|
| Deterministic candidate engine | `bpmn-feoa-mapper.mjs` and repeated-import tests | Passed |
| Complete candidate trace | Source hash, BPMN ID/type, rule, related IDs, candidate ID | Passed |
| Process/participant/lane/task mappings | Rules BPMN-MAP-001 through 004 | Passed |
| Transition/handoff mappings | Rules BPMN-MAP-005 and 006 | Passed |
| Technical-capability boundary | Rule BPMN-MAP-007 | Service task remains non-AI, authority unresolved |
| Gateway distinction | Rules BPMN-MAP-008 and 009 | Decision and synchronization candidates remain distinct |
| Recovery/data/deferred mappings | Rules BPMN-MAP-010 through 012 | Passed |
| No consequential inference | Negative field tests and mandatory qualification flags | Passed |
| No canonical mutation | Canonical workspace before/after comparison | Passed |
| Rejected/error source behavior | Duplicate and dangling-reference fixtures | Passed |
| Schema validation | Nine mapped fixture outputs | Passed against Draft 2020-12 schema |
| Regression | Full Node suite | 92 passed, 0 failed |

## Honest limits

- G3 proves the behavior of the declared mapping rules against controlled fixtures. It does not prove that a candidate is correct for a particular organization or that the profile covers every BPMN construct.
- No candidate has been reviewed, accepted, revised, rejected, or committed through a user workflow.
- No diagram, source label, extension, or candidate is rendered in the UI at G3.
- No operational, compliance, effectiveness, federation, economic, or AI-suitability conclusion is produced.
- Independent security and specialist review remain open for G5.

## Gate

`G3 — MAPPING ACCEPTED`

Permitted next action: implement WP-07 through WP-09—the local review workspace, optional viewer only if separately justified, and deterministic reports/exports—then stop at G4 for end-to-end demonstrator review.
