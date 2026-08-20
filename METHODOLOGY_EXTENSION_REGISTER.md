# Methodology Extension Register

## NSI-001 — Multi-year economic calculation relationship

- **Date:** 2026-08-20
- **Source:** North Star integrated execution
- **Affected modules:** MCVSM
- **Finding type:** Missing logical object/relationship
- **Description:** MCVSM currently accepts and compares explicit collective and member economic values, but does not represent a discounted multi-year cash-flow schedule from which NPV, ROI, PV benefit-cost ratio, and allocation outcomes can be reproducibly derived.
- **Evidence:** `north-star-integrated-execution.test.mjs`; the synthetic C2/C1 and C3/C2 reviewed values were retained as fixture inputs because no accepted calculator relationship exists.
- **Severity:** Non-blocking / material for future calculation automation
- **Proposed disposition:** Candidate model extension, separately reviewed; do not alter the accepted modules in this integrated-execution pass.
- **Status:** Implemented candidate extension — pending independent review.
- **Implementation:** `mcvsm-economic-calculation.test.mjs` demonstrates explicit periodized flows, 8% discounting, 3% annual growth, NPV, `TOTAL_DISCOUNTED_COST` ROI, and BCR reconciliation against the synthetic targets. Real-data validation remains outstanding.
