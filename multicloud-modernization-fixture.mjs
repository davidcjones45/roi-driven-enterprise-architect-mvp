export const M6_MULTICLOUD_FIXTURE={
  azureRecommendations:[
    {id:'AZ-REC-1',applicationId:'APP-CLAIMS-ADMIN',strategy:'Replatform',targetDestination:'Azure App Service',readiness:'Ready with conditions',confidenceScore:70,reasoning:'Synthetic Azure acceptance fixture.'},
    {id:'AZ-REC-2',applicationId:'APP-CLAIMS-ADMIN',strategy:'Rehost',targetDestination:'Azure Virtual Machines',confidenceScore:82,reasoning:'Synthetic Azure acceptance fixture.'}
  ],
  gcpRecommendations:[
    {id:'GCP-REC-1',applicationId:'APP-CLAIMS-ADMIN',strategy:'Replatform',targetDestination:'Google Cloud Run',confidenceScore:68,reasoning:'Synthetic Google Cloud acceptance fixture.'},
    {id:'GCP-REC-2',applicationId:'APP-CLAIMS-ADMIN',strategy:'Rehost',targetDestination:'Compute Engine',confidenceScore:80,reasoning:'Synthetic Google Cloud acceptance fixture.'}
  ]
};
