# BPMN Diagram View v0.1

## Purpose

This optional G5-deferred capability adds a browser-local, read-only visualization of a BPMN source that has already passed controlled intake and is staged in the G4 review workspace.

## Boundary

- It does not execute BPMN, validate a process, create authority, accept work, or alter any FEOA candidate, disposition, or canonical commit.
- It renders only normalized flow-node and sequence-flow records already present in the staged import model.
- Candidate highlighting is display-only. It identifies an existing mapping candidate and does not add an AI finding, permission, or authority.
- Source BPMN-DI bounds are used when the normalized model has usable coordinates. Otherwise, the view uses a deterministic layout based on the normalized sequence-flow graph and states that limitation in the UI.
- Imported labels are inserted as SVG text nodes; source XML is never interpreted as HTML or executable content.

## Scope

The v0.1 view is intentionally not a general BPMN renderer. Pools, lanes, data associations, messages, choreography, extension content, and unsupported constructs remain represented through the normalized import/export record rather than being given additional visual semantics.

## Verification

`bpmn-diagram.test.mjs` verifies deterministic output, no new authority/execution semantics, and source-DI use when present. `mortgage-ui-wiring.test.mjs` verifies the read-only UI surface and text-only rendering path.
