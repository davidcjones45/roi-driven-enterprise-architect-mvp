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
