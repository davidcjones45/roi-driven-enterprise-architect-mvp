# North Star Mortgage Reference Demonstrator v0.1

## Status

Controlled implementation branch only. This implementation does not modify the approved specification or source workbook and is not authorized for merge or production use.

## Source controls

- Source specification: `North Star Mortgage Demonstrator - Controlled Specification v0.1.docx`
- Source fixture: `North Star Mortgage Demonstrator - Synthetic Data Fixture v0.1.xlsx`
- Source fixture SHA-256: `cfecf9331396c9b86ae0f7c8d4de4c7c501d9e2b0d259df6fb7285e057968776`
- Imported projections: Case Inputs, Fictional Policy, Evidence Inventory, and ERIR Source Seed.
- Excluded from the implementation projection: Protected Audit and the age field. No protected-class value is present in the schema, UI, calculations, prompts, outputs, or logs.

## Capability boundary

MERCA v0.1 / `CFG-MERCA-001` performs deterministic calculations, traces inputs and fictional policy comparisons, identifies incomplete evidence, drafts review questions, and abstains. It cannot approve, deny, price, counteroffer, determine eligibility, waive policy, send notices, change records, or make legal/compliance conclusions.

ROI-EA supplies the read-only decision context. ERIR source records are displayed as read-only source candidates with status and applicability qualifications. FACEM distinctions prevent evidence possession or analytic output from becoming decision authority, organizational accountability, acceptance, or commitment. BACRM binds the demonstration to the named capability, reviewed configuration, permitted data, purpose, abstention, and manual fallback.

## Focal result

- DTI: 44.68% — fictional exception-review band.
- LTV: 94.19% — within fictional standard.
- Post-closing reserves: 1.54 months — fictional exception-review band.
- Base-only DTI sensitivity: 48.84% — outside fictional band.
- Overtime verification: pending.
- Current asset statement: missing.
- Evidence state: insufficient evidence.
- AI state: abstain; advisory trace only.
- Credit decision: not made.

These outputs are synthetic architectural evidence only. They do not establish compliance, fairness, model validity, production safety, effectiveness, realized ROI, or a credit outcome.

## Template-controlled spreadsheet ingestion

The demonstrator includes a separate successor import contract, `MTG-IMPORT-V0.2`, distributed as `assets/North-Star-Mortgage-Controlled-Import-Template-v0.2.xlsx`. It does not modify or replace the controlled v0.1 source workbook.

The browser accepts a workbook only when all four approved worksheets, their template sentinel, headers, controlled case-input metadata, and controlled policy metadata match. It rejects formulas, macros, embedded or external components, extra or missing sheets, unapproved columns, unknown case fields, protected-class or age fields, invalid identifiers, unsafe URLs, duplicates, and any candidate that fails the existing mortgage fixture validator.

An accepted workbook is held in session memory only, replaces only the active synthetic projection, retains the reviewed MERCA capability and configuration envelope, calculates a new SHA-256 source fingerprint, and reports accepted sheet and row counts. It imports no protected audit data and creates no approval, denial, eligibility, pricing, notice, waiver, record-writing, or other action authority. Import failure leaves the active case unchanged; the built-in controlled fixture can be restored explicitly.

## Integrated four-layer execution

The active controlled case can be executed through a deterministic four-layer trace:

1. **ROI-EA** records the decision context, calculations, fictional policy comparison, evidence gaps, and review route.
2. **ERIR** carries the controlled source seed and attempts read-only verification of the stable source IDs. Repository return is recorded separately from applicability, obligation, compliance, and control-effectiveness judgments.
3. **FACEM** keeps access, evidence, recommendation, authority, accountability, acceptance, and commitment as separate states.
4. **BACRM** binds MERCA to the exact reviewed configuration and operating context, requires abstention and manual fallback, and defines suspension and nonautomatic recovery.

The generated trace contains a pending human-disposition record rather than a credit disposition. It also reports `C2 − C1` federation value and `C3 − C2` bounded-AI value separately; both remain `NOT QUANTIFIED` because the fixture contains no measured member economics or AI-effectiveness evidence. The trace can be downloaded as JSON for inspection, but the demonstrator does not persist or execute it as a consequential record.
