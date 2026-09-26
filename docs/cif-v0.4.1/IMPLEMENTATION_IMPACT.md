# CIF v0.4.1 discovery and implementation boundary

Discovery completed before code edits, 2026-09-25.

Baseline: `feature/application-modernization-m8-outcomes`, commit
`aafc4f4bcfd1740b9fef9e644fb34e76d57c5f1a`. No tracked modifications.
Untracked modernization backup directories preserved in original checkout.
Implementation uses a separate worktree/branch.

Architecture: static HTML/CSS and native JavaScript modules; browser localStorage
with guarded writes; optional Python HTTP server and SQLite engagement store.
No package manifest, compiler, formatter, linter, or build pipeline in application.
The existing CIF projection/validation/case-summary modules are additive APIs,
currently exercised by tests rather than a dedicated UI or persistence subsystem.
No MRS package is imported by the app; the two existing JSON schemas are BPMN schemas.
No CIF migration framework or stored canonical-record collection was found.

Baseline commands: `node --test *.test.mjs`: 552 tests, 549 pass, 3 fail,
0 skipped. Failures: federated-ui-integration, mortgage-ui-wiring, and
presentation-readiness-ui exact text assertions. Python unittest discovery with
the bundled runtime: 11 pass. Initial sandbox run failed creating local-data;
authorized rerun passed. `python` is not available on PATH.

| Area | Discovery disposition |
|---|---|
| A version | Modify current 0.4 constant; preserve explicit historic metadata |
| B assumption | Missing typed proposition/adoption API; free-text business assumptions must remain untouched |
| C Actor | Add canonical subtypes; preserve distinct existing HUMAN/ROLE principal API |
| D machine accountability | Existing delegated machine-action checks separate principals; generic canonical relationship validation needs enforcement |
| E registry | Replace hard-coded 57 names and seven partial definitions with canonical JSON loader |
| F non-entailments | Four restored boundaries already executable; add new boundaries and focused regression coverage |
| G R/C/V | Exact labels and no overall score already present; add evidence/condition/violation evaluation |
| H profiles | profileSelected is unvalidated text; add evidence-backed profile findings |
| I absence | Add opt-in controlled state fields; preserve unrelated null and domain enums |
| J dependency/reliance | Existing domain models separate them; add bidirectional non-entailment guards |
| K purpose | No CIF legitimacy validator found; add material purpose trace validation |
| L externalities | Summary text exists; add bounded qualitative materiality support |
| MRS | Versioned application compatibility binding, no alteration of historical packages |
| Migration | Explicit pure compatibility projection retaining full original, no automatic persisted-data rewrite |
| UI | Only identify current framework and EV-0; preserve layout and metric wrapping |

Sources: Downloads/CIF_v0.4.1.md identifies itself in its contents as the frozen
canonical v0.4.1 specification; copied byte-for-byte under its canonical title.
Downloads/CIF_Relationships.json identifies CIF-RELREG-0.4.1 and 60 relationships;
copied byte-for-byte. Downloads MRS v0.1/v0.2 and RCTS v0.3 ZIPs were inspected
and extracted outside the implementation worktree for reference verification.
The ZIP named CIF_Canonical_Distribution_Package_v0.4.1 contains the historical
v0.4 distribution internally; it is not treated as the current specification.
Separate CIF_Amendment_Record_v0.4.1.md and CIF_CR_003_Bounded_Amendment_Review_v0.1.md
were not found in the repository, project, attachments, Downloads, or accessible
Codex document search. Their review provenance cannot be verified. The canonical
specification supplies the requested normative semantics. EV-0 is unchanged.

Implementation decisions: camelCase remains the application binding; external
MRS snake_case input is accepted by an explicit adapter. Registry prose constraints
require a small versioned executable supplement, not a duplicate relationship
registry. A finding distinguishes a known violation from missing evidence.
No reference existence or external validity is inferred merely from an identifier.
Profile findings require recorded assessments and supporting references for
obligations that cannot be decided mechanically. Their evidence is asserted input,
not independently externally validated fact.
