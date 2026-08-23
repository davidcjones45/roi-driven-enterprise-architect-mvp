# BPMN Import G1 Architecture Decision

**Status:** Accepted for controlled implementation
**Decision date:** 2026-08-23
**Gate:** G1 — DESIGN READY
**Baseline:** `501ee430b90ccc3d7b757d2af52dda960a8b347a`
**Branch:** `feature/bpmn-import-v0.1`

## Decision

Use `bpmn-moddle` version `10.1.0` as the standards-aware BPMN 2.0 XML reader behind an ROI-EA-owned parser-adapter interface.

Do not use the existing regular-expression importer as the general BPMN parser. Preserve it temporarily as the controlled mortgage-subset behavior until the adapter passes G2 and regression tests. Do not use `bpmn-js` as the domain parser; evaluate its Viewer component separately at G4 only if a read-only rendered diagram materially improves review.

Do not add a root `package.json`, dependency bundle, or production import in G1. The current deployment is static. WP-04 must introduce a reproducible isolated bundle without allowing package autodetection to alter Vercel deployment behavior.

## Why this is the defensible choice

`bpmn-moddle` encapsulates the BPMN 2.0 metamodel and exposes `fromXML` and `toXML`. It is specifically intended to read and write BPMN 2.0 XML in Node.js and browsers. This is materially safer than maintaining custom namespace, inheritance, containment, extension, and reference logic with regular expressions or a generic DOM walk.

The library provides syntactic and metamodel-aware parsing. It does **not** establish that a diagram is operationally current, semantically correct for a business, compliant, effective, authorized, accepted, economically justified, suitable for federation, or suitable for AI.

## Version, license, and dependency record

Observed from the npm registry on 2026-08-23:

| Package | Version | Role | License |
|---|---:|---|---|
| `bpmn-moddle` | 10.1.0 | BPMN metamodel and XML interface | MIT |
| `moddle-xml` | 12.1.0 | Metamodel-aware XML reader/writer | MIT |
| `moddle` | 8.2.1 | Metamodel runtime | MIT |
| `min-dash` | 5.1.0 | Utility dependency | MIT |
| `saxen` | 11.1.1 | XML tokenization used by `moddle-xml` | MIT |

The exact versions above are the G1-tested set. Implementation must lock the resolved dependency graph and retain the applicable copyright and license notices. A fresh vulnerability and license review is required at G5 and whenever versions change.

The package declares Node.js `>=20.12` for Node-based use. The approved deployment path is a reviewed browser bundle; any build or test runner must nevertheless satisfy that declared engine requirement.

`bpmn-js` 18.25.1 was reviewed only as a possible future viewer. It is substantially larger and carries the bpmn.io license rather than the simple MIT declaration used by `bpmn-moddle`; it is not approved as a G1 parser dependency.

## Feasibility spike

The isolated, non-repository spike produced the following results:

- Parsed `assets/North-Star-Mortgage-Workflow-v0.1.bpmn` successfully.
- Definitions type: `bpmn:Definitions`.
- Process: `Process_NorthStarMortgage`.
- Flow nodes: 14.
- Sequence flows: 13.
- Resolved references reported by the parser: 26.
- Indexed elements: 29.
- Parser warnings: 0.
- AIHS namespace attributes remained available as inert `$attrs`; no extension execution occurred.
- A minimal browser ESM bundle containing the parser entry point was 69,255 bytes minified.
- `npm audit --omit=dev` reported zero known vulnerabilities for the installed production dependency graph on 2026-08-23.
- The existing controlled repository suite remained 62/62 passing before this decision work.

These results demonstrate technical feasibility, not production security, universal BPMN compatibility, or operational correctness.

## Parser-adapter boundary

ROI-EA will own a stable adapter with this conceptual contract:

1. Accept only a locally selected string or byte buffer that has passed the XML safety gate.
2. Call `bpmn-moddle.fromXML` within the resource and diagnostic limits.
3. Convert the returned object graph into the ROI-EA normalized import model.
4. Preserve source IDs, exact BPMN `$type`, supported attributes, inert extension attributes, relationships, warnings, parser version, mapping version, and source hash.
5. Emit diagnostics and review candidates; never write directly into canonical FEOA records.

No bpmn-moddle object may become the ROI-EA/FEOA domain model or be stored directly as an accepted record.

## XML safety limits for v0.1

The safety gate runs before `fromXML`:

| Limit/control | G1 value |
|---|---:|
| Maximum UTF-8 file size | 250,000 bytes |
| Maximum XML element depth | 64 |
| Maximum element count | 10,000 |
| Maximum attribute count | 50,000 |
| Maximum single text or attribute value | 32,768 characters |
| Maximum diagnostics retained | 500 |
| DTD and entity declarations | Reject |
| External schema, import, image, script, or URL resolution | Never perform |
| Processing instructions other than the XML declaration | Reject |
| Active HTML or extension markup rendering | Prohibit; render labels as text |

These are controlled v0.1 limits, not universal BPMN recommendations. A file that exceeds a limit fails closed with an explicit diagnostic.

## Supported profile

The v0.1 adapter will parse and inventory:

- Definitions, processes, collaborations, participants, and lane sets.
- Task subtypes, subprocesses, and call activities while preserving exact types and references.
- Start, end, intermediate, and boundary events with attached event definitions.
- Exclusive, inclusive, parallel, and event-based gateways.
- Sequence flows, message flows, associations, and selected data objects/references.
- BPMN Diagram Interchange objects for a future viewer, without treating coordinates as semantics.
- Unknown namespaces and extension attributes as inert, reported metadata.

Choreography and conversation models are parsed if recognized by the library but remain unsupported for FEOA mapping in v0.1. Executable declarations are recorded; they do not authorize execution. No workflow execution is included.

## Mandatory interpretation controls

- A BPMN participant or lane is not proof of legal identity, membership, responsibility, accountability, capacity, or authority.
- A message flow is not proof of delivery, permitted use, acceptance, or commitment.
- A gateway is not proof of a valid decision rule or decision authority.
- A service task is not necessarily AI and never confers AI action authority.
- An extension attribute is not trusted merely because the parser preserves it.
- Successful import is not validation of current operations, compliance, control effectiveness, economic value, federation suitability, or AI suitability.

## Packaging decision

WP-04 will bundle the exact parser dependency into a checked-in, versioned browser artifact using a reproducible build step. The public browser must not fetch parser code from a CDN. The source dependency and build tool remain development inputs; the static browser receives only the reviewed bundle. Source maps must not expose local paths in the public build.

The bundling arrangement must preserve the existing static Vercel behavior and pass all public-demo regression tests before G2. If this cannot be demonstrated without changing deployment assumptions, G1 must be reopened rather than silently falling back to a custom parser.

## Sources

- Object Management Group, BPMN 2.0.2 specification and machine-readable files: https://www.omg.org/spec/BPMN/2.0.2/About-BPMN
- bpmn.io, bpmn-js walkthrough describing bpmn-moddle and its `fromXML`/`toXML` API: https://bpmn.io/toolkit/bpmn-js/walkthrough/
- bpmn-io/bpmn-moddle repository: https://github.com/bpmn-io/bpmn-moddle
- npm package record: https://www.npmjs.com/package/bpmn-moddle

## Gate decision

`G1 — DESIGN READY`

Permitted next action: WP-03 through WP-05 secure intake, parser-adapter/normalizer, and structural-validation implementation. G2 remains unearned.
