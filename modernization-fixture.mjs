export const MODERNIZATION_FIXTURE = {
  applications: [
    {
      id:'APP-CLAIMS-ADMIN',
      name:'Claims Administration',
      description:'Synthetic legacy claims-processing example for modernization workflow testing.',
      applicationType:'Business application',
      businessOwner:'Claims Operations',
      technicalOwner:'Application Engineering',
      lifecycleStatus:'Strategic',
      businessCriticality:'High',
      strategicImportance:'High',
      expectedRemainingLife:'10+ years',
      evidenceRefs:['EVD-MOD-001','EVD-MOD-002']
    }
  ],
  constraints: [
    {
      id:'CON-DOWNTIME',
      name:'Maximum cutover outage',
      type:'HARD',
      condition:'Production cutover may not exceed the approved business outage window.',
      source:'Synthetic business continuity requirement',
      authority:'Business continuity owner',
      status:'Active',
      evaluation:'Not assessed',
      evidenceRefs:['EVD-MOD-003']
    },
    {
      id:'CON-MANAGED',
      name:'Prefer managed services',
      type:'SOFT',
      condition:'Prefer managed services where operational fit and economics are supported.',
      source:'Synthetic platform strategy',
      authority:'Architecture',
      status:'Active',
      evaluation:'Not assessed'
    }
  ],
  alternatives: [
    {
      id:'ALT-REHOST',
      applicationId:'APP-CLAIMS-ADMIN',
      name:'Rapid rehost',
      provider:'Provider neutral',
      strategyClass:'rehost',
      description:'Move largely unchanged to cloud-hosted infrastructure.',
      targetArchitecture:'Cloud virtual machines plus current middleware/database where supported.',
      oneTimeCost:420000,
      annualRunCost:650000,
      estimatedDuration:'4–7 months',
      confidence:.78,
      evidenceCompleteness:.72,
      businessBenefits:['Datacenter exit acceleration'],
      technicalBenefits:['Infrastructure standardization'],
      evidenceRefs:['EVD-MOD-001']
    },
    {
      id:'ALT-REPLATFORM',
      applicationId:'APP-CLAIMS-ADMIN',
      name:'Managed-platform replatform',
      provider:'Provider neutral',
      strategyClass:'replatform',
      description:'Move to managed compute and database services with bounded application changes.',
      targetArchitecture:'Managed container/application runtime plus managed relational database, subject to compatibility validation.',
      oneTimeCost:780000,
      annualRunCost:480000,
      estimatedDuration:'7–12 months',
      confidence:.66,
      evidenceCompleteness:.61,
      businessBenefits:['Reduced operational burden','Improved resilience'],
      technicalBenefits:['Managed runtime','Managed database candidate'],
      evidenceRefs:['EVD-MOD-001','EVD-MOD-002']
    },
    {
      id:'ALT-REFACTOR',
      applicationId:'APP-CLAIMS-ADMIN',
      name:'Incremental refactor',
      provider:'Provider neutral',
      strategyClass:'refactor',
      description:'Replatform first, then incrementally extract high-change bounded capabilities.',
      targetArchitecture:'Managed runtime with API/event seams and selective component extraction.',
      oneTimeCost:1450000,
      annualRunCost:430000,
      estimatedDuration:'14–24 months',
      confidence:.51,
      evidenceCompleteness:.48,
      businessBenefits:['Higher long-term change agility'],
      technicalBenefits:['Reduced coupling over time'],
      evidenceRefs:['EVD-MOD-002']
    }
  ],
  assessments: [
    {
      id:'MOD-CLAIMS-001',
      applicationId:'APP-CLAIMS-ADMIN',
      assessmentDate:'2026-09-21',
      evidenceCompleteness:.68,
      overallConfidence:.64,
      candidateAlternativeIds:['ALT-REHOST','ALT-REPLATFORM','ALT-REFACTOR'],
      hardConstraintIds:['CON-DOWNTIME'],
      preferenceConstraintIds:['CON-MANAGED'],
      leastRegretNextMove:'Validate production dependencies, database-specific constructs, and the allowed cutover window before selecting replatform versus incremental refactor.',
      reviewStatus:'Draft / synthetic',
      reviewAuthority:'Qualified human architect',
      businessSignificance:{value:'High',confidence:.85,evidenceRefs:['EVD-MOD-001'],rationale:'Core claims operations depend on the application.'},
      functionalAdequacy:{value:'Medium',confidence:.65,evidenceRefs:['EVD-MOD-001'],rationale:'Core functions remain useful, but workflow friction is reported.'},
      technicalHealth:{value:'Low',confidence:.75,evidenceRefs:['EVD-MOD-002'],rationale:'Legacy runtime and middleware increase lifecycle exposure.'},
      dataSuitability:{value:'Medium',confidence:.48,assumptions:['Database-specific constructs require profiling.'],rationale:'Portability is plausible but not yet demonstrated.'},
      integrationComplexity:{value:'High',confidence:.55,assumptions:['Several interfaces require production validation.'],rationale:'Multiple synchronous and batch dependencies are expected.'},
      securityReadiness:{value:'Medium',confidence:.60,evidenceRefs:['EVD-MOD-002'],rationale:'Target controls have not yet been fully mapped.'},
      operationalReadiness:{value:'Low',confidence:.67,evidenceRefs:['EVD-MOD-002'],rationale:'Deployment and observability maturity are incomplete.'},
      organizationalReadiness:{value:'Medium',confidence:.58,assumptions:['Cloud operating skills require validation.'],rationale:'Some platform capability is assumed but not fully evidenced.'},
      economicAttractiveness:{value:'Medium',confidence:.62,assumptions:['Cloud run-cost estimates require provider pricing validation.'],rationale:'Replatform may reduce run cost but transition cost is material.'},
      transformationComplexity:{value:'High',confidence:.72,evidenceRefs:['EVD-MOD-001'],rationale:'Database, integration, testing, and cutover changes are material.'},
      strategicLifecycle:{value:'Long-life',confidence:.80,evidenceRefs:['EVD-MOD-001'],rationale:'The application is assumed to remain strategically relevant for at least ten years.'}
    }
  ],
  providerAssessments: [
    {
      id:'PRA-AWS-DEMO',
      provider:'AWS',
      applicationId:'APP-CLAIMS-ADMIN',
      strategy:'Replatform',
      reasoning:'Illustrative provider evidence only; not an actual AWS assessment.',
      confidence:.72,
      source:'Synthetic M1 fixture',
      assessedAt:'2026-09-21',
      status:'Advisory evidence only'
    }
  ]
};
