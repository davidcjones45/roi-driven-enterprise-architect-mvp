# BPMN G2 Fixture Corpus

These files are synthetic test inputs for `ROI-EA-BPMN-IMPORT-V0.1`. They contain no customer, applicant, client, ClearWellness, or production-bank data.

| Fixture | Purpose | Expected result |
|---|---|---|
| `minimal-valid.bpmn` | Basic process | Staged import, no error |
| `collaboration-lanes.bpmn` | Participants, message flow, lane allocation | Preserve structures without authority inference |
| `core-constructs.bpmn` | Task subtypes, gateway, boundary event, subprocess, data object | Preserve exact BPMN types and references |
| `unknown-extension.bpmn` | Unknown namespace attributes and element | Preserve inertly/report; never execute |
| `diagram-interchange.bpmn` | BPMN DI shape and bounds | Preserve as rendering metadata only |
| `deferred-and-vendor.bpmn` | Conversation plus synthetic vendor attributes | Preserve/report; mapping deferred and never execute |
| `choreography-deferred.bpmn` | Recognized choreography structures | Parse and preserve; v0.1 FEOA mapping remains deferred |
| `duplicate-id.bpmn` | Duplicate identifiers | Reject deterministically |
| `dangling-reference.bpmn` | Missing sequence-flow endpoint | Stage with complete parser/validation diagnostic |
| `doctype-entity.xml` | DTD/entity declaration | Reject before parser invocation |
| `remote-import.bpmn` | Remote import location | Reject before parser invocation; never retrieve |
| `malformed.xml` | Misnested XML | Reject safely |

Resource-limit, invalid-encoding, processing-instruction, idempotence, provenance-mutation, and regression cases are generated deterministically in the test suite so large hostile payloads are not retained in the repository.
