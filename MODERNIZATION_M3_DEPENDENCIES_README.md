# ROI-EA Application Modernization M3 — Dependency Normalization & Candidate Waves

**Status:** Reviewable provider-neutral increment  
**Date:** 2026-09-21

## Purpose

M3 adds dependency normalization, blast-radius analysis, and candidate transition-wave grouping to the Application Modernization bounded domain.

M3 does **not** create an authoritative migration plan. It makes coupling, sequencing, weak evidence, unresolved endpoints, and cycles explicit so qualified humans can determine viable transition waves.

## Canonical dependency fields

Each dependency can record:

- source and target object;
- dependency type;
- direction;
- criticality;
- migration coupling;
- confidence;
- resolution state;
- failure impact;
- sequencing rule;
- evidence references;
- provider/source provenance.

The model deliberately separates **criticality** from **migration coupling**. A dependency can be business-critical but weakly coupled for migration, or technically tightly coupled while carrying lower business criticality.

## Candidate wave behavior

By default, M3 groups applications connected by **High** or **Mandatory** resolved migration coupling.

It then evaluates explicit sequencing rules:

- `SOURCE_BEFORE_TARGET`
- `TARGET_BEFORE_SOURCE`
- `None`

The system may assign a candidate sequence layer only when the precedence graph is acyclic. If a sequencing cycle exists, M3 surfaces the cycle and leaves sequence layers unresolved.

Singleton applications remain visible as standalone candidate groups.

## Blast radius

M3 provides a bounded 1–3 hop dependency view for an application. This is a relationship-impact aid, not a prediction of outage consequences.

## AWS bridge

M3 can read M2's stored AWS Application Discovery connection and application-resource-association imports.

The AWS bridge is intentionally conservative:

- a connection is mapped to local applications only when both discovered resources map uniquely;
- mapped AWS connections begin with `migrationCoupling = Unknown`;
- mapped AWS connections are `Partially resolved`, not treated as validated enterprise dependencies;
- unresolved mappings remain visible rather than being discarded.

## UI

M3 adds a **Dependencies & waves** tab to Application Modernization.

The tab supports:

- manual dependency entry;
- synthetic dependency fixture;
- normalization of imported AWS connection evidence;
- dependency review issues;
- unresolved provider evidence;
- blast-radius review;
- candidate transition-wave generation.

## Validation

Run:

```powershell
node --test modernization-model.test.mjs aws-modernization-adapter.test.mjs modernization-dependency-model.test.mjs aws-dependency-adapter.test.mjs
```

Then run the existing ROI-EA regression suite.

## Non-goals

M3 does not:

- infer business criticality from network traffic;
- declare discovered connections to be validated dependencies;
- calculate an optimal migration schedule;
- assign delivery resources;
- calculate duration or capacity;
- authorize cutover;
- automatically resolve cyclic dependencies;
- rank cloud providers.

Those require later evidence and planning increments.
