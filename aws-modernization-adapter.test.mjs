import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canonicalAwsStrategy, parseCsv, awsDiscoveryFileType,
  normalizeAwsRecommendation, importAwsRecommendationJson,
  importAwsDiscoveryCsv, proposalFromAwsRecommendation,
  awsAdapterAcceptance
} from './aws-modernization-adapter.mjs';

test('maps AWS 7R terms into canonical strategy classes',()=>{
  assert.equal(canonicalAwsStrategy('Rehost'),'rehost');
  assert.equal(canonicalAwsStrategy('Retirement'),'retire');
  assert.equal(canonicalAwsStrategy('Repurchase'),'replace');
  assert.equal(canonicalAwsStrategy('Refactor'),'refactor');
});

test('does not invent a confidence score when AWS input omits it',()=>{
  const r=normalizeAwsRecommendation({
    applicationId:'APP-1',strategy:'Replatform',targetDestination:'Amazon Elastic Container Service (ECS)'
  });
  assert.equal(r.confidence,null);
  assert.equal(r.status,'Advisory evidence only');
});

test('preserves AWS destination and transformation tool as evidence attributes',()=>{
  const r=normalizeAwsRecommendation({
    applicationId:'APP-1',
    strategyOption:{strategy:'Replatform',targetDestination:'AWS Fargate',toolName:'App2Container',isPreferred:true}
  });
  assert.equal(r.canonicalStrategy,'replatform');
  assert.equal(r.targetDestination,'AWS Fargate');
  assert.equal(r.transformationTool,'App2Container');
  assert.equal(r.isPreferred,true);
});

test('imports recommendation arrays without selecting a winner',()=>{
  const result=importAwsRecommendationJson({
    recommendations:[
      {applicationId:'APP-1',strategy:'Rehost'},
      {applicationId:'APP-1',strategy:'Replatform'}
    ]
  });
  assert.equal(result.recommendations.length,2);
  assert.equal(result.recommendations.every(x=>x.status==='Advisory evidence only'),true);
  assert.equal('winner' in result,false);
});

test('parses quoted CSV fields',()=>{
  const rows=parseCsv('id,name,description\n1,"Claims, Core","A ""quoted"" value"\n');
  assert.equal(rows[0].name,'Claims, Core');
  assert.equal(rows[0].description,'A "quoted" value');
});

test('recognizes AWS Application Discovery export filenames',()=>{
  assert.equal(awsDiscoveryFileType('123456789012_Server.csv'),'server');
  assert.equal(awsDiscoveryFileType('123456789012_ApplicationResourceAssociation.csv'),'applicationResourceAssociation');
  assert.equal(awsDiscoveryFileType('123456_destinationProcessConnection.csv'),'destinationProcessConnection');
});

test('imports discovery CSV as evidence without architecture conclusions',()=>{
  const result=importAwsDiscoveryCsv('123_Server.csv','serverId,hostName\nsrv-1,app01\n');
  assert.equal(result.fileType,'server');
  assert.equal(result.records.length,1);
  assert.equal(result.records[0].status,'Discovery evidence only');
  assert.equal('strategyClass' in result.records[0],false);
});

test('can create a candidate alternative while retaining provider-evidence status',()=>{
  const alt=proposalFromAwsRecommendation({
    id:'REC-1',applicationId:'APP-1',strategy:'Replatform',
    targetDestination:'Amazon Elastic Container Service (ECS)',confidence:.7
  });
  assert.equal(alt.strategyClass,'replatform');
  assert.equal(alt.provider,'AWS');
  assert.equal(alt.decisionStatus,'Candidate / provider evidence');
});

test('acceptance rejects unmapped strategy terminology',()=>{
  const result=importAwsRecommendationJson([{applicationId:'APP-1',strategy:'Teleport'}]);
  const acceptance=awsAdapterAcceptance(result);
  assert.equal(acceptance.valid,false);
  assert.ok(acceptance.issues.some(x=>x.includes('unmapped')));
});
