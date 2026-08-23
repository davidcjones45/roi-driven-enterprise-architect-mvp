# ROI-Driven Enterprise Architect MVP

## Copyright notice

The application interface and executive-dossier export display: `© 2026 David C. Jones. All rights reserved. AI at Human Scale.` The notice identifies the claimed work; it does not expand copyright protection to ideas, methods, facts, or generic interface conventions.

This local, browser-based MVP implements paid-design-partner workflows with supporting decision controls:

1. Opportunity intake
2. Structured evidence register and traceability index
3. Decision-scoped architecture inventory (owners, lifecycle, criticality, data class, dependencies, and annual cost)
4. ROI baseline and forecast calculation
5. Agentic-risk and human-boundary assessment
6. Structured AI Authority Envelope with permitted/prohibited actions, resource/context scope, evidence references, monitoring triggers, and lifecycle decision
7. Architecture decision and alternative comparison
8. Pilot charter
9. Pilot review that distinguishes forecasts, observations, and validated results
10. Read-only Regulatory Context links to ERIR sources, obligations, applicability assessments, controls, and evidence
11. Decision-scoped Compliance Cost and Capacity model, with baseline, pilot, and target-state scenarios
12. Executive decision dossier export
13. Additive FEOA v0.2.3 workbench and domain model: progressive enrichment from opportunity through participant economics, authority/evidence constraints, counterfactual Cases 0/1/2, consolidated and risk-adjusted economics, readiness, gates, Cognitive Resilience, sensitivity, pilot observations, and a structured executive report input.
14. Controlled North Star Mortgage Reference Demonstrator v0.1: a sanitized synthetic fixture projection, deterministic DTI/LTV/reserve calculations, fictional policy comparison, evidence-gap abstention, BACRM configuration boundary, and read-only ERIR source seed. It does not make or recommend a credit decision.

See `AI_AUTHORITY_EVIDENCE_ARCHITECTURE.md` for the current-state mapping, bounded-context ownership, acceptance-query coverage, and explicit non-goals for this vertical slice.

## Run it

Open `index.html` in a modern desktop browser. The app uses browser-local storage only; it has no sign-in, shared-client workspace, regulatory-repository connector, Microsoft Planner connector, or production-security controls.

Use **Load Northstar example** to see a complete illustrative workflow. Use **Export executive dossier** to open a print-ready view, then use the browser print dialog to save a PDF.

## Optional local ERIR gateway

The Regulatory Context panel works without a gateway for locally saved links and a versioned JSON handoff. To retrieve ERIR traceability or submit an explicitly requested draft record, start the local-only gateway after installing the dependencies in an ERIR working copy:

```powershell
cd <path-to-erir-working-copy>
pip install -e ".[dev]"
<path-to-this-mvp>\start-erir-gateway.ps1 -ErirRoot <path-to-erir-working-copy>
```

The gateway listens on `127.0.0.1:8766`, reads ERIR records, validates allowed draft records against ERIR JSON Schemas, and writes draft packages plus append-only audit events under `gateway-data`. It does not modify ERIR source or reviewed records, make legal/applicability approvals, authenticate users, or provide production tenancy/security controls.

## Deliberate MVP boundaries

The application helps structure decision support. It does not make legal, financial, security, or approval decisions. Forecast benefits and activity-cost changes remain estimates until a qualified person validates the evidence and measured result. The Compliance Cost and Capacity model is not a general ledger, payroll integration, enterprise allocation engine, or financial statement.

## Validation

Run the ROI-EA suite with the bundled Node runtime (or a compatible current Node.js release):

```powershell
node --test authority-envelope.test.mjs authority-acceptance-q1-q8.test.mjs feoa-foundation.test.mjs
```

`feoa-model.mjs` is additive. It does not decide or imply authority: operational authorization remains in `authority-model.mjs` and its Authority Envelope lifecycle.

## Public Integrated Reference Demo v0.1

The Vercel deployment is a static, browser-local ROI-EA demo. It retains browser-local working data, Northstar, FEOA, Authority Envelope calculations, and dossier export. No customer data is sent to ROI-EA servers.

ERIR remains a separate, authoritative record system. The public demo calls the same-origin ROI-EA proxy at `GET /api/erir/trace?ids=...`; the proxy retrieves the bounded read-only trace from the separately deployed ERIR API. An ERIR ID is a reference, not proof of legal applicability, compliance, effective control, accepted evidence, or organizational authorization.

The proxy upstream is configured only on the ROI-EA server with `ERIR_READ_ONLY_API_ORIGIN` (HTTPS only). Browser users cannot provide or redirect the upstream. Local development remains available with `?mode=local`, which may use the existing localhost gateway. The public mode hides ERIR draft submission; the download-only ERIR handoff remains available.

Deploy ROI-EA as a Vercel project from this repository root. Deploy the ERIR repository's `feature/vercel-integrated-demo` branch as a separate Vercel project, then set its HTTPS URL as the ROI-EA project's `ERIR_READ_ONLY_API_ORIGIN` environment variable. Do not deploy `erir_gateway.py`; it is local-only and includes a local draft-writing capability.

The public demo is not authentication, tenancy, production authorization, legal advice, compliance certification, full regulatory coverage, durable customer-data storage, or a production SaaS service.

### Integrated-demo tests

```powershell
node --test authority-envelope.test.mjs authority-acceptance-q1-q8.test.mjs feoa-foundation.test.mjs feoa-acceptance.test.mjs feoa-ui-wiring.test.mjs public-demo-config.test.mjs erir-proxy.test.mjs
```

### Mortgage reference demonstrator

**Case study:** [North Star Mortgage: a bounded-AI governance demonstrator](docs/NORTH_STAR_MORTGAGE_CASE_STUDY.md)

The mortgage implementation is confined to `feature/mortgage-reference-demo-v0.1`. It projects only the approved Case Inputs, Fictional Policy, Evidence Inventory, and ERIR Source Seed into static browser-readable modules. Protected Audit data and age are excluded from the implementation schema and UI. The approved DOCX and XLSX artifacts remain external and unchanged.

Run the focused tests:

```powershell
node --test mortgage-demo.test.mjs mortgage-import.test.mjs mortgage-integration.test.mjs mortgage-ui-wiring.test.mjs
```

The focal output is `INSUFFICIENT EVIDENCE`; MERCA abstains and produces an advisory trace only. See `MORTGAGE_REFERENCE_DEMO.md` for the controlled source hash, calculation results, and explicit non-goals.

The mortgage surface also supports fail-closed, template-controlled XLSX ingestion through `MTG-IMPORT-V0.2`. The supplied workbook lives at `assets/North-Star-Mortgage-Controlled-Import-Template-v0.2.xlsx`; imported data remain in session memory and cannot create credit-decision or action authority.

The first BPMN ingestion test fixture is `assets/North-Star-Mortgage-Workflow-v0.1.bpmn`. The deliberately limited `AIHS-BPMN-SUBSET-V0.1` importer and bounded-AI candidate analysis are documented in `docs/NORTH_STAR_MORTGAGE_BPMN_FIXTURE.md`. They do not execute workflows, validate arbitrary BPMN, or confer process validity, compliance, effectiveness, approval, implementation status, or authority.

The active controlled case can then produce a downloadable, nonpersistent ROI-EA → ERIR → FACEM → BACRM execution trace. Live ERIR record return is distinguished from applicability and compliance; FACEM retains authority/accountability boundaries; BACRM preserves abstention, manual fallback, suspension, and controlled recovery. Federation and bounded-AI value increments remain separately labeled and unquantified without measured evidence.
# BPMN import extension status

G4 adds a browser-local, standards-aware BPMN review workflow with append-only candidate dispositions, separately confirmed bounded canonicalization, and deterministic exports. See [BPMN_IMPORT_G4_READINESS.md](BPMN_IMPORT_G4_READINESS.md). G5 security and regression review binds confirmation to the exact reviewed source/dispositions and applies upload, decompression, and local write-origin limits. Browser visual QA remains outstanding because the available automated browser blocked localhost. See [BPMN_IMPORT_G5_RELEASE_REVIEW.md](BPMN_IMPORT_G5_RELEASE_REVIEW.md). The optional diagram viewer remains deferred.
