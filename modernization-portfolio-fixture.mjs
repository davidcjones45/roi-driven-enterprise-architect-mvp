export const M5_PORTFOLIO_FIXTURE={
  deliveryCapacities:[
    {id:'CAP-ARCH',type:'Architecture',availableFte:2,reservedFte:.5,maxConcurrent:3},
    {id:'CAP-DB',type:'Database engineering',availableFte:1,reservedFte:.25,maxConcurrent:2},
    {id:'CAP-TEST',type:'Testing / QA',availableFte:2,reservedFte:.5,maxConcurrent:3},
    {id:'CAP-SEC',type:'Security',availableFte:1,reservedFte:.5,maxConcurrent:2}
  ],
  deliveryDemands:[
    {applicationId:'APP-CLAIMS-ADMIN',alternativeId:'ALT-REPLATFORM',capacityType:'Architecture',requiredFte:.5,durationMonths:8},
    {applicationId:'APP-CLAIMS-ADMIN',alternativeId:'ALT-REPLATFORM',capacityType:'Database engineering',requiredFte:.75,durationMonths:6,critical:true},
    {applicationId:'APP-CLAIMS-ADMIN',alternativeId:'ALT-REPLATFORM',capacityType:'Testing / QA',requiredFte:1,durationMonths:5},
    {applicationId:'APP-CLAIMS-ADMIN',alternativeId:'ALT-REPLATFORM',capacityType:'Security',requiredFte:.5,durationMonths:4}
  ]
};