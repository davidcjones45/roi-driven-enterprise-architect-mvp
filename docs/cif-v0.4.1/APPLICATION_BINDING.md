# Application binding and compatibility contract

This is ROI-EA-CIF-COMPAT-0.4.1-1, an application-specific increment, not a
replacement release of CIF's historical SQL, graph or specialization packages.
Current framework: 0.4.1. Schema: roi-ea-cif-0.4.1-1. External validation: EV-0.
The 22 family IDs remain unchanged; no Core invariant IDs are added or changed.

## Entry points

- `normalizeCanonicalObjectRef`, `normalizeCanonicalRelationship`, and
  `canonicalProjection`: existing API names and return shapes retained, with
  additional fields/findings and stricter semantic checking. A stored legacy
  edge may now produce incomplete/invalid findings instead of PASS.
- `CIF_RELATIONSHIPS` and `CIF_RELATIONSHIP_DEFINITIONS`: generated at module load
  from the unchanged canonical JSON. The loader validates registry shape and
  count before use. Tests pin the input SHA-256. Browser/Node JSON-module support
  is required, tested with Node 24 and the Codex browser.
- `cifApplicationSchema()`: generates a Draft 2020-12 structural schema from the
  same registry/binding. It is not a substitute for semantic validation.
- `normalizeCIFActor`: canonical Actor projection; historical HUMAN/ROLE principal
  vocabulary remains untouched in the existing authority subsystem.
- `deriveAssumes`: accepts separate proposition and adoption records and returns
  a checked DERIVED_VIEW. Adoption identifies actorId, propositionId, basisRef,
  scope, relyingIds, and reassessmentTriggerRefs. `assumptionReassessment` returns
  the impacted reliance references after an explicitly material proposition change.
- `validateControlledAbsence`: use for fields explicitly requiring semantic
  absence. Opt-in `absenceStates` is a field-name/state map. Unrelated storage
  nulls and existing domain status enums are not rewritten.
- `evaluateCIFValidation`: maintains the independent R, C, V dimensions. FAIL
  findings/materialViolations override insufficient evidence and non-applicability.
  CONDITIONAL needs conditions with id, requirement, enforcementRef, monitorRef,
  effectiveFrom/effectiveTo and an explicit asOf within that period.
- `validateCIFCaseSummary` calls `evaluateCIFProfile` for a selected profile;
  its structural status and semantic conformance remain separate. An unprofiled
  historic summary can remain structurally PASS while conformance is insufficient.
  Profile evidence uses canonicalObjects, relationships, decisionIds, authorityIds,
  obligationAssessments, and optional scoped coverage/nonmateriality assessments.
  Obligation keys are exported in PROFILE_OBLIGATIONS. SATISFIED requires scope,
  basisRef, assessorRef and evidenceRefs resolving to supplied Actor/Epistemic
  records. VIOLATED always fails. Non-applicability requires an explicit basis
  and material:false; it is not inferred from missing objects. Full also needs
  validationResult, its matching validationResultId, and explicit limitations.
  Human assessment evidence is recorded evidence, not independently verified truth.
- `assessExternalityMateriality`: eleven qualitative dimensions, explicit
  materiality judgment/basis, and expansion when the recorded material effect
  changes the decision boundary. No scalar externality score is computed.

## Relationship evidence

sourceFamily/targetFamily and Actor subtypes must be resolved before claiming
conformance. The profile evaluator resolves these from canonicalObjects and
detects contradictory supplied endpoint labels. Authoritative modes other than
ASSERTED_EDGE/RELATIONSHIP_RECORD need an authoritativeRecordRef and supplied
authoritativeRecord supporting the endpoints. ASSUMES instead uses its governed
adoption as basisRef and checks matching proposition, actor/relying decision and
scope. This does not turn the derived edge into independent truth.

Registry prose is enforced by the versioned executable supplement. Time-bounded
role occupancy/representation/consent use explicit effectiveFrom/effectiveTo.
Nonstandard occupancy and SHOULD subtype departures require a documented basis
for review, rather than silently passing. Machine-accountability exceptions need
an independently established external regime record with authority/evidence,
actor/subject/scope and covering effective period; CIF does not establish it.

## Migration

`migrateCIFRecord(legacy)` is explicit and pure. It returns
`{compatibilityVersion, original, record, review}` and is deterministic/idempotent.
The complete original is retained. MRS snake_case metadata/object/relationship
fields are mapped to the application's camelCase projection; conflicts remain
visible. An OF-16 ASSUMPTION is interpreted as ASSUMPTION_ADOPTION, preserving the
original legacy subtype. Missing links are flagged, never synthesized. Unknown
Actor types are preserved for review. Missing historical framework version stays
null in the projection, never defaults to 0.4.1. No existing database or
localStorage record is automatically migrated. Free-text business assumptions
are not classified as adopted governed assumptions without evidence.

## Verification boundaries

The browser app uses the registry loader to display current framework/EV-0
metadata. Semantic editing remains in the existing additive model API; no new
CIF editor or persistence subsystem is introduced. Existing FACEM/BACRM/FEOA,
authority envelopes, uncertainty, tradeoff and agent-system modules are unchanged.
Historical RCTS/MRS checks exercise those packages themselves, not certification
of this application. Application-specific regression tests exercise this increment.
