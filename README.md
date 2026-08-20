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
