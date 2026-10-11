# Synthetic CDEA outbound release diagnostic v0.1

Select **Specialist workspaces & examples → Logistics diagnostic**. Add the **primary** case. Review source evidence, reconstruct deterministic timings, record a hypothesis with evidence IDs, compare alternatives, record a separate human decision, then challenge the outcome with delegate/dock/transfer replay. Finally review the native handoff or download diagnostic JSON and a standalone printable HTML appendix.

Every case and output is synthetic. Reviewer names are self-reported; review records do not authenticate identities or authorize individual shipments. No ERP/WMS/TMS credentials, notifications, model calls or execution are present.

## Existing functionality reused

- Static ES modules and workspace shell, cards and responsive styles.
- `createGuardedStore` for protected corrupt data, quota failures and optimistic same-browser conflict detection.
- Native dependency graph node/edge types and noncanonical revision-qualified records.
- Continuity Assurance's reliance, constraint, outcome and reassessment models. Synthetic evidence remains `Assumption`; reliance cannot become unqualified real operating assurance. A synthetic constraint may be marked validated only after reviewed mechanism evidence; this does not prove a real client constraint. Native outcomes remain unresolved because a replay is not executed intervention/outcome evidence.
- Opportunity, evidence, inventory, ROI baseline, architecture alternatives, pilot charter and existing executive dossier surfaces through explicit native handoff.

## Added modules

`logistics-release-fixture.mjs` contains ten synthetic variants; `logistics-release-diagnostic.mjs` validates source, calculates event metrics, guards review revisions and compares outcomes; `logistics-release-adapter.mjs` maps allowed native records; `logistics-release-store.mjs` is the guarded local collection; `logistics-release-ui.mjs` provides review/projection/export. Test oracles live separately in `logistics-release.test.mjs`. The approved full design is in `docs/CDEA_OUTBOUND_RELEASE_DIAGNOSTIC_SPECIFICATION_V0.1.md`.

## Exact main-case results

Detection-to-reconciliation 58 min; packet-ready review queue 38 min; review service 8 min; physical-ready-to-release 57 min; physical-ready-to-gate 85 min; departure/receipt lateness 30 min. Delegate replay reduces gate elapsed time by 38 min and departure lateness by 30 min. The transferred-delay variant improves release but worsens gate elapsed by 17 min. Queue time is not labor or cash savings.

## Projection and data safety

Diagnostics use `roi-ea-logistics-release-v0.1` separately from the existing ROI and modernization keys. Source editing retains the case ID, increments revision, resets evidence review and retains earlier review history as ineffective. Raw, versioned JSON editing is for synthetic source only; it is not arbitrary ingestion or recovery restore.

The native handoff previews the current source and targets, requires explicit confirmation and blocks changed source/storage. Architecture projection is add-only, idempotent for identical records and rejects differing records with the same ID. It preserves unrelated records and unknown collections. Existing ROI opportunity/baseline/architecture/pilot work is never overwritten; a populated assessment blocks that handoff and the native seed remains available in export for manual mapping or a separate profile. Prior projected revisions remain historical records, not automatically superseded in other workspaces; review their applicability explicitly after source changes. Review changes after projection can cause a same-revision ID collision; export/manual reconciliation preserves history.

Stores are written separately; no cross-store transaction or multi-user lock exists. Each available target reports success/failure separately; a failed write never becomes an in-memory success. No automatic retry of a successful target occurs. Recovery exports raw protected data but offers no restore path. Exported data and review names are not tamper-proof audit evidence.

The native ROI baseline contains a prospective capacity estimate, not a measured labor baseline. It excludes hypothetical avoided charges until validated, includes the provisional engagement fee, and explicitly labels capacity equivalent rather than cash savings. The diagnostic appendix separates charge-verified and unverified scenarios; neither is a client observation. Pilot dates, finance owner and population baseline remain unresolved.

## Scope intentionally left for later

Minimum complete synthetic workflow uses fixtures/manual review. CSV event ingestion, production data adapters, per-episode reconstruction for ambiguous repeated events, multi-user persistence, direct live synchronization and operational action are not implemented. Reopened or ambiguous episodes remain unknown rather than invented. External pilot measurement and buyer/pricing validation remain required. No new framework, database or application dependency was added.

## Verification

```text
node --test logistics-release.test.mjs
node --test
python3 -m unittest discover -p "*_test.py"
node --check app.js
node --check logistics-release-ui.mjs
node --check scripts/logistics-browser-smoke.mjs
git diff --check
```

Optional isolated Playwright workflow: start `python3 serve-roi-ea.py`, then `node scripts/logistics-browser-smoke.mjs`. Defaults to `http://127.0.0.1:8766`; `LOG_BASE_URL`, `LOG_PLAYWRIGHT_MODULE`, `LOG_BROWSER_EXECUTABLE` and `LOG_TEST_ARTIFACTS` provide development overrides. Playwright is development tooling, not an application dependency.

October 11 initial verification: 12/12 focused Node tests passed; initial full regression 700/700 passed before the final quantity/date/constraint guard test was added; Python 11/11 passed. Local browser launch was blocked before scenarios: missing Chromium headless executable; browser installation failed with invalid/truncated ZIP archives. This is not a browser pass or production-readiness claim. Final verification is recorded below after review.
