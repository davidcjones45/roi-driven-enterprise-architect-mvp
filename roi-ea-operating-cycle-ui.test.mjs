import assert from 'node:assert/strict';
import test from 'node:test';
import {
  cycleScreenForView,
  buildOperatingCycleShellModel,
  normalizeBpmnCycleSnapshot,
  bpmnCycleContextText
} from './roi-ea-operating-cycle-ui.mjs';

test('legacy ROI-EA views map into the five logical A8 screens without changing domain semantics',()=>{
  assert.equal(cycleScreenForView('overview'),'DECISION_OVERVIEW');
  assert.equal(cycleScreenForView('baseline'),'BUSINESS_CASE_EVIDENCE');
  assert.equal(cycleScreenForView('authority'),'ARCHITECTURE_AUTHORITY');
  assert.equal(cycleScreenForView('mortgage-demo'),'PROCESS_AI_ANALYSIS');
  assert.equal(cycleScreenForView('dossier'),'DECISION_EXECUTIVE_PACKAGE');
});

test('unknown view remains outside the cycle rather than being guessed',()=>{
  assert.equal(cycleScreenForView('unknown-view'),null);
});

test('shell model provides orientation only and infers no readiness, approval, authority, or recommendation',()=>{
  const model=buildOperatingCycleShellModel({currentView:'risk'});
  assert.equal(model.currentScreenKey,'PROCESS_AI_ANALYSIS');
  assert.equal(model.screens.length,5);
  assert.equal(model.readinessInferred,false);
  assert.equal(model.approvalInferred,false);
  assert.equal(model.authorizationInferred,false);
  assert.equal(model.recommendationInferred,false);
});

test('BPMN snapshot is bounded as read-only modeled evidence',()=>{
  const snapshot=normalizeBpmnCycleSnapshot({
    staged:true,
    reviewStatus:'REVIEWED_COMPLETE',
    sourceId:'SHA-1',
    candidateCount:4,
    dossierAvailable:true
  });
  assert.equal(snapshot.staged,true);
  assert.equal(snapshot.readOnlyVisualization,true);
  assert.equal(snapshot.executesWorkflow,false);
  assert.equal(snapshot.establishesProcessValidity,false);
  assert.equal(snapshot.createsAuthority,false);
  assert.equal(snapshot.createsComplianceConclusion,false);
});

test('BPMN context text explicitly preserves read-only non-entailment boundary',()=>{
  const text=bpmnCycleContextText({
    staged:true,
    reviewStatus:'REVIEWED_COMPLETE',
    candidateCount:2
  });
  assert.match(text,/read-only/i);
  assert.match(text,/no workflow execution/i);
  assert.match(text,/authority/i);
  assert.match(text,/compliance/i);
});
