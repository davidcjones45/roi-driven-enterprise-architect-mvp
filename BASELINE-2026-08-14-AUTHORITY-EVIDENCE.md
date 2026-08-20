# ROI-EA/ERIR Integrated Authority Evidence Baseline v0.2

**Date:** 2026-08-14  
**Purpose:** Validated pre-Agentic-Process-Design baseline. This is a local, reproducible preservation point for the ROI-EA authority/evidence slice and its separately maintained ERIR regression reference.

## Acceptance results

| Query | Result |
| --- | --- |
| Q1 — Allowed actions | PASS |
| Q2 — Authorizer | PASS |
| Q3 — Authorization evidence | PASS |
| Q4 — Obligations / risks / controls | PASS |
| Q5 — Causes of authority change | PASS |
| Q6 — Actions relying on expiring evidence | PASS |
| Q7 — Impact of revocation | PASS |
| Q8 — Regulatory changes affecting active authority | PASS |

## Automated regression results

- ROI-EA: **9 passed / 0 failed** — eight Q1–Q8 acceptance tests plus the pre-existing authority regression.
- ERIR: **26 passed / 0 failed**.

## Q5/Q6 corrections

- **Q5:** local monitoring observations can be recorded and lifecycle decisions retain `triggeringObservationIds`, creating explicit observation → decision causality.
- **Q6:** evidence requirements identify their applicable action IDs; legacy records default to all permitted actions. Authority exception output identifies the affected actions.

## ROI-EA remediation files

- `authority-model.mjs`
- `app.js`
- `index.html`
- `authority-acceptance-q1-q8.test.mjs`

## ERIR status

ERIR was regression-tested but not intentionally modified for this baseline. The separately maintained checkout was on branch `main` at `ad6c2d548c281bba3db51ac046a0632feb8bfa8f` and contained pre-existing unrelated dirty files at freeze time. Those files are not part of this baseline and were not staged, committed, reset, deleted, or overwritten.

## Reproduction

### ROI-EA

```powershell
$node='C:\Users\david\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
& $node --check app.js
& $node --check authority-model.mjs
& $node --test authority-envelope.test.mjs authority-acceptance-q1-q8.test.mjs
```

### ERIR

```powershell
$env:PYTHONPATH='src'
& 'C:\Users\david\Documents\Codex\2026-08-14\notion-plugin-notion-openai-curated-remote-2\work\erir-test-venv\Scripts\python.exe' -m pytest --basetemp 'C:\Users\david\Documents\Codex\2026-08-14\notion-plugin-notion-openai-curated-remote-2\work\erir-pytest-freeze-20260814-01' -p no:cacheprovider
```

The explicit `--basetemp` is required in this environment because the default Windows temporary directory is not writable from the test sandbox.

## Known limitations

This local MVP remains decision support only. It does not provide runtime authorization enforcement, automated legal applicability determination, compliance certification, external synchronization, production tenancy/security, or automatic regulatory-change revocation. ERIR remains authoritative for regulatory records and evidence artifacts. The added traceability does not prove organizational authority, evidence sufficiency, control effectiveness, or production readiness.

## Next planned increment

**Product design for the minimum end-to-end AI implementation engagement, followed—if approved—by Agentic Process Design + Authority Engineering.**
