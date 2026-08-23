# BPMN Import G2 Implementation Record

**Date:** 2026-08-23
**Branch:** `feature/bpmn-import-v0.1`
**G1 baseline:** `5517c45b042c71a3c53b6030994513087b0e21b8`
**Scope:** WP-03 secure intake, WP-04 parser/normalizer, and WP-05 structural validation only

## Implemented boundary

The single supported G2 pipeline is `parseAndValidateBpmn()` in `bpmn-import-pipeline.mjs`. It accepts browser-local bytes or text, applies the safety gate, invokes the vendored `bpmn-moddle` adapter, creates a normalized import record, and applies structural validation.

The pipeline returns only `STAGED` or `REJECTED` import records. It does not write canonical FEOA records, create mapping candidates, render imported markup, execute BPMN, retrieve remote content, transmit source content, or alter the existing public interface.

## Components

| Component | Controlled responsibility |
|---|---|
| `bpmn-parser-adapter.mjs` | File/encoding checks, XML safety scan, SHA-256, `bpmn-moddle` invocation, deterministic normalization, parser diagnostics |
| `bpmn-structural-validator.mjs` | Unresolved-reference and deterministically isolated-node diagnostics |
| `bpmn-import-model.mjs` | Limits, normalized-model assertions, stable JSON, semantic deterministic projection |
| `schemas/bpmn-import-model-v0.1.schema.json` | Machine-readable normalized import contract |
| `vendor/bpmn-moddle-10.1.0.bundle.mjs` | Reviewed static ESM parser bundle; no CDN loading |
| `vendor/bpmn-parser-sbom.spdx.json` | SPDX 2.3 dependency inventory |
| `bpmn-fixtures/` | Synthetic valid, edge, deferred, vendor-dialect, and hostile inputs with SHA-256 manifest |

## Enforced intake limits

- `.bpmn` and `.xml` filenames only.
- XML media types only when a media type is supplied.
- UTF-8 input only; maximum 250,000 bytes.
- Maximum depth 64, elements 10,000, attributes 50,000, individual text/attribute value 32,768 characters, retained diagnostics 500.
- DTD/entity declarations rejected.
- Non-declaration processing instructions rejected.
- Remote `href`, `src`, `location`, and `schemaLocation` resources rejected; nothing is retrieved.
- Unknown extension content remains inert and is reported.

These are product limits for v0.1, not universal BPMN requirements.

## Structural and semantic boundaries

- Exact BPMN types and supported references are retained.
- Duplicate IDs fail deterministically.
- Dangling references remain staged with explicit error diagnostics and cannot become accepted records.
- Conversation and choreography structures can be parsed but remain `PRESERVED_UNMAPPED` for v0.1.
- BPMN Diagram Interchange is preserved as rendering metadata only.
- Embedded script-task text and vendor extensions are data; the application does not execute them.
- Import success does not prove operating truth, authority, accountability, acceptance, commitment, federation membership, compliance, effectiveness, economic value, or AI suitability.

## Determinism rule

The import event timestamp is intentionally retained as provenance and therefore changes between import events. `deterministicImportProjection()` excludes only that volatile event metadata while retaining source hash, parser version, mapping version, definitions, elements, relationships, diagnostics, candidates, and status. Identical bytes and versions must produce an identical deterministic projection.

## Deferred by the workplan

FEOA candidate mapping, candidate disposition history, explicit canonical commit, review UI, report generation, diagram viewing, deployment, push, and merge remain outside G2.
