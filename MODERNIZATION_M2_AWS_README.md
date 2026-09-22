# ROI-EA Application Modernization M2 — AWS Adapter

**Status:** Reviewable provider specialization  
**Date:** 2026-09-21

## Purpose

M2 adds AWS as the first provider adapter to the provider-neutral Application Modernization bounded domain introduced in M1.

AWS evidence remains evidence. It does not become an enterprise architecture decision, authorization, migration plan, security approval, budget approval, cutover approval, or production-release authority.

## Supported M2 inputs

### 1. AWS Migration Hub Strategy Recommendations

M2 accepts JSON records shaped like Strategy Recommendations/API data and maps:

- `Rehost` → `rehost`
- `Retirement` / `Retire` → `retire`
- `Refactor` → `refactor`
- `Replatform` → `replatform`
- `Retain` → `retain`
- `Relocate` → `relocate`
- `Repurchase` → `replace`

It preserves, when supplied:

- AWS strategy;
- target destination;
- transformation tool;
- preferred indicator;
- source reference;
- assessment date;
- reasoning;
- confidence.

A missing confidence value stays `null`; M2 does not invent a score.

### 2. AWS Application Discovery Service / Migration Hub CSV exports

M2 recognizes the documented export families including application, application-resource association, server, performance, network interface, tags, VMware information, process, OS information, and inbound/outbound process-connection CSVs.

M2 stores imported rows as **discovery evidence only**. M2 does not convert a raw discovery row directly into an architectural conclusion.

### 3. AWS Transform

AWS Transform recommendation evidence can be manually represented/imported when available in structured form, including strategy, target service, reasoning, risk flags, and confidence.

M2 deliberately does **not** claim to parse AWS Transform's interactive HTML, PDF, or PowerPoint reports. The current AWS documentation describes those report outputs but does not document a general machine-readable report export contract equivalent to the Strategy Recommendations API.

## UI behavior

M2 adds an **AWS evidence** tab to the M1 modernization workspace.

Users can:

1. paste/import structured AWS recommendation JSON;
2. import individual AWS discovery CSV files;
3. inspect provenance, mapping, destination/tool, and confidence;
4. create a provider-derived **candidate** modernization alternative.

Creating a candidate never selects it as a winner and never confers implementation authority.

## Canonical boundary

AWS-specific fields remain in adapter/provider evidence records. The canonical `Application`, `ModernizationAssessment`, `ModernizationAlternative`, constraints, economics, and decision semantics remain provider-neutral.

## Focused validation

Run:

```powershell
node --test modernization-model.test.mjs aws-modernization-adapter.test.mjs
```

Then run the existing ROI-EA regression suite before commit.

## M2 non-goals

M2 does not:

- call AWS APIs directly;
- store AWS credentials;
- parse ZIP archives in-browser;
- parse AWS Transform HTML/PDF/PPTX;
- calculate AWS prices;
- create migration waves;
- infer application dependencies from incomplete CSVs;
- rank AWS against Azure or GCP;
- automatically accept AWS recommendations;
- authorize migrations.

Direct AWS API connectivity, stronger dependency normalization, cost integration, and wave planning belong in later increments after this evidence adapter is accepted.
