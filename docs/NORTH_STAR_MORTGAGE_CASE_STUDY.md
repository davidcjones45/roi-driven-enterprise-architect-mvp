# North Star Mortgage: a bounded-AI governance demonstrator

The North Star Mortgage demonstrator shows how a community-bank mortgage case can be evaluated without allowing software—or an AI assistant—to make a credit decision.

**Live demonstrator:** https://roi-ea-integrated-demo-v01.vercel.app/

## The controlled case

The case is entirely synthetic. It represents a first-time home-purchase application whose financial indicators are close enough to fictional policy boundaries to require evidence review rather than an automated conclusion. Protected-class data and applicant age are excluded from the execution projection. The fictional policy is not attributed to any real bank, investor, regulator, or mortgage product.

The built-in case produces these deterministic comparisons:

| Measure | Calculated result | Controlled interpretation |
| --- | ---: | --- |
| Credit score | 725 | Within the fictional standard |
| Combined loan-to-value ratio | 94.19% | Within the fictional standard |
| Total debt-to-income ratio | 44.68% | Within a fictional exception-review band |
| Post-closing reserves | 1.54 months | Within a fictional exception-review band |

Two evidence items remain unresolved: overtime-income continuity evidence has not been accepted, and a required current asset statement is missing. The demonstrator therefore reports **insufficient evidence**, identifies a **manual exception-review candidate**, and abstains from a decision.

## Four distinct governance layers

The integrated trace keeps four forms of work separate:

1. **ROI-EA** calculates the permitted financial measures, traces their inputs and compares them with fictional policy. It does not approve, deny, determine eligibility, price, counteroffer, issue a notice or establish realized ROI.
2. **ERIR** attempts read-only retrieval of controlled regulatory-source identifiers. A returned record is retrieval evidence—not a conclusion about applicability, legal sufficiency, compliance or control effectiveness.
3. **FACEM** preserves the differences among access, evidence, recommendation, authority, acceptance, accountability and organizational commitment. No technical connection or imported workbook creates bank authority or commitment.
4. **BACRM** constrains the Mortgage Evidence Readiness and Consistency Assistant to deterministic calculations, evidence-gap detection, trace preparation and abstention. Approval, denial, pricing, eligibility, waiver, notices and consequential record-writing are prohibited.

The final integrated state is:

> **Awaiting evidence and qualified human review; no credit decision.**

## Controlled spreadsheet ingestion

Users may download and complete the supplied `MTG-IMPORT-V0.2` workbook. Import is fail-closed: the browser accepts only the four approved sheets, sentinel, headers and controlled fields. It rejects formulas, macros, external components, extra sheets, unknown columns, protected fields, unsafe URLs and invalid identifiers before changing the active case. Accepted data remain in browser-session memory and cannot create credit or action authority.

## What the demonstrator establishes—and what it does not

The implementation demonstrates inspectable separation of calculation, source retrieval, organizational authority and bounded AI operation. It also preserves a viable manual path and a pending human-disposition record.

It does **not** establish approval, denial, eligibility, pricing, fair-lending performance, legal compliance, model validity, production safety, operational effectiveness or realized return on investment. Federation value (`C2 − C1`) and bounded-AI value (`C3 − C2`) remain separately identified but unquantified because no member-specific operating evidence or measured AI-performance evidence has been supplied.

## Public source context

The demonstrator links to authoritative source candidates, including [Regulation B](https://www.consumerfinance.gov/rules-policy/regulations/1002/), [HMDA/Regulation C](https://www.consumerfinance.gov/rules-policy/regulations/1003/4/), the [Fair Housing Act lending provision](https://uscode.house.gov/view.xhtml?req=%28title%3A42%20section%3A3605%20edition%3Aprelim%29), the FDIC's [community-bank third-party risk guide](https://www.fdic.gov/news/financial-institution-letters/2024/third-party-risk-management-guide-community-banks), and the voluntary [NIST AI Risk Management Framework](https://www.nist.gov/itl/ai-risk-management-framework). Their inclusion identifies possible sources for qualified review; it does not determine applicability.

## Verification status

- Automated suite: **57 passed, 0 failed**
- Production spreadsheet import: **manually confirmed**
- Production integrated trace: **independently confirmed**
- Production commit: `9c0d872`

© 2026 David C. Jones. All rights reserved.

[AI at Human Scale](https://www.aiathumanscale.com/)
