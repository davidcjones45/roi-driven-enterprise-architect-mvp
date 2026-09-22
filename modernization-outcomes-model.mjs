import { stableId } from './authority-model.mjs';
import { economicsForAlternative } from './modernization-economics-model.mjs';

export const CUTOVER_OUTCOMES = [
  'Completed as planned',
  'Completed with issues',
  'Rolled back',
  'Partially completed',
  'Cancelled',
  'Not recorded'
];

const list = value => Array.isArray(value)
  ? value.filter(Boolean)
  : String(value || '').split(/[;,\n]/).map(v=>v.trim()).filter(Boolean);

const numberOrNull = value => {
  if(value === null || value === undefined || value === '') return null;
  const n=Number(value);
  return Number.isFinite(n) ? n : null;
};

const clamp01 = value => {
  const n=numberOrNull(value);
  if(n === null) return null;
  return Math.max(0,Math.min(1,n>1?n/100:n));
};

export function forecastSnapshot(applicationId,alternativeId,workspace={}){
  const alt=(workspace.alternatives||[]).find(x=>x.id===alternativeId&&x.applicationId===applicationId)||{};
  const economics=economicsForAlternative(applicationId,alternativeId,workspace.economicLines||[]);
  return {
    applicationId,
    alternativeId,
    provider:alt.provider||'Provider neutral',
    strategyClass:alt.strategyClass||'',
    alternativeName:alt.name||alternativeId,
    forecastConfidence:clamp01(alt.confidence),
    evidenceCompleteness:clamp01(alt.evidenceCompleteness),
    plannedDurationMonths:null,
    plannedEngineeringHours:null,
    plannedTransitionCost:economics.transitionCost||null,
    plannedAnnualRunCost:economics.targetAnnualCost||null,
    plannedAnnualBenefit:economics.riskAdjustedAnnualBenefit||null,
    capturedAt:new Date().toISOString(),
    source:'Current modernization forecast snapshot'
  };
}

export function normalizeOutcome(raw={},workspace={}){
  const seeded=forecastSnapshot(raw.applicationId||'',raw.alternativeId||'',workspace);
  const planned={
    durationMonths:numberOrNull(raw.plannedDurationMonths ?? raw.planned?.durationMonths ?? seeded.plannedDurationMonths),
    engineeringHours:numberOrNull(raw.plannedEngineeringHours ?? raw.planned?.engineeringHours ?? seeded.plannedEngineeringHours),
    transitionCost:numberOrNull(raw.plannedTransitionCost ?? raw.planned?.transitionCost ?? seeded.plannedTransitionCost),
    annualRunCost:numberOrNull(raw.plannedAnnualRunCost ?? raw.planned?.annualRunCost ?? seeded.plannedAnnualRunCost),
    annualBenefit:numberOrNull(raw.plannedAnnualBenefit ?? raw.planned?.annualBenefit ?? seeded.plannedAnnualBenefit),
    forecastConfidence:clamp01(raw.forecastConfidence ?? raw.planned?.forecastConfidence ?? seeded.forecastConfidence),
    evidenceCompleteness:clamp01(raw.evidenceCompleteness ?? raw.planned?.evidenceCompleteness ?? seeded.evidenceCompleteness)
  };
  const actual={
    durationMonths:numberOrNull(raw.actualDurationMonths ?? raw.actual?.durationMonths),
    engineeringHours:numberOrNull(raw.actualEngineeringHours ?? raw.actual?.engineeringHours),
    transitionCost:numberOrNull(raw.actualTransitionCost ?? raw.actual?.transitionCost),
    annualRunCost:numberOrNull(raw.actualAnnualRunCost ?? raw.actual?.annualRunCost),
    annualBenefit:numberOrNull(raw.actualAnnualBenefit ?? raw.actual?.annualBenefit)
  };

  return {
    ...raw,
    id:raw.id||stableId(`${raw.applicationId||'app'}-${raw.alternativeId||'alt'}-${raw.completedAt||'outcome'}`,'MOUT'),
    applicationId:raw.applicationId||'',
    alternativeId:raw.alternativeId||'',
    provider:raw.provider||seeded.provider,
    strategyClass:raw.strategyClass||seeded.strategyClass,
    alternativeName:raw.alternativeName||seeded.alternativeName,
    completedAt:raw.completedAt||'',
    cutoverOutcome:CUTOVER_OUTCOMES.includes(raw.cutoverOutcome)?raw.cutoverOutcome:'Not recorded',
    rollbackOccurred:raw.rollbackOccurred===true,
    incidentCount:Math.max(0,Math.floor(numberOrNull(raw.incidentCount)||0)),
    downtimeMinutes:Math.max(0,numberOrNull(raw.downtimeMinutes)||0),
    dependencySurpriseCount:Math.max(0,Math.floor(numberOrNull(raw.dependencySurpriseCount)||0)),
    planned,
    actual,
    architectureDeviation:raw.architectureDeviation||'',
    dependencySurprises:raw.dependencySurprises||'',
    lessonsLearned:raw.lessonsLearned||'',
    evidenceRefs:list(raw.evidenceRefs),
    source:raw.source||'',
    sourceOwner:raw.sourceOwner||'',
    status:raw.status||'Observed outcome'
  };
}

export function outcomeIssues(raw={},workspace={}){
  const o=normalizeOutcome(raw,workspace);
  const issues=[];
  if(!o.applicationId) issues.push('Outcome requires an application.');
  if(!o.alternativeId) issues.push('Outcome requires the implemented alternative.');
  if(!o.completedAt) issues.push('Outcome completion date is required.');
  if(!o.evidenceRefs.length&&!o.source) issues.push('Outcome requires evidence references or a source.');
  const actualValues=Object.values(o.actual).filter(v=>v!==null);
  if(!actualValues.length) issues.push('At least one actual outcome metric is required.');
  return {valid:issues.length===0,issues,outcome:o};
}

function variance(planned,actual){
  if(planned===null||actual===null) return {planned,actual,absolute:null,percent:null};
  const absolute=actual-planned;
  const percent=planned!==0?absolute/planned:null;
  return {planned,actual,absolute,percent};
}

export function outcomeVariance(raw={},workspace={}){
  const o=normalizeOutcome(raw,workspace);
  return {
    outcomeId:o.id,
    applicationId:o.applicationId,
    alternativeId:o.alternativeId,
    duration:variance(o.planned.durationMonths,o.actual.durationMonths),
    engineeringHours:variance(o.planned.engineeringHours,o.actual.engineeringHours),
    transitionCost:variance(o.planned.transitionCost,o.actual.transitionCost),
    annualRunCost:variance(o.planned.annualRunCost,o.actual.annualRunCost),
    annualBenefit:variance(o.planned.annualBenefit,o.actual.annualBenefit)
  };
}

export function forecastErrorSummary(raw={},workspace={}){
  const v=outcomeVariance(raw,workspace);
  const values=[v.duration,v.engineeringHours,v.transitionCost,v.annualRunCost,v.annualBenefit]
    .filter(x=>x.percent!==null)
    .map(x=>Math.abs(x.percent));
  return {
    comparableMetrics:values.length,
    meanAbsolutePercentageError:values.length?values.reduce((a,b)=>a+b,0)/values.length:null
  };
}

export function confidenceObservation(raw={},workspace={}){
  const o=normalizeOutcome(raw,workspace);
  const error=forecastErrorSummary(o,workspace);
  return {
    outcomeId:o.id,
    provider:o.provider,
    strategyClass:o.strategyClass,
    forecastConfidence:o.planned.forecastConfidence,
    comparableMetrics:error.comparableMetrics,
    meanAbsolutePercentageError:error.meanAbsolutePercentageError,
    note:'Descriptive confidence-versus-error evidence only; not a probabilistic calibration claim.'
  };
}

export function learningSummary(outcomes=[],workspace={}){
  const normalized=outcomes.map(x=>normalizeOutcome(x,workspace));
  const groups=new Map();

  for(const o of normalized){
    const key=`${o.provider}||${o.strategyClass||'unknown'}`;
    if(!groups.has(key)) groups.set(key,[]);
    groups.get(key).push(o);
  }

  const result=[...groups.entries()].map(([key,items])=>{
    const [provider,strategyClass]=key.split('||');
    const variances=items.map(x=>outcomeVariance(x,workspace));
    const avgPercent=field=>{
      const vals=variances.map(v=>v[field].percent).filter(v=>v!==null);
      return vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null;
    };
    const avgError=items.map(x=>forecastErrorSummary(x,workspace).meanAbsolutePercentageError).filter(v=>v!==null);
    return {
      provider,
      strategyClass,
      outcomeCount:items.length,
      avgDurationVariancePercent:avgPercent('duration'),
      avgTransitionCostVariancePercent:avgPercent('transitionCost'),
      avgRunCostVariancePercent:avgPercent('annualRunCost'),
      avgBenefitVariancePercent:avgPercent('annualBenefit'),
      avgForecastAbsoluteError:avgError.length?avgError.reduce((a,b)=>a+b,0)/avgError.length:null,
      rollbackCount:items.filter(x=>x.rollbackOccurred).length,
      incidentCount:items.reduce((n,x)=>n+x.incidentCount,0),
      dependencySurpriseCount:items.reduce((n,x)=>n+x.dependencySurpriseCount,0),
      lessons:items.map(x=>x.lessonsLearned).filter(Boolean)
    };
  });

  return {
    groups:result.sort((a,b)=>a.provider.localeCompare(b.provider)||a.strategyClass.localeCompare(b.strategyClass)),
    outcomeCount:normalized.length,
    authorityState:'Historical outcome evidence only. It must not automatically select a future provider, strategy, or architecture.'
  };
}

export function institutionalEvidence(outcomes=[],workspace={}){
  return outcomes.map(x=>{
    const o=normalizeOutcome(x,workspace);
    return {
      id:o.id,
      applicationId:o.applicationId,
      alternativeId:o.alternativeId,
      provider:o.provider,
      strategyClass:o.strategyClass,
      completedAt:o.completedAt,
      cutoverOutcome:o.cutoverOutcome,
      rollbackOccurred:o.rollbackOccurred,
      incidentCount:o.incidentCount,
      downtimeMinutes:o.downtimeMinutes,
      dependencySurpriseCount:o.dependencySurpriseCount,
      variance:outcomeVariance(o,workspace),
      confidenceObservation:confidenceObservation(o,workspace),
      architectureDeviation:o.architectureDeviation,
      dependencySurprises:o.dependencySurprises,
      lessonsLearned:o.lessonsLearned,
      evidenceRefs:o.evidenceRefs,
      source:o.source,
      status:o.status
    };
  });
}
