# BPMN Import G5 Release Review

**Baseline:** G4 commit `103de396bf964ef4cba12794077af6a7bdc75675`  
**Review date:** 2026-08-23  
**Gate:** `G5 REQUIRES BOUNDED BROWSER VISUAL QA`

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

## Outstanding acceptance item

The local application server started successfully, but the available cloud-browser environment rejected `http://127.0.0.1:8766/index.html` with `ERR_BLOCKED_BY_CLIENT`. Static DOM assertions and automated tests passed, but they are not represented as visual inspection.

To close G5, inspect the BPMN review surface in a local browser served from `http://127.0.0.1:8766/` and verify: staging feedback, candidate table layout, reviewer fields, confirmation enable/clear behavior, commit button state, normalized/report downloads, and narrow/mobile layout. Record the browser/version, viewport(s), observed result, and any defect disposition.

No merge, push, deployment, or production release is authorized by this review.
