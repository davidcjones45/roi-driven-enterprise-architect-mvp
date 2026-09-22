# ROI-EA Application Modernization M6.2 - Encoding-Safe Candidate Labels

M6.2 uses plain ASCII JavaScript string concatenation for generated provider candidate labels.

Expected labels:

Microsoft Azure evidence candidate - Replatform -> Azure App Service
Google Cloud evidence candidate - Replatform -> Google Cloud Run

This avoids both mojibake and nested-template-literal quoting issues.

No provider mapping, decision logic, economics, confidence, evidence, or authority behavior changes.
