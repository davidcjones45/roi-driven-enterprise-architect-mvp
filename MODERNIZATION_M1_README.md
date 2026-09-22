# ROI-EA Application Modernization — M1 Workspace

Status: reviewable feature package, 2026-09-21.

## Purpose

M1 adds a provider-neutral Application Modernization specialist workspace to the existing ROI-EA MVP without changing the FEOA or Authority Envelope record models.

The workspace supports:
- application portfolio records;
- eleven evidence-aware modernization dimensions;
- hard constraints versus soft preferences;
- multiple candidate modernization alternatives;
- transition/run-cost inputs;
- confidence and evidence-completeness visibility;
- provider-generated recommendation evidence;
- a least-regret next move;
- a human-review decision view that deliberately does not select a winner.

## Architecture boundary

M1 uses a separate browser-local key: `roi-ea-application-modernization-m1-v0.1`.

This is deliberate for the first UI increment. It prevents schema changes to the existing `roi-driven-enterprise-architect-mvp-v1` workspace until the modernization model and interaction design have been accepted.

## Installation

From PowerShell:

```powershell
cd <path-to-this-package>
.\Install-Modernization-M1.ps1 -RepoPath "C:\path	ooi-driven-enterprise-architect-mvp"
```

The installer:
1. verifies `index.html`, `app.js`, and `authority-model.mjs`;
2. creates timestamped backups of `index.html` and `app.js`;
3. copies the modernization modules;
4. inserts one stylesheet and one module script;
5. registers the workspace title and context in `app.js`;
6. fails closed if the expected current-repository markers are not found.

## Validation

Run the focused test:

```powershell
node --test modernization-model.test.mjs
```

Then run the repository's existing regression suite before committing.

## M1 non-goals

M1 does not:
- connect to AWS, Azure, or Google Cloud;
- calculate provider prices;
- perform source-code or runtime discovery;
- create migration waves;
- authorize architecture or migration;
- rank cloud providers;
- select an alternative automatically.

Those remain later increments after the provider-neutral workflow is accepted.
