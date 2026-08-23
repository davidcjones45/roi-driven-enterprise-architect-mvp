# BPMN Import G2 Readiness Record

**Decision date:** 2026-08-23
**Branch:** `feature/bpmn-import-v0.1`
**G1 commit:** `5517c45b042c71a3c53b6030994513087b0e21b8`

## Acceptance evidence

| G2 requirement | Evidence | Result |
|---|---|---|
| Secure local intake | Extension/media, UTF-8, byte, XML declaration, depth/count/value checks | Passed |
| No external retrieval | DTD/entity, processing-instruction, and remote-resource fixtures | Passed; rejected before parser invocation |
| Standards-aware parse | Vendored `bpmn-moddle` 10.1.0 ESM bundle | Passed |
| Parser integrity | Bundle SHA-256 `9d77bba092d062d9e457a4430e17233473cd368ff16e4626eaf2fde70a5d45ce` | Verified |
| Dependency record | SPDX 2.3 SBOM plus five retained MIT license texts | Present and JSON-valid |
| Normalized contract | Draft 2020-12 schema and runtime assertions | Schema compiled successfully with AJV |
| Core BPMN structures | Processes, collaborations, participants, nested lanes, task subtypes, subprocess/call activity, events, gateways, flows, data, DI | Passed |
| Deferred content | Conversation, choreography, unknown extension, synthetic vendor dialect | Preserved/reported; no mapping |
| Structural defects | Duplicate IDs, dangling references, malformed XML, isolated nodes | Deterministic diagnostics; no acceptance |
| Idempotence | Deterministic projection across distinct import events | Passed |
| Provenance mutation | Changed bytes produce changed SHA-256 and separate import event | Passed |
| North Star compatibility | Existing mortgage BPMN through standards-aware adapter | 14 flow nodes, 13 sequence flows, zero diagnostics |
| Fixture provenance | Twelve retained synthetic files plus generated hostile/limit cases | SHA-256 manifest verified |
| Full regression | Node test suite | 83 passed, 0 failed |

## Limitations and open work

- G2 does not establish universal BPMN 2.0 interoperability. Coverage is the declared v0.1 profile and controlled fixtures.
- The XML safety scanner and dependency audit reduce identified risks; they do not prove the absence of every parser or browser vulnerability.
- Mapping candidates are deliberately empty. FEOA mapping and semantic non-inference tests belong to G3.
- Review UI, canonical commit, diagram viewer, reports, visual QA, deployment, push, and merge remain unauthorized.
- No server persistence, customer data, external model call, remote content retrieval, or telemetry was introduced.

## Gate

`G2 — PARSER ACCEPTED`

Permitted next action: implement WP-06 deterministic FEOA mapping candidates and stop at G3 for proof that no authority, accountability, acceptance, membership, compliance, or AI inference occurs.
