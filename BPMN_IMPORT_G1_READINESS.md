# BPMN Import G1 Readiness Record

**Decision date:** 2026-08-23  
**Branch:** `feature/bpmn-import-v0.1`  
**G0 commit:** `f4116f60cabce38df2cfbde7227ee3f697ab760c`

## Required evidence

| G1 requirement | Evidence | Result |
|---|---|---|
| Supported profile | `docs/BPMN_IMPORT_G1_ARCHITECTURE_DECISION.md` | Defined with explicit mapped and deferred constructs |
| Parser decision | `bpmn-moddle` 10.1.0 behind an ROI-EA adapter | Approved |
| Dependency/license/SBOM decision | Exact production dependency set and licenses recorded | MIT chain; implementation lock and license retention required |
| Browser/static packaging feasibility | Isolated minified ESM bundle, 69,255 bytes | Feasible; production packaging remains G2 work |
| Controlled fixture compatibility | North Star mortgage BPMN parsed with zero warnings | Passed |
| Extension preservation | AIHS attributes preserved inertly as `$attrs` | Passed |
| Vulnerability observation | `npm audit --omit=dev`, 2026-08-23 | Zero known production vulnerabilities reported; not a guarantee |
| XML security limits | G1 architecture decision | Defined; enforcement remains WP-03/G2 work |
| Normalized schema | `schemas/bpmn-import-model-v0.1.schema.json` | Valid Draft 2020-12 schema under AJV compilation |
| Fixture inventory | `docs/BPMN_IMPORT_G1_FIXTURE_INVENTORY.md` | Twenty scenarios specified; fixture files and snapshots remain G2 implementation work |
| Regression baseline | Node test suite | 62 passed, 0 failed |

## Boundaries

- No production dependency or parser bundle has been added to the public application.
- No existing regular-expression importer has been removed or represented as standards-complete.
- No BPMN file has been treated as proof of operating reality, authorization, compliance, effectiveness, federation, or AI suitability.
- No remote fetch, push, merge, pull request, deployment, or default-branch change is authorized or performed by G1.
- The security limits, normalizer, structural validator, hostile fixtures, and browser integration must pass G2 before the standards-aware parser can replace or broaden existing behavior.

## Gate

`G1 — DESIGN READY`

Permitted next action: implement WP-03 through WP-05 on the controlled branch and stop at G2 for parser/security acceptance.
