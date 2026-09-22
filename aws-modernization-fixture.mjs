export const AWS_M2_RECOMMENDATION_FIXTURE = {
  recommendations: [
    {
      id:'AWSREC-CLAIMS-01',
      applicationId:'APP-CLAIMS-ADMIN',
      strategy:'Replatform',
      targetDestination:'Amazon Elastic Container Service (ECS)',
      transformationTool:'App2Container',
      reasoning:'Synthetic fixture only: managed container target is plausible for the illustrative application.',
      confidenceScore:72,
      assessedAt:'2026-09-21'
    },
    {
      id:'AWSREC-CLAIMS-02',
      applicationId:'APP-CLAIMS-ADMIN',
      strategy:'Rehost',
      targetDestination:'Amazon Elastic Cloud Compute (EC2)',
      transformationTool:'Application Migration Service',
      reasoning:'Synthetic fixture only: lower-change migration path retained as an alternative.',
      confidenceScore:84,
      assessedAt:'2026-09-21'
    }
  ]
};

export const AWS_M2_SERVER_CSV_FIXTURE = `serverId,hostName,osName,osVersion,hypervisor
srv-001,claims-app-01,Red Hat Enterprise Linux,8.8,VMware
srv-002,claims-db-01,Oracle Linux,8.7,VMware
`;
