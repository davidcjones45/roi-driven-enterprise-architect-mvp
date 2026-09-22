import test from 'node:test';
import assert from 'node:assert/strict';
import { awsDiscoveryDependencies } from './aws-dependency-adapter.mjs';

test('AWS connection evidence remains unresolved when application mapping is incomplete',()=>{
  const result=awsDiscoveryDependencies([
    {fileType:'sourceProcessConnection',sourceReference:'src.csv',records:[
      {id:'R1',row:{sourceServerId:'S1',destinationServerId:'S2',protocol:'tcp',destinationPort:'443'}}
    ]}
  ]);
  assert.equal(result.dependencies.length,0);
  assert.equal(result.unresolved.length,1);
});

test('AWS connection maps to partially resolved dependency only when both resources map uniquely',()=>{
  const result=awsDiscoveryDependencies([
    {fileType:'applicationResourceAssociation',records:[
      {row:{applicationId:'APP-A',resourceId:'S1'}},
      {row:{applicationId:'APP-B',resourceId:'S2'}}
    ]},
    {fileType:'sourceProcessConnection',sourceReference:'src.csv',records:[
      {id:'R1',row:{sourceServerId:'S1',destinationServerId:'S2',protocol:'tcp',destinationPort:'443'}}
    ]}
  ]);
  assert.equal(result.dependencies.length,1);
  assert.equal(result.dependencies[0].sourceId,'APP-A');
  assert.equal(result.dependencies[0].targetId,'APP-B');
  assert.equal(result.dependencies[0].migrationCoupling,'Unknown');
  assert.equal(result.dependencies[0].resolutionState,'Partially resolved');
});
