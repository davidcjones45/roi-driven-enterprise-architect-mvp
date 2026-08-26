# FEDARM Engagement Foundation v0.1

This additive local-consulting foundation supports the first bounded work item in the FEDARM workplan: a durable, single-consultant engagement workspace.

## Run locally

```powershell
$env:ROI_EA_DATA_DIR = 'C:\ROI-EA-Consulting-Data' # optional explicit local data directory
python .\serve-roi-ea.py
```

Open `http://127.0.0.1:8766/index.html?mode=consulting`. The loopback server stores engagement metadata in `roi-ea-engagements.sqlite3` beneath the configured data directory. It is not exposed by the Vercel deployment.

## Included

- Stable UUID engagement identifier and durable SQLite record.
- Controlled lifecycle states: Draft, Discovery, Analysis, Decision Preparation, Decision Issued, Closed, and Archived.
- Create, open, update, duplicate, archive, recent-list, and JSON export API routes.
- Explicit foundational fields for client, initiative, decision question, scope, exclusions, accountable roles, dates, industry, and jurisdictions.
- A browser-local reference to the existing ROI-EA workspace. The analytical workspace is not copied into the engagement record and its contents do not become verified evidence by reference.

## Boundaries

- The public demo remains browser-local and never exposes the consulting SQLite API.
- The service binds only to `127.0.0.1`; it has no cloud storage, authentication, multi-user function, client portal, or write route in the public demo.
- There is deliberately no deletion endpoint. Archive retains the local record.
- This release does not register documents, assess AI necessity, create findings, select recommendations, issue decision packages, or freeze a snapshot. Those are later FEDARM workplan increments.
- Registration does not establish evidence validity, authority, regulatory applicability, compliance, control effectiveness, implementation approval, or a client decision.
