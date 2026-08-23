# BPMN Import G5 Release Review

**Baseline:** G4 commit `103de396bf964ef4cba12794077af6a7bdc75675`
**Review date:** 2026-08-23
**Gate:** `G5 COMPLETE—BPMN IMPORT v0.1 READY FOR CONTROLLED RELEASE DECISION`

## Verified results

- Full JavaScript regression: 106 passed, 0 failed (`node --test`).
- Python origin-policy unit test: 1 passed, 0 failed (`python3 -m unittest erir_gateway_test.py`). The test uses import stubs because the default Python runtime does not include the gateway's separately declared `jsonschema` and `referencing` dependencies.
- JavaScript and Python syntax checks passed; `git diff --check` passed.
- Standards-aware dependency provenance remains byte-verified: the vendored bundle SHA-256 is `9d77bba092d062d9e457a4430e17233473cd368ff16e4626eaf2fde70a5d45ce`; retained components are `bpmn-moddle 10.1.0`, `moddle 8.2.1`, `moddle-xml 12.1.0`, `min-dash 5.1.0`, and `saxen 11.1.1`, with MIT notices retained. An official npm check showed `bpmn-moddle 10.1.0` as current on the review date. No claim of vulnerability absence is made.
- Synthetic performance checks completed well inside the controlled intake boundary: 3,000 tasks / 117,982 bytes normalized in 71.69 ms; 6,000 tasks / 237,965 bytes normalized in 159.78 ms. These are local synthetic measurements, not production performance claims.

## Security findings and dispositions

| Finding | Initial severity | Remediation | Verification |
|---|---:|---|---|
| Confirmation could remain checked after another BPMN was staged | Low | Confirmation is cleared on staging/review change and cryptographically bound to source SHA-256 plus current dispositions | Dedicated stale-binding regression passed |
| Upload limits were applied after browser file materialization; legacy parser continued after oversize detection | Medium | UI checks `File.size` before `arrayBuffer()`/`text()`; the legacy parser returns immediately on oversize | UI-order and parser regressions passed |
| XLSX decompression trusted declared size before buffering actual output | Medium | Decompression now reads incrementally, aborts on measured output bounds, verifies exact entry size, and enforces a cumulative actual-output limit | Forged central-directory size regression passed |
| Local gateway allowed opaque `null` origins to submit draft packages | Medium | CORS no longer permits `null`; OPTIONS and POST require an exact `localhost` or `127.0.0.1` origin on the gateway's configured port | Origin-policy unit test and source review passed |

The review found no open Critical or Material code defect after remediation. This is a bounded current-state review, not certification or proof that no vulnerability exists.

## Browser visual and functional QA closeout

The automated cloud-browser environment rejected localhost and was not treated as visual evidence. On 2026-08-23, the packaged G5 build was instead served locally on Windows at `http://127.0.0.1:8766/index.html` and inspected in Chrome 151 with the user present.

The initial run reused cached JavaScript from an older snapshot at the same origin. A cache-bypassing reload corrected that environmental condition; the current G5 controls then executed without a BPMN-related Console error. The only observed Console error was a missing favicon (`404`), a nonblocking cosmetic issue.

Verified results:

- Both BPMN sections, controls, status regions, tables, reviewer fields, and qualification text rendered without clipping, overlap, corruption, or unresolved placeholders at the normal desktop width and a narrower DevTools-constrained viewport.
- The legacy reference analysis produced four bounded-support candidates, preserved four human tasks, and assigned no AI authority to two gateways.
- The standards-aware reference import staged successfully and populated the review workspace.
- Review/confirmation state transitions completed: confirmation remained unavailable before complete review, became available after final dispositions, cleared when the reviewed state changed or was restaged, and permitted a separately confirmed bounded commit after reconfirmation.
- Normalized JSON and import-report exports both downloaded successfully.

No Critical or Material defect remains open. The missing favicon and slightly awkward native file-input wrapping are nonblocking cosmetic observations and do not affect the controlled BPMN workflow.

No merge, push, deployment, or production release is authorized by this review.
