export const M3_DEPENDENCY_FIXTURE = {
  applications:[
    {id:'APP-CLAIMS-ADMIN',name:'Claims Administration'},
    {id:'APP-CUSTOMER-MASTER',name:'Customer Master'},
    {id:'APP-REPORTING',name:'Regulatory Reporting'},
    {id:'APP-PORTAL',name:'Customer Portal'}
  ],
  dependencies:[
    {
      id:'DEP-CLAIMS-CUSTOMER',
      sourceId:'APP-CLAIMS-ADMIN',targetId:'APP-CUSTOMER-MASTER',
      dependencyType:'data',direction:'DIRECTED',criticality:'High',
      migrationCoupling:'Mandatory',confidence:.9,resolutionState:'Resolved',
      sequencingRule:'TARGET_BEFORE_SOURCE',evidenceRefs:['EVD-DEP-001']
    },
    {
      id:'DEP-CLAIMS-REPORTING',
      sourceId:'APP-CLAIMS-ADMIN',targetId:'APP-REPORTING',
      dependencyType:'batch',direction:'DIRECTED',criticality:'High',
      migrationCoupling:'High',confidence:.8,resolutionState:'Resolved',
      sequencingRule:'SOURCE_BEFORE_TARGET',evidenceRefs:['EVD-DEP-002']
    },
    {
      id:'DEP-PORTAL-CLAIMS',
      sourceId:'APP-PORTAL',targetId:'APP-CLAIMS-ADMIN',
      dependencyType:'integration',direction:'DIRECTED',criticality:'High',
      migrationCoupling:'Medium',confidence:.75,resolutionState:'Resolved',
      sequencingRule:'None',evidenceRefs:['EVD-DEP-003']
    }
  ]
};
