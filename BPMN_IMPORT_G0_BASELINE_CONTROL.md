# BPMN Import G0 Baseline Control Record

**Status:** G0 — BASELINE CONTROLLED  
**Recorded:** 2026-08-23  
**Repository:** `https://github.com/davidcjones45/roi-driven-enterprise-architect-mvp.git`  
**Controlled feature branch:** `feature/bpmn-import-v0.1`

## Authoritative implementation baseline

The BPMN import extension starts from the latest remote ROI-EA line that contains the controlled mortgage reference demonstrator, spreadsheet ingestion, integrated mortgage execution, controlled BPMN fixture, and read-only BPMN analysis panel:

- Source ref: `origin/feature/mortgage-bpmn-ui-v0.1`
- Source commit: `501ee430b90ccc3d7b757d2af52dda960a8b347a`
- Source tree: `3284d80b7794987cb47af6777ce26158afc759bf`
- Source commit subject: `Add read-only mortgage BPMN analysis panel`

The GitHub default branch remains `main` at `5b73df394269179b52878c85b351a60a8e224926`. It is not used as this feature's implementation baseline because it does not contain the later controlled demonstrator work listed above. This record does not change the repository default branch or declare the feature line merged into `main`.

## Baseline verification

Command:

```text
/opt/codex/runtimes/codex-primary-runtime/dependencies/node/bin/node --test *.test.mjs
```

Result at the source commit:

- Tests: 62
- Passed: 62
- Failed: 0
- Cancelled: 0
- Skipped: 0
- Todo: 0

The passing suite includes the ROI-EA/FEOA foundation, Authority Envelope, ERIR proxy, mortgage spreadsheet ingestion, mortgage integrated execution, controlled BPMN fixture and bounded analysis, UI wiring, and public-demo controls.

## Worktree and preservation disposition

Before branch creation, the local checkout contained two untracked delivery artifacts under `deliverables/`. They were not source-controlled application files and were not deleted or committed. They were moved intact to the sibling preservation directory:

`/workspace/scratch/98a0e756fc2f/roi-ea-g0-preserved-deliverables/`

The controlled feature branch was then created from the verified remote source commit with a clean worktree.

## Frozen and prohibited actions

- FEOA v0.2.3 remains frozen.
- G0 authorizes only the controlled baseline and feature-branch establishment.
- No parser dependency, schema, BPMN support-profile, application-code, UI, deployment, or production-data change is authorized by G0.
- No push, pull request, merge, deployment, or default-branch change is authorized by this record.
- G1 must independently decide the parser adapter, dependency and license posture, XML resource limits, normalized schema, supported BPMN profile, and fixture inventory before parser implementation begins.

## Gate decision

`G0 — BASELINE CONTROLLED`

Permitted next action: G1 architecture, dependency, schema, security-limit, and fixture-design work only.
