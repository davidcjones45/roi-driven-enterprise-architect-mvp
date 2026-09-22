# ROI-EA Application Modernization M4.1 Corrective Patch v2

This replaces the original M4.1 installer, which contained literal non-ASCII copyright characters that Windows PowerShell 5.1 could misread.

Fixes:
1. Changing Review alternative immediately recalculates the economics panel.
2. The mojibake copyright marker is replaced with the intended copyright character.

The PowerShell installer itself is ASCII-only.
