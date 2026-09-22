# ROI-EA Application Modernization M6.1 - Cross-Module Refresh

M6.1 fixes stale UI state when one modernization extension changes the shared browser-local modernization record.

The extension modules now publish a single browser event after writing:
`roi-ea-modernization-data-changed`

The base Application Modernization workspace listens for that event and re-renders its Portfolio, Assessment, Constraints, Alternatives, and Decision views.

This fixes the acceptance defect where an Azure or Google Cloud candidate could be written to the shared data store but not appear immediately in the M1 Alternatives table until a page reload.

Patched publishers:
- AWS evidence
- Dependencies and waves
- Economics
- Portfolio plan
- Azure and Google Cloud

No canonical model, decision, economics, provider-ranking, or authority behavior is changed.
