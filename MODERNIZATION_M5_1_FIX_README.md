# ROI-EA Application Modernization M5.1 - Acceptance Fixture Correction

This patch changes only the synthetic M5 capacity fixture and adds regression coverage.

The original fixture demonstrated headroom and exact saturation, but no actual capacity shortfall.

M5.1 changes synthetic Security demand from 0.50 FTE to 0.80 FTE while available Security capacity remains 0.50 FTE.

Expected synthetic result:
- Architecture: headroom
- Database engineering: exactly saturated
- Testing / QA: headroom
- Security: 0.30 FTE shortfall

Expected next action:
Resolve delivery-capacity shortfall of 0.30 FTE before committing overlapping work.

No production portfolio logic is changed.
