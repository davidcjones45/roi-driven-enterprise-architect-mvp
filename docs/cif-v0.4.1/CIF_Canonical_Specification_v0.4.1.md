# Coherent Intellectual Framework (CIF)
## Canonical Specification v0.4.1 — Consolidated Research Baseline, Amendment 1

**Status:** FROZEN — Consolidated Research Baseline, Amendment 1  
**Supersedes:** CIF Canonical Specification v0.4 for current canonical use; v0.4 and v0.3 remain historical baselines.  
**Amendment record:** CIF-AMD-001  
**External validation status:** EV-0 — not yet independently externally tested.  
**Purpose:** Provide a compact, reusable, implementation-oriented intellectual framework for representing and governing consequential decisions, delegated action, evidence, authority, accountability, uncertainty, value conflict, lifecycle change, reassessment, and reliance on external expertise across nonfiction and software-development work.

### Claims boundary
CIF v0.4.1 is an internally reconciled, cross-domain, implementation-oriented research framework. It has been stress-tested through multiple reference cases and controlled conceptual challenges for representability and semantic consistency. It is **not** an industry standard, legal determination, safety certification, professional standard of care, or empirically validated universal theory.

### Completion-review and amendment disposition
CIF-CR-001: **PASS WITH CONTROLLED CONSOLIDATION REQUIRED**. CIF v0.4 performed that consolidation and resolved CR-A01 through CR-A04 without adding a Core object family or Core invariant.

CIF-AMD-001: **APPROVED CONTROLLED AMENDMENT**. CIF v0.4.1 corrects a consolidation defect and resolves bounded ambiguities in assumption semantics, Actor-role/representation semantics, accountability, relationship registration, R/C/V operationalization, conformance profiles, machine null/unknown states, Dependency/Reliance distinction, Purpose wording, and externality materiality. It does **not** add a Core family or Core invariant.

## 1. Governing Objective

Develop and maintain a **complete, reusable, and externally testable Coherent Intellectual Framework that does not unnecessarily inflate the Core**. CIF is intended to influence future nonfiction and software development while remaining explicit about evidence, authority, uncertainty, values, external expertise, and its own limits.

## 2. Architecture and Core Minimality Rule

CIF is organized in three semantic tiers plus implementation and validation layers:

1. **Core semantics** — stable cross-domain objects, relationships, invariants, lifecycle, and R/C/V validation.
2. **Reusable specializations** — cross-domain profiles needed for recurring but non-Core concerns.
3. **Application patterns** — recurring analytical questions that do not justify new ontology.
4. **Machine-readable reference model** — technology-neutral logical representation.
5. **Regression / external conformance architecture** — tests that challenge semantics and implementation.

**Core Minimality Rule:** before adding Core structure, attempt in order:
1. existing Core object;
2. existing relationship grammar;
3. existing specialization;
4. Application Protocol pattern;
5. new specialization if demonstrably reusable across domains;
6. Core modification only after repeated representability failure, category error, contradiction, or inability to preserve a consequential distinction.

A recurring analytical concept does not justify a new Core object or specialization when it can be reconstructed reliably from existing canonical semantics.

## 3. Canonical Object Model

CIF Core contains 22 object families.


### OF-01 — Actor
An identifiable participant relevant to a governed process.

Canonical Actor subtypes are:
- `HUMAN_PERSON`
- `ROLE_OR_OFFICE`
- `ORGANIZATION`
- `GOVERNING_BODY`
- `TECHNICAL_SYSTEM`
- `AUTONOMOUS_AGENT`
- `OTHER_IDENTIFIED_ACTOR`

A Role/Office is not the same object as the human who occupies it. Technical systems and autonomous agents may perform actions and carry bounded operational responsibility, but they do not by themselves satisfy CIF's institutional-accountability requirement.


### OF-02 — Purpose
The stated, adopted, or authorized human or institutional reason a system, decision, activity, or intervention exists.

CIF records the source and basis of a Purpose where material. CIF does **not** independently determine the moral, legal, political, professional, or social legitimacy of that Purpose.


### OF-03 — Outcome
The condition or result the governed activity is intended to influence.


### OF-04 — Value
Benefit, utility, public value, economic value, human value, service value, or other relevant worth attributed to or realized from outcomes.


### OF-05 — Consequence
A material effect arising from action, decision, event, failure, or state.


### OF-06 — Context / System
The bounded environment in which CIF objects and relationships have meaning.


### OF-07 — Capability
What an Actor, system, or component can technically or practically do.


### OF-08 — Resource
Data, money, infrastructure, credentials, devices, capacity, tools, assets, or other usable things.


### OF-09 — Dependency
A material structural, functional, operational, or continuity condition in which one governed object, Actor, system, or decision depends on another object's availability, performance, validity, state, or continued existence.

A Dependency may exist without an explicit decision to rely on the dependency.


### OF-10 — Trust State
A contextual assessment of trustworthiness or reliance suitability for a defined purpose.


### OF-11 — Reliance
The governed, scoped act or state of using another object, claim, source, control, decision, or Actor as a basis for action, judgment, operation, or decision.

Reliance is purposeful and decision-relevant. It may exist without structural Dependency, and Dependency does not by itself establish Reliance.


### OF-12 — Epistemic Object
Claim, Evidence, Evidence Assertion, Verification, Fact, Assumption Proposition, Inference, Recommendation, or Forecast. Forecast is a specialized forward-looking Inference.

An `ASSUMPTION_PROPOSITION` is a proposition treated as potentially decision-relevant without being established as Fact. Its adoption for a particular decision, model, or plan is represented separately through OF-16 `ASSUMPTION_ADOPTION`.


### OF-13 — Semantic Concept / Mapping / Transformation
The meaning layer through which domains, systems, and participants interpret, map, and transform information.


### OF-14 — Rule / Obligation
A normative requirement, prohibition, permission, duty, or other governing constraint.


### OF-15 — Authority / Delegation / Authority Envelope
The legitimate right to decide or act, including bounded transfer of that right.


### OF-16 — Decision / Assumption Adoption / Exception
A governed determination, explicit adoption of an Assumption Proposition for a defined scope, authorized bounded departure, or Risk Acceptance specialization.

`ASSUMPTION_ADOPTION` is the authoritative record that a particular Actor, Decision, model, or plan relies on an OF-12 `ASSUMPTION_PROPOSITION`. Legacy records using subtype `ASSUMPTION` should be interpreted as `ASSUMPTION_ADOPTION`, not as the epistemic proposition itself.


### OF-17 — Commitment
An attributable accepted obligation.


### OF-18 — Action
A consequential act performed or caused by an Actor or system.


### OF-19 — Handoff
A governed transfer of information, work, custody, responsibility, authority, or status.


### OF-20 — Acceptance
An explicit governed state indicating receipt, agreement, or assumption of a defined handoff or obligation.


### OF-21 — Control / Intervention / Recourse
Mechanisms for preventing, constraining, detecting, stopping, correcting, challenging, or remedying action.


### OF-22 — Lifecycle Object
Event, State, Material Change, Reassessment, Supersession, Recovery, or Retirement.


### 3.1 Common governed-object properties

For material governed objects:

```text
object_id                     MUST
object_type                   MUST
version                       SHOULD
state                         SHOULD
effective_from                SHOULD
effective_to                  MAY
recorded_at                   SHOULD
owner_ref                     SHOULD
scope_ref                     SHOULD
provenance_ref                SHOULD
supersedes_ref                MAY
superseded_by_ref             MAY
limitations[]                 MAY
evidence_refs[]               MAY
reassessment_trigger_refs[]   MAY
```

`owner_ref` is descriptive metadata. It does **not** automatically establish Accountability, Authority, or Responsibility.

### 3.2 Metric / Indicator clarification — CR-A02

A **Metric/Indicator** is normally represented as a specialized Epistemic/measurement construct that provides evidence about a State, Outcome, Control, Consequence, Value, or other governed object. A target attached to a metric may function as a Rule, threshold, Outcome target, or Control condition.

Therefore:

> **Metric ≠ Outcome**  
> **Target Achievement ≠ Value Realization**

### 3.3 Risk clarification

Risk remains a **derived analytical construct**, not a Core family. A risk analysis may combine possible Consequence, likelihood/uncertainty, exposure, affected Actor, Value, horizon, and Control state. **Risk Acceptance** remains a Decision specialization.

## 4. Canonical Relationship Grammar

Material relationships are governed/reified edges rather than naive graph triples because they can have scope, basis, state, provenance, evidence, effective time, limitations, and reassessment triggers.


### Institutional / normative

`POSSESSES_AUTHORITY`, `DELEGATES_TO`, `IS_PERMITTED_TO`, `RESPONSIBLE_FOR`, `ACCOUNTABLE_FOR`, `MAKES_COMMITMENT`, `IS_MEMBER_OF`, `CONSENTS_TO`, `MAKES_DECISION`, `ASSUMES`, `GRANTS_EXCEPTION_TO`, `OCCUPIES_ROLE`, `REPRESENTS`, `ACTS_ON_BEHALF_OF`.


### Rule semantics

`APPLIES_TO`, `REQUIRES`, `PROHIBITS`, `PERMITS`.


### Epistemic / semantic

`ASSERTS`, `SUPPORTED_BY`, `DERIVED_FROM`, `EVALUATES`, `CONTRADICTS`, `RELIES_ON`, `INFERS`, `RECOMMENDS`, `MAPS_TO`, `TRANSFORMS_TO`, `SUPERSEDES`, `CORRECTS`, `HAS_TRUST_STATE_FOR`.


### Operational

`PERFORMS`, `USES`, `HAS_ACCESS_TO`, `POSSESSES`, `AUTHENTICATES_AS`, `DEPENDS_ON`, `REQUESTS`, `OFFERS`, `TRANSMITS`, `RECEIVES`, `VALIDATES`, `ACCEPTS`, `COMPLETES`, `IMPLEMENTS_CONTROL`, `OPERATES_CONTROL`, `INTERVENES_IN`, `INVOKES_RECOURSE`.


### Purpose / value

`SERVES_PURPOSE`, `SEEKS_OUTCOME`, `REALIZES_VALUE_FROM`, `ATTRIBUTES_VALUE_TO`.


### Causal

`CONTRIBUTES_CAUSALLY_TO`.


### Temporal / lifecycle

`PRECEDES`, `BECOMES_EFFECTIVE_AT`, `EXPIRES_AT`, `SUSPENDS`, `REACTIVATES`, `RETIRES`, `RECOVERS_FROM`.


### 4.1 Common relationship contract

```text
relationship_id              MUST
relationship_type            MUST
source_ref                   MUST
target_ref                   MUST
scope                        SHOULD
context_ref                  SHOULD
basis_ref                    SHOULD
purpose_ref                  MAY
state                        SHOULD
effective_from               SHOULD
effective_to                 MAY
recorded_at                  SHOULD
provenance_ref               SHOULD
conditions[]                 MAY
limitations[]                MAY
evidence_refs[]              MAY
reassessment_trigger_refs[]  MAY
supersedes_ref               MAY
superseded_by_ref            MAY
```

### 4.2 Relationship representation modes

- `OBJECT_REIFIED`
- `RELATIONSHIP_RECORD`
- `DERIVED_VIEW`
- `EVENT_DERIVED`
- `ASSERTED_EDGE`

**Authoritative Representation Rule:** every canonical relationship type identifies one authoritative representation mode. Other representations may exist only as explicitly defined projections and must not create independent truth or conflicting lifecycle semantics.

### 4.3 Governed, derived, and analytical relations

**Governed canonical relations** have explicit authoritative semantics, such as `ACCOUNTABLE_FOR`, `RESPONSIBLE_FOR`, `CONSENTS_TO`, `IS_MEMBER_OF`, and `CONTRIBUTES_CAUSALLY_TO`.

**Derived relations** such as `IS_PERMITTED_TO` or `POSSESSES_AUTHORITY` may be calculated from authoritative records, scope, context, time, rules, and conditions.

**Analytical relations** such as practical leverage or externality status may be reconstructed from existing objects/relationships and do not become independent canonical truth merely because they are useful analytical views.

### 4.4 Role, representation, and machine-accountability semantics

CIF distinguishes the Actor who occupies a role from the role/office itself.

- `OCCUPIES_ROLE` records a time-bounded Actor-to-Role relationship.
- `REPRESENTS` records recognized representation under a basis, scope, and effective period.
- `ACTS_ON_BEHALF_OF` records a contextual acting relationship for a defined action, decision, or scope.

These relationships do not silently create Authority or transfer Accountability.

Institutional Accountability under I-25 normally terminates in a `HUMAN_PERSON`, `ROLE_OR_OFFICE`, `ORGANIZATION`, or `GOVERNING_BODY`. A `TECHNICAL_SYSTEM` or `AUTONOMOUS_AGENT` may perform Actions, contribute causally, and carry bounded operational Responsibility, but it does not satisfy CIF's institutional-accountability requirement unless an applicable external governance regime independently establishes such accountability. CIF itself does not establish that external status.

### 4.5 Assumption semantics

CIF separates:
1. **Assumption Proposition** — an OF-12 Epistemic Object.
2. **Assumption Adoption** — an OF-16 governed Decision record that adopts the proposition for a defined scope, basis, Actor, model, plan, or decision.

The `ASSUMES` relationship is a derived projection from an Assumption Adoption record. An Assumption Proposition may exist without being adopted, and adoption does not make the proposition a Fact.

### 4.6 Complete relationship registry

Appendix D is the authoritative relationship representation/source-target registry for CIF v0.4.1. Every canonical relationship type is assigned:
- one authoritative representation mode;
- allowed source family or family group;
- allowed target family or family group;
- basis/scope requirements;
- subtype constraints where applicable.

Implementations SHALL NOT treat an unregistered source/target combination as CIF-conformant merely because a storage technology permits it.

## 5. Core Invariants


### I-01 — Human Purpose
Consequential systems remain traceable to an identified human or institutional Purpose and, where material, to the Actor and basis that state, adopt, or authorize it.

CIF does not independently determine whether that Purpose is morally, legally, politically, professionally, or socially legitimate.


### I-02 — Retained Human Agency
Human agency remains operationally meaningful where the design depends on human control.


### I-03 — Outcome-Bounded System
A governed system identifies the outcome it is intended to influence.


### I-04 — Explicit Actor Identity
Consequential decisions and actions are attributable to identifiable Actors.


### I-05 — Capability Is Not Authority
Technical ability does not create legitimate authority.


### I-06 — Access Is Not Permission
Reachability or access does not establish permission to use.


### I-07 — Decisions Require Authority
Consequential decisions are linked to legitimate decision authority.


### I-08 — Delegation Explicit and Bounded
Delegation identifies source authority, scope, duration, conditions, and limits.


### I-09 — Information Types Remain Distinct
Evidence, Fact, Inference, Recommendation, Forecast, and Decision do not silently collapse.


### I-10 — Evidence Retains Provenance
Evidence retains enough provenance to determine source, version, context, and relevance.


### I-11 — Meaning Is Contextual
Meaning may depend materially on context.


### I-12 — Validity Is Contextual
A proposition valid in one context is not automatically valid in another.


### I-13 — Confidence Is Not Authority
Epistemic confidence cannot create decision rights.


### I-14 — Time Is Part of Meaning
Effective time, record time, reliance time, and changed-validity time may differ materially.


### I-15 — History Superseded, Not Silently Rewritten
Corrections and successor decisions preserve predecessor history.


### I-16 — Evidence Does Not Inherit Decision Authority
Evidence may support a decision but cannot itself decide.


### I-17 — Handoffs Carry Constraints
Material constraints survive governed handoffs unless legitimately changed.


### I-18 — Delivery Is Not Acceptance or Outcome
Transmission or delivery is not acceptance, performance, completion, or outcome.


### I-19 — Controls Must Be Operable
A control functions in real operating conditions rather than merely existing on paper.


### I-20 — Intervention Must Remain Operationally Meaningful
Intervention occurs with sufficient information, time, authority, capacity, and practical effect.


### I-21 — Dependency Must Be Visible
Material dependencies are represented explicitly.


### I-22 — Material Change Reopens Decisions
Material change to relied-upon facts, authority, obligations, controls, dependencies, assumptions, or context triggers bounded reassessment where relevant.


### I-23 — Technical Recovery Does Not Restore Authority Automatically
Restoration of technical function does not imply authorized resumption.


### I-24 — Success Must Be Demonstrated at Intended Level
Implementation, execution, or completion is not proof that intended Outcome or Value occurred.


### I-25 — Material Accountability Must Be Explicit
Material accountability is attributable and scoped.


### I-26 — Material Responsibility Must Be Explicit
Assigned operational responsibility is attributable and scoped.


### I-27 — Causal Claims Must Remain Evidence-Bounded
Causal attribution retains evidence, uncertainty, competing explanations, and attribution status.


### I-28 — Membership Must Be Explicit
Dependency, participation, access, contract, service provision, or approval does not establish membership.


### I-29 — Consent Must Not Be Inferred
Where consequential use, disclosure, participation, representation, or another governed activity materially depends on consent, consent is represented explicitly with scope, purpose, basis, effective time, and state.


## 6. Non-Entailment Architecture

**Default rule:** no material relationship or status is inferred solely from another material relationship or status unless CIF explicitly defines that entailment and its conditions.

### 6.1 Core non-entailment registry


- **Capability ≠ Authority**

- **Access ≠ Permission**

- **Authentication ≠ Authorization**

- **Evidence ≠ Fact**

- **Fact ≠ Inference**

- **Inference ≠ Recommendation**

- **Recommendation ≠ Decision**

- **Confidence ≠ Authority**

- **Possession ≠ Reliance**

- **Reliance ≠ Inheritance**

- **Dependency ≠ Reliance**

- **Reliance ≠ Dependency**

- **Trust ≠ Authority**

- **Dependency ≠ Membership**

- **Request ≠ Commitment**

- **Offer ≠ Acceptance**

- **Transmission ≠ Receipt**

- **Receipt ≠ Validation**

- **Validation ≠ Acceptance**

- **Receipt ≠ Acceptance**

- **Acceptance ≠ Execution**

- **Execution ≠ Completion**

- **Completion ≠ Outcome**

- **Outcome ≠ Value**

- **Execution ≠ Accountability**

- **Authority ≠ Accountability**

- **Responsibility ≠ Accountability**

- **Commitment ≠ Accountability**

- **Responsibility ≠ Authority**

- **Responsibility ≠ Commitment**

- **Responsibility ≠ Performance**

- **Sequence ≠ Causation**

- **Correlation ≠ Causation**

- **Dependency ≠ Causation**

- **Responsibility ≠ Causation**

- **Accountability ≠ Causation**

- **Causal Contribution ≠ Legal Liability**

- **Correction ≠ Historical Erasure**

- **Correction ≠ Supersession**

- **Changed Validity ≠ Correction**

- **Shared Evidence ≠ Shared Decision**

- **Same Source Value ≠ Same Semantic Meaning**

- **Technical Continuity ≠ Semantic Continuity**

- **Technical Recovery ≠ Authorized Resumption**

- **Participation ≠ Consent**

- **Permission ≠ Consent**

- **Acceptance ≠ Consent**

- **Authority ≠ Consent**

- **Membership ≠ Consent**

- **Prior Use ≠ Consent**

- **Silence ≠ Consent**

- **Role Occupancy ≠ Authority**

- **Representation ≠ Authority**

- **Acts On Behalf Of ≠ Accountability Transfer**

- **Machine Execution ≠ Institutional Accountability**

- **Assumption Proposition ≠ Assumption Adoption**


### 6.2 Scoped non-entailment registry — CR-A04

Specializations may add scoped rules without promoting them to Core. Each rule should carry:

```text
rule_id
antecedent
prohibited_inference
scope
status
introduced_by
rationale
test_refs[]
```

Examples include:
- AACM: High Autonomy ≠ High Authority.
- Collective Agency: Shared Memory ≠ Shared Truth; Synthesis ≠ Decision.
- QoL: Social Contact ≠ Belonging; Proxy Measure ≠ Human Outcome.
- Value Conflict: Weight ≠ Fact; Calculated Ranking ≠ Decision.
- Uncertainty: Confidence ≠ Probability; Forecast ≠ Fact.
- Assurance: Control Implemented ≠ Control Effective; Certification ≠ Universal Fitness.

## 7. Lifecycle and Temporal Semantics

CIF does not require a single universal lifecycle for every object, but consequential records preserve effective state, historical state, supersession, material change, reassessment, recovery, and retirement.

### 7.1 Recovery terminology — CR-A03

Canonical lifecycle:

```text
Failure / Suspension
      ↓
Technical Recovery
      ↓
Assurance / Control Verification
      ↓
Authority Review
      ↓
Acceptance where required
      ↓
Authorized Resumption
      ↓
REACTIVATES transition
```

Therefore:
- **Technical Recovery ≠ Assurance Restoration**
- **Assurance Restoration ≠ Authorized Resumption**
- `REACTIVATES` is the lifecycle transition that implements an authorized-resumption decision.

### 7.2 Temporal dimensions

CIF distinguishes:
- Effective Time
- Record / Knowledge Time
- Reliance Time
- Trigger Time
- Reassessment Time

A later correction must not make an earlier decision appear to have relied on information that did not then exist.

### 7.3 Reassessment rule

Object or relationship change → identify materially dependent decisions and relationships → perform the smallest sufficient reassessment.

Typical dispositions:
`CONFIRM`, `MODIFY`, `SUPERSEDE`, `SUSPEND`, `RETIRE`, or `INSUFFICIENT_EVIDENCE`.

## 8. Validation Semantics

CIF permanently separates three questions.

### R — Representability

- `PASS` — every material concept and relationship required by the case can be represented without ambiguity that could alter a consequential conclusion.
- `PASS_WITH_AMBIGUITY` — representation is possible, but at least one material interpretation requires explicit disambiguation; no missing category is demonstrated.
- `FAIL_GAP` — a material concept or relationship cannot be represented without adding or extending CIF semantics.
- `FAIL_CATEGORY_ERROR` — the available representation would require collapsing materially distinct CIF categories or assigning an object/relationship to an incompatible category.

### C — Conformance

- `PASS` — all applicable CIF MUST requirements and material governed conditions for the selected scope/profile are satisfied with adequate evidence.
- `CONDITIONAL` — conformance is supportable only under explicit, enforceable, time-bounded conditions; the conditions are recorded and monitored.
- `FAIL` — one or more known applicable material CIF requirements are violated.
- `NOT_APPLICABLE` — the conformance question does not apply to the defined subject or scope.
- `INSUFFICIENT_EVIDENCE` — no known violation is established, but available evidence is inadequate, conflicting, stale, or missing such that conformance cannot be determined.

**Precedence rule:** a known material violation yields `FAIL`; `INSUFFICIENT_EVIDENCE` must not be used to hide a known violation. `CONDITIONAL` must not be used as a synonym for uncertainty.

### V — External Validity

- `ESTABLISHED_FOR_SCOPE` — appropriate external evidence or qualified external authority establishes the relied-upon claim for the defined subject, scope, configuration, context, and effective period.
- `PARTIALLY_ESTABLISHED` — material portions are externally established but one or more consequential portions remain unestablished or out of scope.
- `NOT_ESTABLISHED` — external validity is decision-relevant but has not been sufficiently established for the defined scope.
- `OUTSIDE_CIF_DETERMINATION` — the question belongs to an external discipline or authority that CIF is not competent to decide. This status does not prohibit importing an external finding; once suitable external evidence is available, the CIF record may use `ESTABLISHED_FOR_SCOPE` or `PARTIALLY_ESTABLISHED`.

**R PASS does not imply C PASS. C PASS does not imply V established.** CIF defines no mandatory overall PASS.

## 9. Canonical Specialization Library


### CIF-S-003 — Autonomous Agent Classification Matrix (AACM)
Classifies a deployed autonomous agent as a multidimensional vector across 15 dimensions; classification is not risk, authorization, safety, or value judgment.


### CIF-S-004 — Human Quality-of-Life Objective Profile
Represents human quality of life as multidimensional and person-centered; supports multiple QoL frameworks rather than a single CIF score.


### CIF-S-005 — Value Conflict and Tradeoff Profile
Represents competing values, objectives, rights, constraints, alternatives, methods, dissent, authority, and reassessment without forcing a universal common scale.


### CIF-S-006 — Uncertainty and Forecast Profile
Represents evidence insufficiency, evidence conflict, measurement uncertainty, inherent variability, epistemic/model/semantic uncertainty, scenarios, forecasts, confidence, probability, assumptions, horizons, and sensitivity.


### CIF-S-007 — Assurance, Safety, and Security Interface
Governs reliance on externally established specialist claims, evidence, controls, assessments, certifications, and assurance while preserving external-domain authority.


### CIF-S-008 — Agent-System / Collective Agency Profile
Classifies composed multi-agent systems across role structure, coordination topology, shared state, synthesis, collective authority, composed capability, dissent, and continuity/failure.


### 9.1 CIF-S-003 AACM — canonical dimensions

Operational Capability; Decision Autonomy; Initiative; Authority Scope; Delegation Depth; Environment of Effect; Persistence; Adaptability; Composition; Human Oversight; Consequence Magnitude; Reversibility; Observability; Dependency Criticality; Recovery / Resumption Mode.

Key rule: classify the **deployed agent in context**, not a foundation model in the abstract.

### 9.2 CIF-S-008 Agent-System — canonical dimensions

Role Structure; Coordination Topology; Shared-State Architecture; Collective Synthesis Rule; Collective Authority Structure; Collective Capability Composition; Conflict and Dissent Handling; Collective Continuity and Failure Mode.

### 9.3 CIF-S-004 QoL design principles

Supports multiple quality-of-life frameworks. Person preferences, rights, opportunities, current state, desired state, evidence, uncertainty, tradeoffs, and reassessment remain explicit. No scalar CIF quality-of-life score is required.

### 9.4 CIF-S-005 Value Conflict principles

Supports threshold/constraint methods, ordinal comparison, MCDA, utility/cost methods, Pareto/dominance, deliberative judgment, negotiated agreement, authority-based resolution, and hybrids. CIF structures the decision problem but does not mandate one universal aggregation method.

### 9.5 CIF-S-006 Uncertainty principles

Supports evidence insufficiency, evidence conflict, measurement uncertainty, inherent variability, epistemic/model/semantic uncertainty, future-state/scenario uncertainty, and multiple forecast forms. Confidence, probability, evidence quality, and authority remain distinct.

### 9.6 CIF-S-007 Assurance-interface principle

CIF governs **reliance on external expertise**. It does not replace security, safety, privacy, engineering, medicine, law, finance, statistics, economics, or other professional disciplines.

## 10. Canonical Negative Architectural Decisions


### No Core Power object
Power and leverage are analyzed through Actor, Resource, Dependency, Capability, Access, Authority, Control, and Value.


### No Externality specialization at present
Externality is treated as Consequence plus system-boundary/incidence conditions and is handled in the Application Protocol.


### No Strategic-Behavior specialization at present
Strategic Actor Analysis belongs in the Application Protocol.


### No universal Risk family
Risk is a derived analytical construct. Risk Acceptance is a Decision specialization.


### No universal QoL scoring system
CIF-S-004 supports multiple appropriate or externally validated QoL frameworks.


### No universal uncertainty calculus
CIF-S-006 hosts domain-appropriate external methods.


### No CIF safety methodology
CIF-S-007 consumes specialist safety/security/assurance evidence without replacing external disciplines.


### No Core Metric object
Metric/Indicator is normally a specialized Epistemic/measurement construct used as evidence about governed objects.


## 11. CIF Application Protocol (CIF-AP-001)

Every material CIF application begins with twelve canonical questions.


### Q1 — Purpose
What human or institutional Purpose is stated, adopted, or authorized; by whom; under what basis; and for what scope?


### Q2 — Outcome
What outcome is sought, at what level and horizon?


### Q3 — Boundary
What is inside the system/decision boundary and what remains outside?


### Q4 — Actors
Who are the material Actors, and what roles, authority, responsibilities, incentives, resources, dependencies, and information advantages matter?


### Q5 — Capabilities / Dependencies
What can the system actually cause, including through composition, and what does it materially depend on?


### Q6 — Knowledge / Uncertainty
What is known, inferred, forecast, assumed, contested, or unknown?


### Q7 — Rules / Authority
What rules, obligations, permissions, delegations, consent, exceptions, and authority apply?


### Q8 — Decision / Action chain
What decisions, commitments, actions, handoffs, and acceptances occur?


### Q9 — Controls / Recourse
What controls, intervention, correction, rollback, and recourse exist?


### Q10 — Consequences / Values
What consequences, value conflicts, distributional effects, and spillovers matter?


### Q11 — Reassessment
What changes would reopen the decision?


### Q12 — External expertise
What lies outside CIF and requires qualified external expertise?


### 11.1 Strategic Actor Analysis

For materially consequential Actors, examine stated objectives, incentives, expected rewards/penalties, formal authority, practical influence, controlled resources, critical dependencies, information advantages/disadvantages, observability, plausible strategic behavior, working rules, and metric-gaming opportunities.

Observed incentive structure justifies scenario analysis; it does not prove motive.

### 11.2 Externality and Spillover Analysis

Ask:
1. What boundary is used?
2. Which consequences extend beyond it?
3. Who receives benefits?
4. Who bears costs or risks?
5. Which effects occur later?
6. Which are positive, negative, mixed, or uncertain?
7. Which are monetized or non-monetized?
8. What counterfactual is used?
9. What causal evidence supports attribution?
10. What dependencies propagate effects?
11. Are burdens/benefits concentrated?
12. Would a wider boundary materially change the decision?

#### Externality materiality rule

Boundary expansion is required only for consequences that are plausibly material to the decision. Materiality is assessed without requiring a universal scalar score.

Consider at least:
- magnitude;
- plausibility;
- irreversibility;
- number and type of affected Actors;
- rights, dignity, safety, or non-discretionary obligations;
- duration and persistence;
- concentration of burden or benefit;
- dependency propagation;
- environmental or institutional persistence;
- whether inclusion could change an alternative, constraint, authority requirement, control, decision, or reassessment trigger.

Stop expanding the boundary when further reasonably foreseeable consequences would not materially alter the governed decision or its controls. `Not monetized ≠ Not material`.

### 11.3 External Expertise Reliance Pattern

Identify external question → appropriate expertise/authority → external claim → provenance/scope/limitations → reliance decision → effective period → reassessment on material change.

### 11.4 Stop condition

Stop modeling when all material concepts are representable, no known material category errors remain, needed specializations are applied, significant evidence gaps and outside-expertise boundaries are explicit, decision rights and reassessment triggers are clear, and further modeling would not materially change the decision.

## 12. CIF Profiles

### Profile rule applying to all levels

Profiles vary modeling depth, not semantic safety. **All profiles SHALL obey all applicable Core invariants, non-entailment rules, authority constraints, temporal semantics, external-domain boundaries, and R/C/V separation.**

A profile is not conformant merely because its listed object families are present.

### CIF-Lite
Required modeling coverage:
Purpose; Outcome; Context/System; Actor; Decision; Authority; Evidence; Action; Consequence; Reassessment.

Minimum governed obligations:
- identify the consequential decision and decision authority;
- preserve Evidence/Fact/Inference/Recommendation/Decision distinctions;
- preserve material provenance and effective time;
- identify material external-expertise boundaries;
- identify material reassessment triggers;
- apply all applicable Core invariants and non-entailments.

### CIF-Governed
CIF-Lite plus Capability, Dependency, Trust State, Reliance, Rule/Obligation, Control, and Acceptance where handoffs exist.

Additional obligations:
- represent material dependencies and reliance separately;
- represent material controls and evidence of operation;
- preserve handoff/receipt/validation/acceptance distinctions;
- use governed relationship records where the relationship registry requires them;
- record material scope, basis, provenance, and lifecycle for governed relations.

### CIF-Full
All material families and detailed lifecycle, semantics, Value, Commitment, Handoff, mappings, formal reassessment, and relationship governance.

Additional obligations:
- represent all material object families and specialization records needed by the case;
- support historical reconstruction;
- preserve authoritative representation modes;
- support impact analysis and bounded reassessment across dependencies;
- provide explicit R/C/V findings and limitations for material conclusions.

Profile selection considers consequence, irreversibility, distributed authority, uncertainty, duration, number of organizations, legal/regulatory significance, dependency, autonomy, and need for historical reconstruction.

## 13. Machine-Readable Reference Model (CIF-MRS-001)

The machine model is technology-neutral. CIF semantics are authoritative; JSON, relational, graph, RDF, event-sourced, or document implementations are bindings.

Five layers:
1. CIF Semantic Specification
2. Canonical Logical Schema
3. Validation / Constraint Rules
4. Implementation Binding
5. Application Data

### 13.1 Machine principles
- Stable governed identifiers.
- Separate `schema_version`, `record_version`, `framework_version`, and `specialization_version`.
- Historical material is normally superseded rather than overwritten.
- Distinguish `UNKNOWN`, `UNRESOLVED`, `NOT_APPLICABLE`, `NOT_ASSESSED`, and null.
- Derived views never become independent truth sources.
- A CIF-compliant system distinguishes **stored**, **asserted**, **derived**, and **externally established** states.

### 13.2 Controlled absence / unknown-state semantics

- `UNKNOWN` — the value is relevant and may exist in principle, but it is not known to the current record, observer, or process.
- `UNRESOLVED` — the material question has been identified, but a governed determination has not been completed, or materially conflicting candidate states remain.
- `NOT_APPLICABLE` — the field, assessment, relationship, or state does not apply to the defined subject/scope.
- `NOT_ASSESSED` — an assessment would be relevant, but it has not yet been performed; no conclusion may be inferred.
- `null` — storage-level absence of a value. `null` has no canonical semantic meaning by itself and SHALL NOT substitute for a controlled semantic state where one is required.

`UNKNOWN ≠ UNRESOLVED ≠ NOT_APPLICABLE ≠ NOT_ASSESSED ≠ null`.

### 13.3 Machine conformance
- MRS-C1 Structural
- MRS-C2 Semantic
- MRS-C3 Governed

### 13.4 Implementation bindings

Controlled implementation bindings are available for:
- JSON / JSON Schema;
- PostgreSQL;
- Property Graph / Neo4j-oriented representation;
- specialization bindings for CIF-S-003 through CIF-S-008.

The current controlled binding package is CIF-MRS-001 v0.2. Bindings are implementation artifacts and do not redefine CIF semantics.

No binding may erase scope, time, provenance, evidence, lifecycle, or authoritative-representation semantics merely for implementation convenience.

## 14. Regression and Conformance Test System (CIF-RCTS-001)

Five layers:
- T1 Semantic Unit Tests
- T2 Relationship / Invariant Tests
- T3 Scenario Regression Tests
- T4 Specialization Conformance Tests
- T5 External / Independent Conformance Tests

The suite normalizes the six canonical reference cases and RT-01 through RT-33, adds temporal, metamorphic, counterexample, and mutation testing, and requires positive as well as negative paths.

A framework change is acceptable only when the targeted failing test becomes PASS without introducing unaccepted regressions, specialization inconsistency, machine-schema breakage, or unjustified complexity.

Core changes require repeated cross-domain `FAIL_GAP`, repeated category error, material ambiguity not solvable by specialization, contradiction among Core rules, or inability to preserve a consequential distinction.

## 15. External Conformance Test Kit (CIF-ECTK-001)

The portable Test Kit has separate practitioner and evaluator packages.

It tests:
- Comprehensibility
- Representational reproducibility
- Semantic preservation
- Conformance usefulness
- Boundary discipline

External validation maturity:
- `EV-0` Not externally tested
- `EV-1` Independent exploratory review
- `EV-2` Multi-practitioner reproducibility evidence
- `EV-3` Cross-domain external evidence

Current status: **EV-0**.

The framework authors should not coach blinded practitioners during an exercise. Clarifications, if needed, are written, versioned, and available to all participants.

Negative evidence counts. Repeated inability to interpret canonical concepts, recurrent representability gaps, contradictory results caused by specification ambiguity, author dependence, or impractical burden are legitimate evidence against CIF.

## 16. Canonical Reference Cases

- **RC-01** Human + AI writing/research
- **RC-02** Enterprise predictive prioritization
- **RC-03** Multi-enterprise federation/shared evidence
- **RC-04** Public-sector emergency communications/statutory authority
- **RC-05** Regulated physical-world hazardous-material action
- **RC-06** Failure/recovery of shared AI evidence service

After relationship reconciliation, none of the six retains a representability `FAIL_GAP`. RC-02 remains a legitimate conformance failure under the stated 15-second human-review condition. External legal, engineering, and safety sufficiency remain outside CIF determination where appropriate.

## 17. Canonical Conceptual Flow

```text
PURPOSE
  ↓
OUTCOME
  ↓
SYSTEM / CONTEXT
  ↓
CAPABILITY + RESOURCE + DEPENDENCY
  ↓
CLAIMS
  ↓
EVIDENCE + PROVENANCE
  ↓
VERIFICATION
  ↓
FACTS
  ↓
INFERENCE / FORECAST
  ↓
RECOMMENDATION
  ↓
TRUST STATE / RELIANCE
  ↓
SEMANTIC INTERPRETATION
  ↓
RULES / OBLIGATIONS
  ↓
AUTHORITY / PERMISSION
  ↓
DECISION
  ↓
RESPONSIBILITY / ACCOUNTABILITY
  ↓
COMMITMENT / DELEGATION
  ↓
ACTION
  ↓
HANDOFF
  ↓
ACCEPTANCE
  ↓
CONSEQUENCE
  ↓
OUTCOME
  ↓
VALUE
  ↓
OPERATING EVIDENCE
  ↓
MATERIAL CHANGE
  ↓
REASSESSMENT
  ↓
CONFIRM / MODIFY / SUPERSEDE / SUSPEND / RETIRE
```

This is a semantic dependency map, not a mandatory linear workflow.

## 18. External-Domain Boundary

CIF may govern:
- reliance on specialist evidence;
- provenance and scope;
- authority and decision rights;
- controls and intervention;
- reassessment and lifecycle;
- consequences and value conflicts.

CIF does **not** independently establish:
- legal sufficiency or liability;
- medical diagnosis or treatment correctness;
- engineering safety;
- cybersecurity truth;
- statistical/econometric validity;
- accounting/audit conclusions;
- scientific truth;
- professional standard of care.

**Boundary principle:** CIF governs reliance on expertise without pretending to become the expertise.

## 19. Change Control

Framework change classes:
- `D` Defect
- `G` Gap
- `A` Ambiguity
- `S` Specialization
- `E` Evidence refinement

A controlled change request records:
- ID
- affected object / relationship / invariant / specialization
- observed problem
- evidence
- example
- why existing CIF is inadequate
- proposed change
- affected books/domains/software
- backward compatibility
- contradiction / complexity risk
- decision
- effective version

Default: specialization before Core inflation.

## 20. Completion Review Clarifications Incorporated in v0.4

### CR-A01 — OF-12 Epistemic Object clarification
**Resolved.** OF-12 explicitly includes Inference, Recommendation, and Forecast; Forecast is a specialized forward-looking Inference.

### CR-A02 — Metric/Indicator placement
**Resolved.** Metric/Indicator is an Epistemic/measurement specialization or domain construct used as evidence; Metric ≠ Outcome.

### CR-A03 — Recovery/resumption terminology
**Resolved.** Technical Recovery, Assurance/Control Verification, Authority Review, Acceptance where required, Authorized Resumption, then `REACTIVATES`.

### CR-A04 — Consolidated non-entailment registry
**Resolved architecturally.** Core and specialization-scoped rules are maintained in one registry with explicit scope and test references.

## 21. Maturity Assessment

### Semantic completeness
**HIGH FOR TESTED SCOPE.** No demonstrated material representational gap remains across the domains and challenges tested to date.

### Operational completeness
**SUBSTANTIAL WITH EXECUTABLE INTERNAL BASELINES.** Application Protocol, machine logical schema, JSON/PostgreSQL/property-graph bindings, specialization bindings, reassessment architecture, and an executable RCTS baseline exist. Production-scale usability and independent implementation reproducibility are not yet established.

### Empirical completeness
**NOT ESTABLISHED.** External practitioner testing has not yet occurred. Status remains EV-0.

### Defensible public description
> CIF v0.4 is a coherent, internally stress-tested, implementation-oriented research framework designed for cross-domain application and independent external testing.

## 22. Freeze Decision — CIF-BF-002 / Amendment CIF-AMD-001

**Decision:** APPROVED; CIF-BF-002 remains in force under controlled amendment CIF-AMD-001.  
**Canonical specification:** CIF v0.4.1  
**Status:** FROZEN — Consolidated Research Baseline, Amendment 1  
**Core families:** 22  
**Core invariants:** 29  
**Core relationship grammar:** retained and consolidated  
**Specialization library:** S-003 through S-008 as defined in this specification  
**Application Protocol:** CIF-AP-001  
**Machine Reference Model:** CIF-MRS-001  
**Regression Architecture:** CIF-RCTS-001  
**External Test Architecture:** CIF-ECTK-001  
**External validation status:** EV-0  
**Further conceptual development:** amendment-controlled only

### Development stop rule
Do not continue conceptual expansion merely for completeness. Reopen framework development only when implementation, external testing, a genuinely novel domain, or a controlled regression exposes a material defect, gap, ambiguity, or justified specialization need.

## Appendix A — Canonical Terms and Aliases

- **Authority Envelope** — canonical term for explicit bounded action/decision authority; lowercase usage is stylistic only.
- **Agent-System** — canonical specification term for a composed multi-agent governed system.
- **Quality of Life (QoL)** — canonical general term; no single CIF score implied.
- **Technical Recovery** — restoration of technical function.
- **Assurance Restoration** — renewed or re-established assurance state after change/failure.
- **Authorized Resumption** — explicit governance decision permitting previously suspended operation to resume.
- **REACTIVATES** — lifecycle transition implementing Authorized Resumption.
- **Risk Acceptance** — Decision specialization concerning residual exposure.
- **Metric/Indicator** — measurement/epistemic construct, not Outcome.
- **Assumption Proposition** — OF-12 proposition treated as potentially decision-relevant without being established as Fact.
- **Assumption Adoption** — OF-16 governed decision record adopting an Assumption Proposition for a defined scope.
- **Role/Office** — OF-01 Actor subtype distinct from the human who occupies it.
- **Institutional Accountability** — CIF accountability that resolves to an accountable human, role/office, organization, or governing body unless an external governance regime independently establishes another accountable status.

## Appendix B — Non-Core Analytical Patterns

The following are intentionally represented as patterns rather than Core primitives:
- power and practical leverage;
- incentives and strategic behavior;
- information asymmetry;
- metric gaming;
- externalities;
- rebound effects;
- path dependence;
- social incentives;
- working rules;
- network effects.

Their importance is not disputed. The architectural decision is that existing Core semantics reconstruct them sufficiently for the tested scope.

## Appendix C — Claims Discipline for Future CIF-Based Work

Distinguish:
- **Established within CIF** — internally defined and reconciled CIF constructs.
- **Supported synthesis** — CIF integration or interpretation of externally established ideas.
- **Hypothesis / candidate** — insufficiently tested CIF proposals.
- **Externally established** — claims supported by authoritative or academic external evidence.

When CIF intersects an external discipline, preserve source, scope, validity conditions, effective time, limitations, and decision relevance. Do not convert an external framework into a CIF invention.


## Appendix D — Authoritative Relationship Representation and Source/Target Registry

### Relationship Registry Group Notation

`ANY_GOVERNED_OBJECT` means any CIF object family OF-01 through OF-22, subject to the relationship-specific note and subtype constraints. Where a relation uses a broad family set, the application SHALL still restrict it to semantically meaningful source/target instances.

Actor subtype constraints used by this registry:
- `HUMAN_PERSON`
- `ROLE_OR_OFFICE`
- `ORGANIZATION`
- `GOVERNING_BODY`
- `TECHNICAL_SYSTEM`
- `AUTONOMOUS_AGENT`
- `OTHER_IDENTIFIED_ACTOR`

A family-level permission does not override subtype constraints stated in the registry.


| Relationship | Category | Authoritative mode | Allowed source | Allowed target | Basis | Scope | Notes |
|---|---|---|---|---|---:|---:|---|
| `POSSESSES_AUTHORITY` | Institutional / normative | `DERIVED_VIEW` | OF-01 | OF-15 | MUST | MUST | Derived from effective Authority records, role/representation state, scope, context, and time. |
| `DELEGATES_TO` | Institutional / normative | `OBJECT_REIFIED` | OF-01 | OF-01 | MUST | MUST | Authoritative semantics carried by OF-15 Delegation/Authority Envelope. |
| `IS_PERMITTED_TO` | Institutional / normative | `DERIVED_VIEW` | OF-01 | OF-18, OF-08, OF-07, OF-06 | MUST | MUST | Permission is derived from applicable rules, authority, delegation, context, conditions, and time. |
| `RESPONSIBLE_FOR` | Institutional / normative | `RELATIONSHIP_RECORD` | OF-01 | OF-06, OF-07, OF-03, OF-16, OF-17, OF-18, OF-19, OF-21, OF-22 | MUST | MUST | Technical Actors may carry operational responsibility; responsibility does not create authority or accountability. |
| `ACCOUNTABLE_FOR` | Institutional / normative | `RELATIONSHIP_RECORD` | OF-01 | ANY_GOVERNED_OBJECT | MUST | MUST | Default source subtype must be HUMAN_PERSON, ROLE_OR_OFFICE, ORGANIZATION, or GOVERNING_BODY. Technical Actors do not satisfy institutional accountability unless an external governing regime independently establishes that status. |
| `MAKES_COMMITMENT` | Institutional / normative | `OBJECT_REIFIED` | OF-01 | OF-17 | MUST | MUST | Commitment object is authoritative. |
| `IS_MEMBER_OF` | Institutional / normative | `RELATIONSHIP_RECORD` | OF-01 | OF-06 | MUST | MUST | Approval, participation, dependency, access, or service provision do not establish membership. |
| `CONSENTS_TO` | Institutional / normative | `RELATIONSHIP_RECORD` | OF-01 | OF-18, OF-16, OF-19, OF-08, OF-07, OF-06 | MUST | MUST | Consent is scoped, purposeful, time-bounded, and independently evidenced. |
| `MAKES_DECISION` | Institutional / normative | `OBJECT_REIFIED` | OF-01 | OF-16 | MUST | MUST | Decision object is authoritative. |
| `ASSUMES` | Institutional / normative | `DERIVED_VIEW` | OF-01, OF-16 | OF-12 | MUST | MUST | Target must be ASSUMPTION_PROPOSITION; derived from an OF-16 ASSUMPTION_ADOPTION record. |
| `GRANTS_EXCEPTION_TO` | Institutional / normative | `OBJECT_REIFIED` | OF-01 | OF-14, OF-21 | MUST | MUST | Authoritative semantics carried by an OF-16 Exception decision. |
| `OCCUPIES_ROLE` | Institutional / normative | `RELATIONSHIP_RECORD` | OF-01 | OF-01 | MUST | MUST | Source subtype normally HUMAN_PERSON; target subtype ROLE_OR_OFFICE. Occupancy alone does not create authority. |
| `REPRESENTS` | Institutional / normative | `RELATIONSHIP_RECORD` | OF-01 | OF-01 | MUST | MUST | Represents another Actor under an explicit basis, scope, and effective period. Representation does not itself create authority. |
| `ACTS_ON_BEHALF_OF` | Institutional / normative | `RELATIONSHIP_RECORD` | OF-01 | OF-01 | MUST | MUST | Contextual action relation. Does not transfer accountability unless separately established. |
| `APPLIES_TO` | Rule semantics | `ASSERTED_EDGE` | OF-14 | ANY_GOVERNED_OBJECT | MAY | MAY | Target must be material to the cited rule's governed scope. |
| `REQUIRES` | Rule semantics | `ASSERTED_EDGE` | OF-14 | ANY_GOVERNED_OBJECT | MAY | MAY | Target must be material to the cited rule's governed scope. |
| `PROHIBITS` | Rule semantics | `ASSERTED_EDGE` | OF-14 | ANY_GOVERNED_OBJECT | MAY | MAY | Target must be material to the cited rule's governed scope. |
| `PERMITS` | Rule semantics | `ASSERTED_EDGE` | OF-14 | ANY_GOVERNED_OBJECT | MAY | MAY | Target must be material to the cited rule's governed scope. |
| `ASSERTS` | Epistemic / semantic | `ASSERTED_EDGE` | OF-01, OF-12 | OF-12 | MAY | MAY | Actor or source asserts an Epistemic Object. |
| `SUPPORTED_BY` | Epistemic / semantic | `ASSERTED_EDGE` | OF-12, OF-16, OF-14, OF-21, OF-10, OF-11, OF-15 | OF-12 | MAY | MAY | Target should normally be Evidence or Verification. |
| `DERIVED_FROM` | Epistemic / semantic | `ASSERTED_EDGE` | OF-12, OF-13 | OF-12, OF-13 | MAY | MAY | Derivation preserves provenance and transformation context. |
| `EVALUATES` | Epistemic / semantic | `ASSERTED_EDGE` | OF-12 | ANY_GOVERNED_OBJECT | MAY | MAY | Assessment/evaluation result evaluates a governed subject. |
| `CONTRADICTS` | Epistemic / semantic | `ASSERTED_EDGE` | OF-12 | OF-12 | MAY | MAY | Contradiction is epistemic, not automatic invalidation. |
| `RELIES_ON` | Epistemic / semantic | `OBJECT_REIFIED` | ANY_GOVERNED_OBJECT | ANY_GOVERNED_OBJECT | MUST | MUST | Authoritative semantics carried by OF-11 Reliance. |
| `INFERS` | Epistemic / semantic | `ASSERTED_EDGE` | OF-01, OF-06, OF-12 | OF-12 | MAY | MAY | Target subtype should be INFERENCE or FORECAST. |
| `RECOMMENDS` | Epistemic / semantic | `ASSERTED_EDGE` | OF-01, OF-06, OF-12 | OF-12 | MAY | MAY | Target subtype should be RECOMMENDATION. |
| `MAPS_TO` | Epistemic / semantic | `ASSERTED_EDGE` | OF-13, OF-12 | OF-13, OF-12 | MAY | MAY | Mapping requires context/version where meaning may drift. |
| `TRANSFORMS_TO` | Epistemic / semantic | `ASSERTED_EDGE` | OF-13, OF-12 | OF-13, OF-12 | MAY | MAY | Transformation preserves provenance and method. |
| `SUPERSEDES` | Epistemic / semantic | `EVENT_DERIVED` | ANY_GOVERNED_OBJECT | ANY_GOVERNED_OBJECT | MAY | MAY | Normally same-family predecessor/successor; derived from lifecycle/supersession records. |
| `CORRECTS` | Epistemic / semantic | `ASSERTED_EDGE` | OF-12, OF-22 | OF-12, OF-16, OF-22 | MUST | MUST | Correction does not automatically supersede or erase history. |
| `HAS_TRUST_STATE_FOR` | Epistemic / semantic | `OBJECT_REIFIED` | OF-01, OF-16, OF-06 | ANY_GOVERNED_OBJECT | MUST | MUST | Authoritative semantics carried by OF-10 Trust State. |
| `PERFORMS` | Operational | `ASSERTED_EDGE` | OF-01 | OF-18 | MAY | MAY | Performance does not create responsibility, accountability, or authority. |
| `USES` | Operational | `ASSERTED_EDGE` | OF-01, OF-18, OF-06 | OF-08, OF-07, OF-06 | MAY | MAY | Use does not establish permission. |
| `HAS_ACCESS_TO` | Operational | `ASSERTED_EDGE` | OF-01 | OF-08, OF-07, OF-06 | MAY | MAY | Access does not establish permission. |
| `POSSESSES` | Operational | `ASSERTED_EDGE` | OF-01 | OF-08 | MAY | MAY | Possession does not establish reliance. |
| `AUTHENTICATES_AS` | Operational | `ASSERTED_EDGE` | OF-01 | OF-01 | MAY | MAY | Authentication does not establish authorization; target is an identity/Actor representation. |
| `DEPENDS_ON` | Operational | `OBJECT_REIFIED` | ANY_GOVERNED_OBJECT | ANY_GOVERNED_OBJECT | MUST | MUST | Authoritative semantics carried by OF-09 Dependency. |
| `REQUESTS` | Operational | `ASSERTED_EDGE` | OF-01 | OF-18, OF-08, OF-19, OF-17, OF-16 | MAY | MAY | Request does not establish commitment or acceptance. |
| `OFFERS` | Operational | `ASSERTED_EDGE` | OF-01 | OF-17, OF-19, OF-08, OF-18 | MAY | MAY | Offer does not establish acceptance. |
| `TRANSMITS` | Operational | `EVENT_DERIVED` | OF-01, OF-18, OF-06 | OF-19, OF-08, OF-12 | MAY | MAY | Transmission does not establish receipt. |
| `RECEIVES` | Operational | `EVENT_DERIVED` | OF-01, OF-06 | OF-19, OF-08, OF-12 | MAY | MAY | Receipt does not establish validation or acceptance. |
| `VALIDATES` | Operational | `ASSERTED_EDGE` | OF-01, OF-06, OF-12 | OF-12, OF-19, OF-21 | MUST | MUST | Validation is scoped and does not establish acceptance. |
| `ACCEPTS` | Operational | `OBJECT_REIFIED` | OF-01 | OF-19, OF-17, OF-18, OF-08, OF-12 | MUST | MUST | Authoritative semantics carried by OF-20 Acceptance. |
| `COMPLETES` | Operational | `EVENT_DERIVED` | OF-01, OF-18 | OF-18, OF-17, OF-19 | MAY | MAY | Completion does not establish Outcome. |
| `IMPLEMENTS_CONTROL` | Operational | `ASSERTED_EDGE` | OF-01, OF-06 | OF-21 | MAY | MAY | Implementation does not establish operation or effectiveness. |
| `OPERATES_CONTROL` | Operational | `ASSERTED_EDGE` | OF-01, OF-06 | OF-21 | MAY | MAY | Operation does not establish effectiveness. |
| `INTERVENES_IN` | Operational | `EVENT_DERIVED` | OF-01, OF-21 | OF-18, OF-16, OF-06 | MUST | MUST | Intervention must satisfy I-20 where human control is claimed. |
| `INVOKES_RECOURSE` | Operational | `EVENT_DERIVED` | OF-01 | OF-21, OF-16, OF-19 | MUST | MUST | Recourse invocation does not predetermine disposition. |
| `SERVES_PURPOSE` | Purpose / value | `ASSERTED_EDGE` | ANY_GOVERNED_OBJECT | OF-02 | MAY | MAY | Purpose is identified/stated/authorized; CIF does not itself establish legitimacy. |
| `SEEKS_OUTCOME` | Purpose / value | `ASSERTED_EDGE` | OF-01, OF-02, OF-16, OF-18, OF-06 | OF-03 | MAY | MAY | Seeking an outcome does not establish achievement. |
| `REALIZES_VALUE_FROM` | Purpose / value | `OBJECT_REIFIED` | OF-01, OF-06 | OF-03, OF-05, OF-08 | MUST | MUST | Authoritative semantics carried by OF-04 Value. |
| `ATTRIBUTES_VALUE_TO` | Purpose / value | `OBJECT_REIFIED` | OF-01 | ANY_GOVERNED_OBJECT | MUST | MUST | Authoritative semantics carried by OF-04 Value; attribution does not establish realized value. |
| `CONTRIBUTES_CAUSALLY_TO` | Causal | `RELATIONSHIP_RECORD` | ANY_GOVERNED_OBJECT | OF-03, OF-05, OF-18, OF-06, OF-22 | MUST | MUST | Requires causal claim, evidence, attribution status, period, and limitations. |
| `PRECEDES` | Temporal / lifecycle | `EVENT_DERIVED` | ANY_GOVERNED_OBJECT | ANY_GOVERNED_OBJECT | MAY | MAY | Temporal ordering alone does not establish causation. |
| `BECOMES_EFFECTIVE_AT` | Temporal / lifecycle | `EVENT_DERIVED` | ANY_GOVERNED_OBJECT | OF-22 | MAY | MAY | Target should identify the effective Event/State. |
| `EXPIRES_AT` | Temporal / lifecycle | `EVENT_DERIVED` | ANY_GOVERNED_OBJECT | OF-22 | MAY | MAY | Target should identify the expiry Event/State. |
| `SUSPENDS` | Temporal / lifecycle | `EVENT_DERIVED` | OF-22, OF-16 | ANY_GOVERNED_OBJECT | MUST | MUST | Suspension must preserve prior history and authority basis. |
| `REACTIVATES` | Temporal / lifecycle | `EVENT_DERIVED` | OF-22, OF-16 | ANY_GOVERNED_OBJECT | MUST | MUST | Implements Authorized Resumption; technical recovery alone is insufficient. |
| `RETIRES` | Temporal / lifecycle | `EVENT_DERIVED` | OF-22, OF-16 | ANY_GOVERNED_OBJECT | MUST | MUST | Retirement preserves historical records. |
| `RECOVERS_FROM` | Temporal / lifecycle | `EVENT_DERIVED` | ANY_GOVERNED_OBJECT | OF-22 | MAY | MAY | Technical recovery does not establish assurance restoration or authorized resumption. |

## Appendix E — Controlled R/C/V Interpretation Notes

When recording R/C/V:
1. define the exact subject and scope;
2. identify the selected CIF profile;
3. record evidence and limitations;
4. apply the R, C, and V criteria independently;
5. preserve dissent or alternate interpretations where material;
6. do not calculate a single overall CIF score.

Practitioner disagreement should be classified where possible as:
- evidence difference;
- boundary difference;
- semantic interpretation difference;
- external-expertise difference;
- value judgment difference;
- framework ambiguity.

Repeated framework ambiguity is evidence for amendment review.

## Appendix F — Amendment CIF-AMD-001 Summary

CIF-AMD-001 makes the following controlled changes without altering the 22-family Core or 29 Core invariants:

1. Restores four non-entailments lost during v0.4 consolidation:
   - `Offer ≠ Acceptance`
   - `Receipt ≠ Validation`
   - `Validation ≠ Acceptance`
   - `Correction ≠ Supersession`
2. Separates OF-12 Assumption Proposition from OF-16 Assumption Adoption.
3. Adds Actor subtype guidance plus `OCCUPIES_ROLE`, `REPRESENTS`, and `ACTS_ON_BEHALF_OF`.
4. Defines the machine-accountability boundary.
5. Publishes the complete relationship representation/source-target registry.
6. Operationalizes R/C/V status criteria.
7. Converts CIF profiles from object lists into minimum conformance obligations.
8. Defines `UNKNOWN`, `UNRESOLVED`, `NOT_APPLICABLE`, `NOT_ASSESSED`, and null.
9. Clarifies Dependency versus Reliance and adds reciprocal non-entailment.
10. Replaces presumptive “legitimate Purpose” language with stated/adopted/authorized Purpose plus external legitimacy boundary.
11. Adds bounded externality materiality guidance.
12. Updates implementation maturity to reflect controlled MRS and RCTS artifacts.

**External validation remains EV-0.**
