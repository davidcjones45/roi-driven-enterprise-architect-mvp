# North Star Mortgage BPMN fixture v0.1

This fixture is the first controlled input for evaluating future BPMN ingestion and bounded-agentic-AI opportunity analysis in ROI-EA. It is intentionally analytical and non-executable.

## Files

- `assets/North-Star-Mortgage-Workflow-v0.1.bpmn` - synthetic BPMN 2.0 XML fixture.
- `mortgage-bpmn.mjs` - fail-closed importer for the explicitly supported subset and candidate-analysis function.
- `mortgage-bpmn.test.mjs` - acceptance and negative tests.

## Supported subset

The importer recognizes one non-executable process containing start events, end events, user tasks, manual tasks, service tasks, business-rule tasks, exclusive gateways, and sequence flows. It verifies identifiers, references, start/end presence, and graph reachability. It rejects XML entities, DOCTYPE declarations, script tasks, call activities, multiple processes, executable processes, duplicate identifiers, dangling references, and unreachable nodes.

This is not a general BPMN validator and does not claim conformance of arbitrary BPMN files. The controlled profile is named `AIHS-BPMN-SUBSET-V0.1`.

The governing public specification is the [Object Management Group BPMN 2.0.2 specification](https://www.omg.org/spec/BPMN/2.0.2/). The fixture uses only a limited subset of that specification.

## Bounded-AI analysis

Only service tasks and business-rule tasks explicitly marked `aihs:aiCandidate="bounded-support"` are evaluated as prospective candidates. Each candidate must state a permitted purpose and `aihs:authority="none"`. Decision and action language is rejected.

The mortgage fixture identifies four prospective support points:

1. Evidence-gap detection.
2. Deterministic calculation.
3. Traceable comparison with fictional policy bands.
4. Evidence and calculation trace preparation.

Qualified review and accountable disposition remain human tasks. Gateways do not acquire AI authority. Candidate identification does not establish process validity, legal compliance, effectiveness, suitability, approval, implementation, or authority.

## Acceptance criteria

- The fixture imports deterministically and remains `isExecutable="false"`.
- All flow nodes are reachable from the single start event.
- Every sequence-flow reference resolves.
- Four bounded-support candidates are identified, all with no authority.
- Qualified review and disposition remain human tasks.
- Executable processes, active-content constructs, dangling references, and consequential AI candidates fail closed.
- Existing mortgage and FEOA tests remain green.
