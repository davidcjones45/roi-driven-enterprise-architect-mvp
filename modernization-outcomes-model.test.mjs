import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeOutcome, outcomeIssues, outcomeVariance, forecastErrorSummary,
  confidenceObservation, learningSummary, institutionalEvidence
} from './modernization-outcomes-model.mjs';

const workspace={
  applications:[{id:'APP-1',name:'Claims'}],
  alternatives:[{id:'ALT-1',applicationId:'APP-1',name:'Replatform',provider:'AWS',strategyClass:'replatform',confidence:.7,evidenceCompleteness:.6}],
  economicLines:[
    {applicationId:'APP-1',lineType:'CURRENT_RUN_COST',amount:1000,confidence:.8,source:'S'},
    {applicationId:'APP-1',alternativeId:'ALT-1',lineType:'TRANSITION_COST',amount:500,confidence:.8,source:'S'},
    {applicationId:'APP-1',alternativeId:'ALT-1',lineType:'TARGET_RUN_COST',amount:700,confidence:.8,source:'S'},
    {applicationId:'APP-1',alternativeId:'ALT-1',lineType:'QUANTIFIED_BENEFIT',amount:100,confidence:.7,source:'S'}
  ]
};

test('outcome seeds planned economics but preserves actual separately',()=>{
  const o=normalizeOutcome({
    applicationId:'APP-1',alternativeId:'ALT-1',completedAt:'2026-09-22',
    actualTransitionCost:550,actualAnnualRunCost:720,actualAnnualBenefit:80,source:'Observed'
  },workspace);
  assert.equal(o.planned.transitionCost,500);
  assert.equal(o.actual.transitionCost,550);
  assert.equal(o.provider,'AWS');
});

test('outcome requires actual metric and provenance',()=>{
  const r=outcomeIssues({applicationId:'APP-1',alternativeId:'ALT-1',completedAt:'2026-09-22'},workspace);
  assert.equal(r.valid,false);
  assert.ok(r.issues.some(x=>x.includes('actual outcome metric')));
  assert.ok(r.issues.some(x=>x.includes('evidence')));
});

test('variance is actual minus planned',()=>{
  const v=outcomeVariance({
    applicationId:'APP-1',alternativeId:'ALT-1',completedAt:'2026-09-22',
    plannedTransitionCost:500,actualTransitionCost:600,source:'Observed'
  },workspace);
  assert.equal(v.transitionCost.absolute,100);
  assert.ok(Math.abs(v.transitionCost.percent-.2)<1e-9);
});

test('forecast error is descriptive and based only on comparable metrics',()=>{
  const e=forecastErrorSummary({
    applicationId:'APP-1',alternativeId:'ALT-1',completedAt:'2026-09-22',
    plannedTransitionCost:500,actualTransitionCost:550,
    plannedAnnualRunCost:700,actualAnnualRunCost:770,source:'Observed'
  },workspace);
  assert.equal(e.comparableMetrics,2);
  assert.ok(Math.abs(e.meanAbsolutePercentageError-.1)<1e-9);
});

test('confidence observation does not claim probabilistic calibration',()=>{
  const c=confidenceObservation({
    applicationId:'APP-1',alternativeId:'ALT-1',completedAt:'2026-09-22',
    actualTransitionCost:550,source:'Observed'
  },workspace);
  assert.match(c.note,/not a probabilistic calibration claim/i);
});

test('institutional learning groups historical outcomes without selecting future provider',()=>{
  const outcomes=[
    {applicationId:'APP-1',alternativeId:'ALT-1',completedAt:'2026-09-22',actualTransitionCost:550,actualAnnualRunCost:720,actualAnnualBenefit:80,source:'Observed'},
    {applicationId:'APP-1',alternativeId:'ALT-1',completedAt:'2026-10-22',actualTransitionCost:600,actualAnnualRunCost:750,actualAnnualBenefit:90,source:'Observed'}
  ];
  const l=learningSummary(outcomes,workspace);
  assert.equal(l.groups.length,1);
  assert.equal(l.groups[0].provider,'AWS');
  assert.equal(l.groups[0].outcomeCount,2);
  assert.match(l.authorityState,/must not automatically select/i);
});

test('institutional evidence preserves lessons and cutover observations',()=>{
  const rows=institutionalEvidence([{
    applicationId:'APP-1',alternativeId:'ALT-1',completedAt:'2026-09-22',
    actualTransitionCost:550,source:'Observed',incidentCount:1,
    lessonsLearned:'Validate batch dependencies earlier.'
  }],workspace);
  assert.equal(rows[0].incidentCount,1);
  assert.equal(rows[0].lessonsLearned,'Validate batch dependencies earlier.');
});
