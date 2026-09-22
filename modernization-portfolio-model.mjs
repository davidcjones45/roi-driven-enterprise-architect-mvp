// ROI-EA Application Modernization M5 — portfolio readiness and delivery capacity.
// Produces portfolio decision-support views, not an automatic modernization schedule.

import { assessmentIssues, normalizeModernizationAssessment } from './modernization-model.mjs';
import { candidateTransitionWaves, unresolvedDependencies } from './modernization-dependency-model.mjs';
import { economicsCompleteness, economicsForAlternative, investmentMetrics } from './modernization-economics-model.mjs';

export const PORTFOLIO_STATES = [
  'READY_TO_PLAN',
  'BLOCKED',
  'DEFERRED_FOR_EVIDENCE',
  'NO_VIABLE_ALTERNATIVE',
  'NOT_ASSESSED'
];

export const CAPACITY_TYPES = [
  'Architecture','Application engineering','Database engineering','Cloud platform',
  'Security','Testing / QA','Network','Data migration','Operations / SRE',
  'Business SME','Vendor / third party','Change management','Other'
];

const num=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
const clamp=v=>Math.max(0,num(v));

export function normalizeCapacity(raw={}){
  return {
    id:raw.id||`CAP-${String(raw.type||raw.name||'OTHER').toUpperCase().replace(/[^A-Z0-9]+/g,'-')}`,
    type:CAPACITY_TYPES.includes(raw.type)?raw.type:'Other',
    availableFte:clamp(raw.availableFte),
    reservedFte:clamp(raw.reservedFte),
    maxConcurrent:Math.max(0,Math.floor(num(raw.maxConcurrent))),
    notes:raw.notes||''
  };
}

export function normalizeDemand(raw={}){
  return {
    applicationId:raw.applicationId||'',
    alternativeId:raw.alternativeId||'',
    capacityType:CAPACITY_TYPES.includes(raw.capacityType)?raw.capacityType:'Other',
    requiredFte:clamp(raw.requiredFte),
    durationMonths:clamp(raw.durationMonths),
    critical:raw.critical===true
  };
}

export function capacityAvailable(capacity={}){
  const c=normalizeCapacity(capacity);
  return Math.max(0,c.availableFte-c.reservedFte);
}

export function capacityAssessment(capacities=[],demands=[]){
  const normalizedCaps=capacities.map(normalizeCapacity);
  const normalizedDemands=demands.map(normalizeDemand);
  return normalizedCaps.map(c=>{
    const ds=normalizedDemands.filter(d=>d.capacityType===c.type);
    const peakDemand=ds.reduce((n,d)=>n+d.requiredFte,0);
    const available=capacityAvailable(c);
    return {
      type:c.type,availableFte:available,demandFte:peakDemand,
      constrained:peakDemand>available,
      shortfallFte:Math.max(0,peakDemand-available),
      maxConcurrent:c.maxConcurrent,
      demandCount:ds.length
    };
  });
}

function viableAlternatives(applicationId,workspace){
  const assessment=(workspace.assessments||[]).map(normalizeModernizationAssessment).find(a=>a.applicationId===applicationId);
  if(!assessment)return [];
  const hard=(workspace.constraints||[]).filter(c=>c.type==='HARD'&&c.status!=='Retired'&&c.evaluation==='Violated');
  return (workspace.alternatives||[])
    .filter(a=>a.applicationId===applicationId)
    .filter(a=>assessment.candidateAlternativeIds.includes(a.id))
    .filter(a=>!hard.some(c=>!c.alternativeIds?.length||c.alternativeIds.includes(a.id)));
}

export function applicationPortfolioState(application,workspace={}){
  const appId=application.id;
  const assessment=(workspace.assessments||[]).map(normalizeModernizationAssessment).find(a=>a.applicationId===appId);
  if(!assessment){
    return {applicationId:appId,state:'NOT_ASSESSED',reasons:['No modernization assessment exists.'],candidateAlternativeIds:[]};
  }

  const issues=assessmentIssues(assessment,{applications:workspace.applications||[]}).issues;
  const viable=viableAlternatives(appId,workspace);
  const blockingConstraints=(workspace.constraints||[]).filter(c=>
    c.type==='HARD'&&c.status!=='Retired'&&c.evaluation==='Violated'&&
    (!c.alternativeIds?.length||viable.some(a=>c.alternativeIds.includes(a.id)))
  );

  if(!viable.length){
    return {applicationId:appId,state:'NO_VIABLE_ALTERNATIVE',reasons:['No candidate alternative remains viable under current hard constraints.'],candidateAlternativeIds:[]};
  }

  if(blockingConstraints.length){
    return {applicationId:appId,state:'BLOCKED',reasons:blockingConstraints.map(c=>`Hard constraint violated: ${c.name||c.id}`),candidateAlternativeIds:viable.map(a=>a.id)};
  }

  const dependencyProblems=unresolvedDependencies(workspace.dependencies||[],{applications:workspace.applications||[]})
    .filter(x=>x.dependency.sourceId===appId||x.dependency.targetId===appId);

  const lowConfidence=(assessment.overallConfidence??0)<0.6 || (assessment.evidenceCompleteness??0)<0.6;
  if(issues.length || dependencyProblems.length || lowConfidence){
    return {
      applicationId:appId,state:'DEFERRED_FOR_EVIDENCE',
      reasons:[
        ...issues.slice(0,5),
        ...(lowConfidence?['Assessment confidence or evidence completeness is below 60%.']:[]),
        ...(dependencyProblems.length?[`${dependencyProblems.length} dependency issue(s) require review.`]:[])
      ],
      candidateAlternativeIds:viable.map(a=>a.id)
    };
  }

  return {applicationId:appId,state:'READY_TO_PLAN',reasons:['No current hard blocker detected in recorded evidence.'],candidateAlternativeIds:viable.map(a=>a.id)};
}

export function portfolioReadiness(workspace={}){
  const rows=(workspace.applications||[]).map(a=>applicationPortfolioState(a,workspace));
  return {
    rows,
    counts:Object.fromEntries(PORTFOLIO_STATES.map(s=>[s,rows.filter(r=>r.state===s).length]))
  };
}

export function economicSignals(applicationId,workspace={}){
  const alternatives=viableAlternatives(applicationId,workspace);
  return alternatives.map(a=>{
    const e=economicsForAlternative(applicationId,a.id,workspace.economicLines||[]);
    const completeness=economicsCompleteness(applicationId,a.id,workspace.economicLines||[]);
    const metrics=investmentMetrics(e,workspace.economicSettings||{});
    return {
      alternativeId:a.id,
      decisionReady:completeness.decisionReadyForEconomicComparison,
      npv:completeness.decisionReadyForEconomicComparison?metrics.npv:null,
      roi:completeness.decisionReadyForEconomicComparison?metrics.roi:null,
      payback:completeness.decisionReadyForEconomicComparison?metrics.simplePaybackYears:null,
      confidence:e.averageConfidence
    };
  });
}

export function portfolioPlan(workspace={}){
  const readiness=portfolioReadiness(workspace);
  const waves=(workspace.candidateTransitionWaves?.candidateWaves?.length
    ? workspace.candidateTransitionWaves
    : candidateTransitionWaves(workspace));

  const rows=readiness.rows.map(r=>{
    const app=(workspace.applications||[]).find(a=>a.id===r.applicationId)||{};
    const wave=waves.candidateWaves.find(w=>w.applicationIds.includes(r.applicationId));
    return {
      ...r,
      applicationName:app.name||r.applicationId,
      businessCriticality:app.businessCriticality||'Unknown',
      strategicImportance:app.strategicImportance||'Unknown',
      candidateWaveId:wave?.id||'',
      sequenceLayer:wave?.sequenceLayer??null,
      economics:economicSignals(r.applicationId,workspace)
    };
  });

  const capacity=capacityAssessment(workspace.deliveryCapacities||[],workspace.deliveryDemands||[]);
  return {
    rows,
    waves,
    capacity,
    constrainedCapacity:capacity.filter(x=>x.constrained),
    generatedAt:new Date().toISOString(),
    authorityState:'Portfolio decision support only — no automatic prioritization or authorization'
  };
}

export function nextPortfolioActions(plan={}){
  const actions=[];
  for(const row of plan.rows||[]){
    if(row.state==='BLOCKED') actions.push({applicationId:row.applicationId,action:'Resolve hard blocker before planning.'});
    else if(row.state==='DEFERRED_FOR_EVIDENCE') actions.push({applicationId:row.applicationId,action:'Close material evidence/readiness gaps before planning.'});
    else if(row.state==='NO_VIABLE_ALTERNATIVE') actions.push({applicationId:row.applicationId,action:'Reframe alternatives or constraints.'});
    else if(row.state==='NOT_ASSESSED') actions.push({applicationId:row.applicationId,action:'Perform modernization assessment.'});
  }
  for(const c of plan.constrainedCapacity||[]){
    actions.push({capacityType:c.type,action:`Resolve delivery-capacity shortfall of ${c.shortfallFte.toFixed(2)} FTE before committing overlapping work.`});
  }
  return actions;
}
