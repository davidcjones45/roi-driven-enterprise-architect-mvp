# Forms Analysis v1

Forms is a first-class, browser-local workspace in the existing ROI-EA application. It supports **Import → Verify Structure → Analyze → Recommend → Decide / Export**. It is a decision-support capability, not a form execution engine or an operational authorization system.

## Using the workflow

1. Select **Forms** in the workspace switcher. Create a form manually or paste field labels, one per line. A line beginning with `# ` starts a section. No field type, required status or business rule is guessed from the label.
2. In **Verify Structure**, select each field, edit its structure and justification, and save. Sections can be created or renamed. Record a reviewer and explicitly confirm the current revision. Unknown values can remain unknown.
3. In **Analyze**, run the quick scan or record a practitioner finding. Select a field on the left to examine it on the right. Whole-form analysis summarizes findings across seven lenses. The three depth settings use the same records:
   - Quick Scan: field meaning, justification, recorded reuse hypotheses and findings.
   - Modernization Analysis: rules, downstream use, approvals and system dependencies.
   - Architecture Analysis: additional links to existing architecture graph objects.
4. In **Recommend**, review or create granular treatments connected to findings. Record rationale, evidence, expected benefit, dependencies, confidence and the proposed specification.
5. Record **Accepted**, **Rejected**, **Modified** or **Deferred**, with reviewer, rationale and explicit confirmation. Modified decisions retain the original recommendation. Approved changes other than retain/remove/human-review require a concrete specification. Merge requires a surviving, different target field.
6. **Decide / Export** compares current fields with the approved future specification. Download the complete JSON analysis or a standalone printable HTML report. Use browser print for PDF.

**AI proposes. Evidence explains. Human approves.** This release has no AI/model calls. Suggestions are deterministic heuristics or practitioner observations. User-entered evidence is not independently authenticated. Unknown justification never automatically means unnecessary. A regulatory category never establishes legal applicability or a regulatory obligation.

## Implementation and reuse

The repository is a static HTML/CSS application using ES modules, not a framework/bundler application. Forms follows its existing module pattern and sidebar routing. It reuses the existing visual variables, cards, status pills, workspace shell and guarded-storage implementation. Existing Node built-in tests and Python unittest suites remain the validation strategy. No application dependencies were added.

- `forms-analysis-model.mjs`: records, verification, revision invalidation, seven analysis lenses, recommendations, decisions and future-state/export derivation.
- `forms-analysis-store.mjs`: `createGuardedStore` adapter using `roi-ea-forms-analysis-v1`. Corrupt records remain protected, failed saves do not become in-memory successes, and optimistic same-browser conflict detection prevents stale-tab overwrites.
- `forms-analysis-ui.mjs` and `forms-analysis.css`: workspace, side-by-side field analysis, progressive disclosure, confirmation, reviewed recovery restore/export and HTML report. Unsaved edits require a discard confirmation when navigating away.
- `forms-analysis-bridge.mjs`: explicit, noncanonical projection into the existing modernization dependency graph. Forms use `resource` nodes and fields use `data` nodes. Relationships use existing graph types. The adapter preserves unrelated graph content and marks new edges `Unreviewed`. It does not invent CIF relationships or create authority records.
- `forms-analysis-fixture.mjs`: fictional equipment-service request. Includes repeated customer data, accepted prefill, conditional access information, fictional control evidence, supervisor bottleneck and deferred review.
- `app.js` / `index.html`: minimal integration with existing navigation. ROI-only draft/recovery controls and operating-cycle navigation are hidden only while Forms is active because Forms has its own storage and workflow. Existing workspaces remain unchanged.

## Persistence and decision semantics

Schema version 1 stores each form with sections, fields, relationships, findings, recommendations, verification events and append-only decision events. Facts retain entry provenance. Saved edits to metadata or fields create a new revision and require re-verification. Past findings, recommendations and decisions remain in the export but cannot affect the new future state. Recommendations retain current-field snapshots.

One effective accepted/modified recommendation per field prevents ambiguous overlapping changes. Defer the existing approved treatment before approving a replacement. This is intentionally conservative. Form-level workflow recommendations become implementation backlog items rather than fabricated field transformations. Prefill, derivation, lookup, automation and routing become approved specifications, not executable integrations. Rename, clarification, validation, conditional logic and structured-choice changes appear in the future field specification. Removal and merge are separately retained for traceability.

Forms links target objects already available through `buildDependencyGraph` in Application Modernization. Users record evidence and explicitly project links. Projection is idempotent for a given relationship ID and preserves revision-qualified history. Older projections require review in the graph after a form changes. No two-store atomic transaction is implied: recording a relationship and projecting it are separate explicit actions.

## Outputs

Analysis JSON includes form inventory, field dictionary, findings register, recommendations with effective status, complete decision history, accepted-decision register, future fields and removals, business rules, integration requirements, approved modernization backlog and dependency relationships. The printable report summarizes these records with escaped user content. Forms recovery export returns the original stored data, including unreadable data when available, for manual reconciliation.

## Reviewed recovery restore

Select **Restore Forms recovery**, paste the contents of `forms-recovery.json`, and select **Review recovery**. The preview lists each form's name, ID, revision, sections, fields, findings, recommendations, verifications, relationships and decision-event counts. Check the explicit confirmation and select **Confirm restore**, or cancel without writing. Existing unsaved edits retain the discard gate before entering restore.

Only the version 1 Forms recovery workspace (`schemaVersion` and `forms`) is accepted, up to 10,000,000 characters. Analysis JSON, ROI backups, malformed JSON, unsupported versions/properties, missing identities, invalid enum values, duplicate identities and invalid model lineage are rejected before any write. Normalization trims supported text and fills existing model defaults; it cannot manufacture missing identities/revisions or silently coerce invalid supplied values. This uses the existing Forms model's structural validation, not authentication of supplied evidence or reviewer identities.

Restore adds all reviewed forms in one guarded write to the Forms key. Any matching existing form ID blocks the whole operation; it never replaces or merges a form's history. Changes after review, competing browser writes, protected unreadable storage and write failures block restore. In-memory data advances only after a successful write. Canceling or reviewing never writes. Unrelated storage, including the modernization graph, is untouched; restored relationships are not projected automatically. Saved revisions and decision history retain their existing semantics. Storage conflict detection remains optimistic, not a multi-tab transaction lock. To retry a failed confirmation, cancel and review again.

## Boundaries

- Supported import: manual fields and plain pasted text (100,000 characters, maximum 500 fields). The text parser is an explicit adapter boundary in `createForm`; additional adapters should return unverified structure and retain source provenance.
- Unsupported: direct PDF/DOCX/HTML/image ingestion, OCR, general AI execution, semantic cross-form matching, automatic regulatory research, production system changes and workflow execution.
- Scan rules flag duplicate labels, missing instructions, typed-field validation gaps, long text, recorded prefill/derivation/conditional opportunities, manual-rule automation, approvals, sources/dependencies, control evidence gaps and unknown justification. More than 30 fields triggers a review prompt, not a finding that the form is excessive. These are transparent heuristics, not a completeness or risk score.
- Storage is local to one browser/profile and origin. No authentication, tenancy, server backup, tamper-proof audit, encryption or multi-user locking is added. Reviewer names are self-reported. Recovery restore is add-only and requires review and explicit confirmation; matching form IDs block the entire restore. Protected corrupt storage must still be manually reconciled.
- Forms exports are separate from the ROI assessment's existing executive dossier because they are a separate workspace, consistent with the existing modernization exports.
- Direct hard deletion is not offered. Preserve current-state evidence and use human decisions to specify removal in the future state.
- Classification, risk assessment, authorization and value judgment remain distinct. This implementation does not make production-readiness or compliance claims.

## Validation

Run from the repository root with a current Node runtime:

```text
node --test forms-analysis.test.mjs
node --test
python -m unittest discover -p "*_test.py"
node --check app.js
node --check forms-analysis-ui.mjs
git diff --check
```

The application has no package manifest, build command, TypeScript configuration or configured linter. Validate module syntax, browser imports and behavior instead of claiming nonexistent build/type/lint scripts passed.

The optional browser smoke test is `scripts/forms-browser-smoke.mjs`. It requires Playwright in the development environment (not an application dependency) and a running copy of `serve-roi-ea.py`. Set `FAC_BASE_URL` to the server URL (default for the test is `http://127.0.0.1:8878`). Optional `FAC_PLAYWRIGHT_MODULE` identifies a module URL when Playwright is supplied by a bundled runtime. `FAC_BROWSER_EXECUTABLE` selects an installed browser. `FAC_TEST_ARTIFACTS` selects a screenshot/download directory, otherwise the system temporary directory is used.

```text
node scripts/forms-browser-smoke.mjs
```

The browser test uses isolated contexts, never the user's browser profile. It checks empty state, import, edit, verification, scan, human acceptance, future-state derivation, JSON download, reload, stale-decision protection, fictional example, graph projection, mobile overflow, unsaved-navigation cancellation, malformed storage and navigation back to ROI-EA. It fails on browser runtime exceptions.

Five failures were reproduced in the untouched base `4d863a085663cf6b884af6be4d8f97e6509c6f18` as well as the feature branch: consulting hidden-navigation expectation, continuity CIF boundary wording expectation, dependency concentration candidate, legacy Pilot navigation label, and CIF registry byte hash. They are not hidden or weakened by this change. The registry test is byte-sensitive on Windows checkouts. This is historical PR #55 verification context. PR #56 merged on October 6, resolving those five baseline failures without runtime changes; its recorded results were 689/689 Node and 11/11 Python tests passing. The former baseline blocker is resolved.

## Highest-value follow-on work

Validate the practitioner workflow with authorized forms, then refine low-value scan prompts. Reviewed backup restore is now available. Add cross-form comparison before expanding file ingestion. Any model adapter must preserve unverified provenance and the existing human decision gate.


### Recorded verification results

Historical PR #55 results, using the bundled Node 24 runtime and Python runtime on Windows: focused Forms suite 17/17 passed; full JavaScript suite 684/689 passed with the same five failures as the untouched base (667/672); Python unittest 11/11 passed; optional Chrome browser smoke passed at 1440px and 390px; module syntax and staged diff checks passed. No build, lint or TypeScript scripts exist in this repository. These checks establish the tested behavior, not production readiness.


### Reviewed recovery increment verification (October 7, 2026)

On base `1936775a9bcfea2ec956a8275bd60cbdf4d74ec2` (merged PR #56), Node 24.19.0: focused Forms suite **21/21 passed**, full Node suite **693/693 passed**, Python unittest **11/11 passed**. Syntax checks passed for `app.js`, the Forms UI/store and the browser smoke script; `git diff --check` passed.

The browser smoke script now includes real recovery download, preview without writes, cancellation, confirmation gate, successful restore/reload, duplicate IDs, malformed/non-recovery input, competing writes, unrelated storage preservation and protected corrupt storage. **These added browser scenarios have not run successfully in this environment**: Playwright launch failed because Chromium was absent; attempted installation failed with an invalid ZIP archive. Browser validation remains required before release acceptance. Existing historical browser results above do not validate this new restore increment.
