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

### Verified implementation — October 11, 2026

- Focused Node tests: 13/13 passed. GitHub Actions full Node suite: 702/702 passed, zero failures/skips. Python unittest: 11/11 passed.
- Complete Chromium smoke passed on implementation commit `3012ff21530697a3e936fa31994df112f3d7f194`: synthetic reviews, native projection, cancellation/confirmation, transferred-delay analysis, JSON/HTML downloads and escaping, reload, source-revision invalidation, navigation, mobile overflow, corrupt-storage protection, unrelated-data preservation and no page runtime errors.
- Evidence: [successful CI run](https://github.com/davidcjones45/roi-driven-enterprise-architect-mvp/actions/runs/38152186397). Its artifact contains desktop/mobile screenshots, exported JSON and HTML, and Node/Python/browser/server logs. Artifacts are retained for 14 days.
- `.github/workflows/logistics-browser.yml` runs on main and implementation-branch pushes, main-targeting pull requests and manual dispatch. It pins Playwright package and official preinstalled-browser image to 1.62.1, serves the repository on loopback, uses isolated synthetic browser contexts and retains failure diagnostics.
- Browser testing exposed invalid native architecture status and numeric field mappings. The adapter now uses Proposed status and supported categories. Unknown cost/benefit/feasibility/risk inputs stay blank; qualitative descriptions remain in diagnosticAssessment metadata and the diagnostic export. A reviewed synthetic intervention does not establish native architecture approval.
- Local browser installation remains blocked: the Chromium download returned HTTP 200 with a 195-byte HTML Site Unavailable response, which the downloader attempted to extract as ZIP. CI avoids that local download path. The hosted Vercel preview remained behind its sign-in wall; CI tests the application on localhost and does not verify hosted authentication.
- No merge or production promotion was performed. Client operational evidence and pilot outcomes remain required.

### Release-readiness remediation — October 13, 2026

- Missing/blank order or approval revisions yield UNKNOWN readiness. Reopening after a historical snapshot requires fresh reconciliation, snapshot and human release evidence as of the evaluated timestamp; historical release events are retained.
- New reviews link to their accepted evidence/finding/decision record IDs. Re-review invalidates dependent effective records without deleting history. Legacy reviews without these links require reconfirmation before native handoff. Prior native projections remain historical and require manual applicability review.
- Customer receipt deterioration is WORSENED independently of gate timing. Repeated or out-of-order handoffs yield unknown acknowledgement/escalation until episodes are reconstructed.
- Added five focused regressions and a browser regression for same-revision finding changes blocking handoff until decision reconfirmation. Local validation: 18/18 focused, 707/707 full Node and 11/11 Python tests; syntax and diff checks pass. Browser CI on the remediation head must be checked separately; earlier browser evidence applies only to the earlier head. Vercel hosted authentication/runtime remains unverified.
