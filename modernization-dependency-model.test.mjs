import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeDependency, dependencyIssues, connectedComponents,
  candidateTransitionWaves, blastRadius, topologicalLayers
} from './modernization-dependency-model.mjs';

test('normalizes provider-neutral dependency without inventing confidence',()=>{
  const d=normalizeDependency({sourceId:'APP-A',targetId:'APP-B',dependencyType:'data'});
  assert.equal(d.sourceProvider,'');
  assert.equal(d.confidence,null);
});

test('flags unresolved application endpoints and missing evidence',()=>{
  const result=dependencyIssues({
    sourceId:'APP-A',targetId:'APP-X',dependencyType:'integration',
    migrationCoupling:'High'
  },{applications:[{id:'APP-A'}]});
  assert.equal(result.valid,false);
  assert.ok(result.issues.some(x=>x.includes('APP-X')));
});

test('groups high and mandatory coupling but not medium by default',()=>{
  const groups=connectedComponents(['A','B','C'],[
    {sourceId:'A',targetId:'B',migrationCoupling:'High',resolutionState:'Resolved'},
    {sourceId:'B',targetId:'C',migrationCoupling:'Medium',resolutionState:'Resolved'}
  ]);
  assert.deepEqual(groups,[['A','B'],['C']]);
});

test('candidate waves are advisory and preserve standalone groups',()=>{
  const result=candidateTransitionWaves({
    applications:[{id:'A'},{id:'B'},{id:'C'}],
    dependencies:[
      {sourceId:'A',targetId:'B',migrationCoupling:'Mandatory',resolutionState:'Resolved',confidence:.8,evidenceRefs:['E1']}
    ]
  });
  assert.equal(result.authorityState,'Advisory analysis only');
  assert.equal(result.candidateWaves.length,2);
  assert.ok(result.candidateWaves.every(x=>x.status.includes('human review')));
});

test('sequencing cycle is surfaced rather than forced into an order',()=>{
  const result=candidateTransitionWaves({
    applications:[{id:'A'},{id:'B'},{id:'C'}],
    dependencies:[
      {id:'D1',sourceId:'A',targetId:'B',migrationCoupling:'Low',resolutionState:'Resolved',sequencingRule:'SOURCE_BEFORE_TARGET'},
      {id:'D2',sourceId:'B',targetId:'C',migrationCoupling:'Low',resolutionState:'Resolved',sequencingRule:'SOURCE_BEFORE_TARGET'},
      {id:'D3',sourceId:'C',targetId:'A',migrationCoupling:'Low',resolutionState:'Resolved',sequencingRule:'SOURCE_BEFORE_TARGET'}
    ]
  });
  assert.equal(result.sequencingCycle,true);
  assert.equal(result.candidateWaves.every(x=>x.sequenceLayer===null),true);
});

test('topological layers give precedence hints when acyclic',()=>{
  const result=topologicalLayers(['G1','G2','G3'],[
    {from:'G1',to:'G2'},{from:'G2',to:'G3'}
  ]);
  assert.equal(result.cycle,false);
  assert.deepEqual(result.layers,[['G1'],['G2'],['G3']]);
});

test('blast radius reports connected applications by depth',()=>{
  const result=blastRadius('A',[
    {id:'D1',sourceId:'A',targetId:'B',direction:'DIRECTED'},
    {id:'D2',sourceId:'B',targetId:'C',direction:'DIRECTED'}
  ],2);
  assert.equal(result.affected.length,2);
  assert.equal(result.affected.find(x=>x.applicationId==='C').depth,2);
});
