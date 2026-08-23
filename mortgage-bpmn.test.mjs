import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {importMortgageBpmn, analyzeBoundedAiOpportunities, MAX_MORTGAGE_BPMN_BYTES} from './mortgage-bpmn.mjs';

const fixtureUrl=new URL('./assets/North-Star-Mortgage-Workflow-v0.1.bpmn', import.meta.url);

test('controlled mortgage BPMN fixture imports through the bounded subset', async()=>{
  const xml=await readFile(fixtureUrl,'utf8');
  const model=importMortgageBpmn(xml);
  assert.equal(model.valid,true,model.errors.join('\n'));
  assert.equal(model.process.id,'Process_NorthStarMortgage');
  assert.equal(model.process.isExecutable,'false');
  assert.equal(model.nodes.filter(node=>node.type==='startEvent').length,1);
  assert.equal(model.nodes.filter(node=>node.type==='endEvent').length,3);
  assert.equal(model.flows.length,13);
  assert.equal(model.limits.executionAuthorized,false);
  assert.equal(model.limits.fullBpmnValidation,false);
});

test('analysis identifies bounded support while preserving human tasks and gateways', async()=>{
  const model=importMortgageBpmn(await readFile(fixtureUrl,'utf8'));
  const analysis=analyzeBoundedAiOpportunities(model);
  assert.equal(analysis.valid,true,analysis.errors.join('\n'));
  assert.deepEqual(analysis.candidates.map(item=>item.nodeId),['Task_CheckEvidence','Task_CalculateMeasures','Task_ComparePolicy','Task_PrepareReviewTrace']);
  assert.equal(analysis.candidates.every(item=>item.authority==='NONE'),true);
  assert.equal(analysis.protectedHumanNodes.some(item=>item.nodeId==='Task_QualifiedReview'),true);
  assert.equal(analysis.protectedHumanNodes.some(item=>item.nodeId==='Task_RecordDisposition'),true);
  assert.equal(analysis.decisionGateways.some(item=>item.nodeId==='Gateway_AuthorizedDisposition'),true);
});

test('import rejects executable processes, scripts, entities, and dangling flows',()=>{
  const invalid=`<?xml version="1.0"?><!DOCTYPE x [<!ENTITY x "bad">]><bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"><bpmn:process id="P" isExecutable="true"><bpmn:startEvent id="S"/><bpmn:scriptTask id="X"/><bpmn:sequenceFlow id="F" sourceRef="S" targetRef="MISSING"/></bpmn:process></bpmn:definitions>`;
  const model=importMortgageBpmn(invalid);
  assert.equal(model.valid,false);
  assert.equal(model.errors.some(error=>error.includes('DOCTYPE')),true);
  assert.equal(model.errors.some(error=>error.includes('Entity')),true);
  assert.equal(model.errors.some(error=>error.includes('Script')),true);
  assert.equal(model.errors.some(error=>error.includes('isExecutable')),true);
  assert.equal(model.errors.some(error=>error.includes('unknown targetRef')),true);
});

test('analysis rejects consequential authority disguised as an AI candidate',()=>{
  const model={valid:true,nodes:[{id:'Task_Decide',type:'serviceTask',name:'Approve mortgage decision','aihs:aiCandidate':'bounded-support','aihs:purpose':'determine eligibility','aihs:authority':'credit approval'}]};
  const analysis=analyzeBoundedAiOpportunities(model);
  assert.equal(analysis.valid,false);
  assert.equal(analysis.errors.some(error=>error.includes('authority="none"')),true);
  assert.equal(analysis.errors.some(error=>error.includes('consequential')),true);
});

test('legacy parser fails closed immediately on an oversized BPMN source',()=>{
  const model=importMortgageBpmn('x'.repeat(MAX_MORTGAGE_BPMN_BYTES+1));
  assert.deepEqual(model,{valid:false,errors:[`BPMN XML exceeds the ${MAX_MORTGAGE_BPMN_BYTES}-byte controlled limit.`]});
});
