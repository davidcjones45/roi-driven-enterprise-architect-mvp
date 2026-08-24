# BPMN Parser Bundle Provenance

**Bundle:** `bpmn-moddle-10.1.0.bundle.mjs`
**SHA-256:** `9d77bba092d062d9e457a4430e17233473cd368ff16e4626eaf2fde70a5d45ce`
**Generated:** 2026-08-23 in an isolated temporary build directory
**Runtime used for final verification:** Node.js 24.19.0

The bundle was generated from an entry module that imports `BpmnModdle` from `bpmn-moddle` and exports a single `parseBpmnXml(xml)` function. The isolated dependency set was locked by npm before bundling. The resulting ESM artifact is checked into the static application; the browser does not retrieve parser code from a CDN.

Build tool: `esbuild` 0.28.2. Equivalent isolated build command:

```text
esbuild browser-entry.mjs --bundle --format=esm --platform=browser --minify --outfile=bpmn-moddle-10.1.0.bundle.mjs
```

Dependency versions and relationships are recorded in `bpmn-parser-sbom.spdx.json`. Applicable MIT license texts are retained in `vendor/licenses/`.

This provenance record supports reproducibility and review. It does not establish absence of vulnerabilities or universal BPMN compatibility.
