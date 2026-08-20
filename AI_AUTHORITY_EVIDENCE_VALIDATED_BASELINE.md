# AI Authority & Evidence Reference Implementation — Validated Baseline

**Validation date:** August 13, 2026  
**Scope:** local-only ROI-Driven Enterprise Architect MVP reference implementation

## Implemented capabilities

- Local Authority Envelope collection: create, select, edit, retain, and inspect multiple envelopes.
- Stable local identities for AI system/use case, optional agent, actions, resources, capabilities, and inventory references.
- Typed authority relationships with explicit resolution state.
- Evidence requirements, acceptance criteria, artifact references, assessment states, validity, reviewer, and review authority.
- Append-only authority lifecycle decision history.
- Deterministic effective-authority calculation for a supplied date.
- Authority Portfolio, Authority Requiring Attention, Active Authority Evidence Exceptions, and ERIR Reference Impact local views.

## Validated governance-query status

| Query | Status |
|---|---|
| Q1 — current authority boundary | PASS |
| Q2 — human accountability | PASS |
| Q3 — evidence chain | PASS |
| Q4 — regulatory/control constraints | PARTIAL |
| Q5 — monitoring and authority change | PARTIAL |
| Q6 — active authorizations and evidence validity | PASS |
| Q7 — architecture/capability impact | PASS |
| Q8 — regulatory-change impact | PASS |

## Validation results

- `authority-envelope.test.mjs`: passed. It covers the Queryable Authority & Evidence and multi-envelope portfolio/evidence-exception rules, including future-effective, accepted, missing, not-assessed, rejected, expired, superseded, unresolved, approaching-expiry, suspended, revoked, direct/transitive impact, and Q6 filtering cases.
- ROI-EA JavaScript syntax checks for `app.js` and `authority-model.mjs`: passed.
- ERIR regression suite: **22 passed**. ERIR was not edited for this freeze activity.

## Illustrative demonstration data

All application demo records are **Illustrative reference-implementation data — not customer or production information.**

For August 13, 2026:

| Envelope | Calculated state |
|---|---|
| `AE-SCHED-001` | Not yet effective |
| `AE-DEMO-002` | Effective — controlled authority |
| `AE-DEMO-003` | Suspended |

Northstar ERIR references remain non-final: `APP-FTC-001` is potentially applicable/draft; `CTL-CLAIMS-001` is designed; and `EVD-CLAIMS-001` is a test result/not assessed. They do not prove regulatory applicability, control effectiveness, accepted evidence, or compliance.

## Architecture boundaries and limitations

ROI-EA owns local decision context and authority records. ERIR remains authoritative for regulatory sources, obligations, applicability assessments, controls, evidence artifacts, and reconstruction. ROI-EA references ERIR IDs; it does not duplicate their records.

- Q4 remains PARTIAL: control/evidence constraints are primarily envelope-level, not fully action-specific.
- Q5 remains PARTIAL: monitoring and revocation narratives exist, but structured observation → trigger → lifecycle-decision linkage does not.
- This is not runtime authorization enforcement, automated legal applicability, compliance certification, automatic regulatory-change revocation, live ERIR synchronization, or proof that a named decision authority possesses organizational authority.

## Demonstration preparation

1. Open the MVP and choose **Load Northstar example**. This loads the illustrative portfolio records.
2. **Demo 1 — Authority Envelope:** select `AE-SCHED-001`, retain August 13, 2026 in the effective-state input, and calculate. Show the envelope summary and result: “Not yet effective.”
3. **Demo 2 — Authority Portfolio:** open Authority Portfolio, use August 13, 2026 and a 30-day window, then refresh. Show all three envelope rows.
4. **Demo 3 — Authority Requiring Attention:** in the same portfolio view, show `AE-DEMO-002` and its explicit September 5 evidence-expiry reason.
5. **Demo 4 — ERIR Reference Impact:** return to Authority Envelope, enter `CTL-CLAIMS-001` in ERIR Reference Impact, and select Find local authority impact. Show “Potential impact identified. Review required.”

## Development evidence

The acceptance criteria were retained across iterations; no synthetic maturity score was used.

| Iteration | Q1 | Q2 | Q3 | Q4 | Q5 | Q6 | Q7 | Q8 |
|---|---|---|---|---|---|---|---|---|
| Initial verification | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | FAIL | PARTIAL | PARTIAL |
| Queryable Authority & Evidence | PASS | PASS | PASS | PARTIAL | PARTIAL | PARTIAL | PASS | PASS |
| Multi-Envelope Authority Portfolio | PASS | PASS | PASS | PARTIAL | PARTIAL | PASS | PASS | PASS |

Method: define governance questions → test implementation → identify the highest-leverage gap → implement a bounded increment → retest unchanged criteria.

## Future work (not implemented)

The next justified increments are structured monitoring observations, action-specific control/evidence constraints, and a read-only ERIR change feed. None is part of this validated baseline.
