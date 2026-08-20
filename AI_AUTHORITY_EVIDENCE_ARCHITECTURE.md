# Queryable AI Authority & Evidence Vertical Slice

## Why this capability exists

An AI pilot can be bounded in prose yet still fail the practical governance question: *why is this system allowed to perform this action, under these conditions, and what would cause reconsideration?* This local-only slice makes that question inspectable without representing legal approval, control effectiveness, runtime enforcement, or production governance.

ROI-EA is the decision context: business capability, AI system/use case, agent where applicable, action/resource boundary, authority decision, inventory context, and pilot/release context. ERIR remains authoritative for regulatory sources, normalized obligations, applicability assessments, controls, evidence artifacts, and their reconstruction. ROI-EA stores typed references to ERIR IDs; it does not duplicate ERIR records.

No ERIR schema change is required for this local vertical slice.

## Local authority model

Each Authority Envelope has stable local identifiers for the AI system/use case, optional agent, permitted actions, and resources. Its typed relationships are deliberately limited to:

- `supports_capability`
- `permits_action`
- `affects_resource`
- `depends_on_inventory`
- `regulatory_context`
- `constrained_by_control`
- `supported_by_evidence`

Every relationship records source/type, target/type, resolution state, and optional context. A missing local inventory or external ERIR reference stays `unresolved`; it is never silently accepted.

Evidence support is separate from authorization. A requirement records what must be demonstrated, the acceptance criterion, artifact references, assessment state, validity window, reviewer, and review authority. An ERIR `EVD-*` identifier merely identifies an ERIR record. It is not proof of accepted evidence, legal applicability, or effective control.

Lifecycle history is append-only in the local working record. Each entry records decision type, declared decision authority, effective date, rationale, resulting state, and supporting references. Stored human names document a declared authority; they do not prove organizational authorization.

## Deterministic effective-state rules

For a supplied date, ROI-EA calculates rather than repeats the stored status:

1. Before the envelope effective date: **Not yet effective**.
2. A recorded revoke or suspend decision effective on or before the date: **Revoked** or **Suspended**.
3. Any unresolved required reference, unaccepted evidence, or evidence outside its validity window: **Evidence unresolved** or **Review required**.
4. After the envelope review/expiry date: **Review required**.
5. Only after the date is effective, required references are resolved, and required evidence is accepted and valid: **Effective — controlled authority**.

The Northstar example’s October 20, 2026 effective date therefore cannot be treated as active on August 13, 2026. Its ERIR example records remain `potentially_applies`/`draft`, `designed`, and `not_assessed`; they do not establish final applicability, accepted evidence, or compliance.

## Views and traceability

The Authority view provides two deterministic local queries:

1. **Active authority as of date** shows the stored status separately from calculated effective state, along with actions, resources, scope, declared authority, evidence state, unresolved references, and review date.
2. **ERIR reference impact** finds directly linked envelopes and, for the supported illustrative ERIR trace graph, transitively affected envelopes. Results use “Potential impact identified. Review required.” They never label an envelope noncompliant or revoke it automatically.

The ERIR handoff now exports only the typed ROI-EA-to-ERIR reference relationships needed for review; it does not attempt to write ERIR records.

## Compatibility and non-goals

Existing browser-local data remains readable. On save or render, a legacy envelope is normalized into typed local identifiers and relationships; no server migration or ERIR schema change is required. This is not automated legal applicability determination, compliance certification, automatic expansion/revocation, runtime policy enforcement, quantitative ARE scoring, external synchronization, authentication, multi-tenancy, or a graph database.

The remaining limitation is deliberate: the local MVP can inspect references and show a supported illustrative transitive ERIR path, but it does not subscribe to a live ERIR change feed or validate organizational authorization outside the saved local decision record.

## Local authority portfolio and evidence exceptions

Authority Envelopes are now retained as a browser-local collection. A legacy single `authorityEnvelope` is non-destructively placed into the collection when it is read; the legacy field remains for compatibility. The Authority form can create, select, edit, and retain multiple envelopes by stable ID.

`getAuthorityPortfolio(asOfDate)` uses the same effective-state function described above for every local envelope. `getAuthorityExceptions(asOfDate)` returns envelopes requiring governance attention, including a precise evidence or review reason. `getActiveAuthorityEvidenceExceptions(asOfDate)` is deliberately narrower: it returns only envelopes that remain **Effective — controlled authority** and whose accepted evidence or envelope review date is approaching expiration. An envelope with missing, rejected, expired, superseded, or unresolved evidence is instead calculated as **Evidence unresolved** and appears in the broader attention view, not as an active authority.

The attention window is an explicit, configurable local rule with a default of 30 days from the selected as-of date. It flags evidence validity or envelope review dates in that window; it does not calculate a risk score or change any authority automatically. Portfolio demo records are illustrative local data only and do not represent deployments, accepted controls, or regulatory determinations.
