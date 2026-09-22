// ROI-EA Application Modernization M6 â€” Azure and Google Cloud provider adapters.
// Provider outputs remain advisory evidence. Canonical modernization objects stay provider-neutral.

import { stableId } from './authority-model.mjs';
import { providerRecommendationAsEvidence } from './modernization-model.mjs';
import { parseCsv } from './aws-modernization-adapter.mjs';

export const PROVIDERS = Object.freeze({
  AZURE:'Microsoft Azure',
  GCP:'Google Cloud'
});

export const CANONICAL_STRATEGY_MAP = Object.freeze({
  // Common migration terminology used by Azure / Google Cloud guidance.
  'Rehost':'rehost',
  'Replatform':'replatform',
  'Refactor':'refactor',
  'Re-architect':'refactor',
  'Rearchitect':'refactor',
  'Replace':'replace',
  'Repurchase':'replace',
  'Retire':'retire',
  'Retain':'retain',
  'Relocate':'relocate',
  'Rebuild':'rebuild'
});

const first=(...values)=>values.find(v=>v!==undefined&&v!==null&&String(v).trim()!=='')||'';
const clamp01=value=>{
  if(value===undefined||value===null||value==='') return null;
  const n=Number(value);
  if(!Number.isFinite(n)) return null;
  return Math.max(0,Math.min(1,n>1?n/100:n));
};
const list=value=>Array.isArray(value)?value.filter(Boolean):String(value||'').split(/[;,\n]/).map(v=>v.trim()).filter(Boolean);

export function canonicalStrategy(value=''){
  return CANONICAL_STRATEGY_MAP[String(value||'').trim()]||'';
}

export function normalizeProviderRecommendation(raw={},options={}){
  const provider=options.provider||raw.provider||'';
  const applicationId=first(options.applicationId,raw.applicationId,raw.application?.id,raw.assetId,raw.workloadId);
  const strategy=first(raw.strategy,raw.migrationStrategy,raw.recommendedStrategy,raw.modernizationStrategy);
  const target=first(raw.targetDestination,raw.targetService,raw.recommendedTarget,raw.targetProduct,raw.azureTarget,raw.gcpTarget);
  const sourceSystem=first(options.sourceSystem,raw.sourceSystem,provider);
  const sourceReference=first(options.sourceReference,raw.sourceReference,raw.source,'');
  const confidence=clamp01(first(raw.confidence,raw.confidenceScore,raw.readinessConfidence,''));
  const evidence=providerRecommendationAsEvidence({
    id:raw.id||stableId(`${provider}-${applicationId}-${strategy}-${target}`,'PRA'),
    provider,applicationId,strategy,targetServiceRefs:target?[target]:[],
    reasoning:first(raw.reasoning,raw.rationale,raw.notes,''),
    confidence,source:sourceReference||sourceSystem,
    assessedAt:first(options.assessedAt,raw.assessedAt,raw.generatedAt,raw.analysisDate,'')
  });

  return {
    ...evidence,
    confidence,
    canonicalStrategy:canonicalStrategy(strategy),
    targetDestination:target,
    sourceSystem,
    sourceReference,
    readiness:first(raw.readiness,raw.migrationReadiness,raw.fit,''),
    monthlyCost:first(raw.monthlyCost,raw.estimatedMonthlyCost,raw.costPerMonth,''),
    annualCost:first(raw.annualCost,raw.estimatedAnnualCost,''),
    rawRecordType:raw.rawRecordType||'providerRecommendation',
    status:'Advisory evidence only'
  };
}

export function importRecommendationJson(payload,options={}){
  const parsed=typeof payload==='string'?JSON.parse(payload):payload;
  let records=[];
  if(Array.isArray(parsed)) records=parsed;
  else if(Array.isArray(parsed?.recommendations)) records=parsed.recommendations;
  else if(Array.isArray(parsed?.items)) records=parsed.items;
  else if(parsed&&typeof parsed==='object'&&(parsed.strategy||parsed.migrationStrategy||parsed.recommendedStrategy)) records=[parsed];
  else if(parsed&&typeof parsed==='object'){
    records=Object.entries(parsed).filter(([,v])=>v&&typeof v==='object').map(([k,v])=>({applicationId:v.applicationId||k,...v}));
  }
  const recommendations=records.map(r=>normalizeProviderRecommendation(r,options));
  return {
    provider:options.provider||'',
    sourceSystem:options.sourceSystem||'',
    sourceReference:options.sourceReference||'',
    importedAt:new Date().toISOString(),
    recommendations,
    warnings:recommendations.flatMap(r=>[
      !r.applicationId?`${r.id} has no resolvable application identifier.`:'',
      r.strategy&&!r.canonicalStrategy?`${r.id} has unmapped strategy: ${r.strategy}.`:''
    ].filter(Boolean))
  };
}

// Azure Migrate evidence imports.
// We intentionally classify the CSV by the user-selected export type because Microsoft
// can add/change columns across inventory/assessment experiences.
export const AZURE_EXPORT_TYPES=[
  'Applications inventory',
  'All inventory',
  'Dependency export',
  'Server assessment export',
  'Web app assessment export',
  'Other Azure Migrate CSV'
];

export function importAzureCsv(text,options={}){
  const exportType=AZURE_EXPORT_TYPES.includes(options.exportType)?options.exportType:'Other Azure Migrate CSV';
  const rows=parseCsv(text);
  return {
    provider:PROVIDERS.AZURE,
    sourceSystem:options.sourceSystem||'Azure Migrate',
    sourceReference:options.sourceReference||'',
    exportType,
    importedAt:new Date().toISOString(),
    records:rows.map((row,i)=>({
      id:stableId(`AZURE-${exportType}-${i+1}`,'AZEV'),
      row,
      status:'Provider evidence only'
    })),
    warnings:[]
  };
}

// Conservative Azure dependency normalization based on documented dependency-export fields.
export function azureDependencyEvidence(importResult={}){
  if(importResult.exportType!=='Dependency export') return [];
  return (importResult.records||[]).map(rec=>{
    const row=rec.row||{};
    return {
      id:stableId(`AZDEP-${first(row['Source server name'],row.sourceServer)}-${first(row['Destination server name'],row.destinationServer)}-${first(row['Destination port'],row.destinationPort)}`,'PDEP'),
      provider:PROVIDERS.AZURE,
      sourceServer:first(row['Source server name'],row.sourceServer),
      sourceApplication:first(row['Source application'],row.sourceApplication),
      sourceProcess:first(row['Source process'],row.sourceProcess),
      destinationServer:first(row['Destination server name'],row.destinationServer),
      destinationIp:first(row['Destination IP'],row.destinationIp),
      destinationApplication:first(row['Destination application'],row.destinationApplication),
      destinationProcess:first(row['Destination process'],row.destinationProcess),
      destinationPort:first(row['Destination port'],row.destinationPort),
      timeSlot:first(row['Timeslot'],row.timeslot),
      status:'Dependency evidence only â€” application mapping requires review',
      sourceEvidenceId:rec.id
    };
  });
}

// Google Cloud Migration Center documented report classes.
export const GCP_REPORT_TYPES=[
  'Assets inventory',
  'Assets performance',
  'Network dependencies',
  'Detailed pricing - servers',
  'Detailed pricing - databases',
  'Offline assessment CSV',
  'Other Migration Center CSV'
];

export function importGcpCsv(text,options={}){
  const reportType=GCP_REPORT_TYPES.includes(options.reportType)?options.reportType:'Other Migration Center CSV';
  const rows=parseCsv(text);
  return {
    provider:PROVIDERS.GCP,
    sourceSystem:options.sourceSystem||'Google Cloud Migration Center',
    sourceReference:options.sourceReference||'',
    reportType,
    importedAt:new Date().toISOString(),
    records:rows.map((row,i)=>({
      id:stableId(`GCP-${reportType}-${i+1}`,'GCPEV'),
      row,
      status:'Provider evidence only'
    })),
    warnings:[]
  };
}

export function gcpDependencyEvidence(importResult={}){
  if(importResult.reportType!=='Network dependencies') return [];
  return (importResult.records||[]).map(rec=>{
    const row=rec.row||{};
    return {
      id:stableId(`GCPDEP-${first(row.source,row['Source'],row.sourceIp,row['Source IP'])}-${first(row.destination,row['Destination'],row.destinationIp,row['Destination IP'])}-${first(row.port,row['Port'])}`,'PDEP'),
      provider:PROVIDERS.GCP,
      source:first(row.source,row['Source'],row.sourceIp,row['Source IP']),
      destination:first(row.destination,row['Destination'],row.destinationIp,row['Destination IP']),
      port:first(row.port,row['Port']),
      protocol:first(row.protocol,row['Protocol']),
      service:first(row.service,row['Service']),
      status:'Dependency evidence only â€” asset/application mapping requires review',
      sourceEvidenceId:rec.id
    };
  });
}

export function providerCandidateAlternative(raw={}){
  const r=normalizeProviderRecommendation(raw,{provider:raw.provider});
  if(!r.applicationId||!r.canonicalStrategy) return null;
  return {
    id:stableId(`${r.applicationId}-${r.provider}-${r.canonicalStrategy}-${r.targetDestination}`,'ALT'),
    applicationId:r.applicationId,
    name:r.provider + ' evidence candidate - ' + r.strategy + (r.targetDestination ? ' -> ' + r.targetDestination : ''),
    provider:r.provider,
    strategyClass:r.canonicalStrategy,
    description:'Candidate alternative derived from provider-generated recommendation evidence. Human review required.',
    targetArchitecture:r.targetDestination||'',
    confidence:r.confidence??0,
    evidenceCompleteness:0,
    evidenceRefs:[r.id],
    decisionStatus:'Candidate / provider evidence',
    sourceProviderAssessmentId:r.id
  };
}

export function providerCoexistenceSummary(providerAssessments=[]){
  const providers=[...new Set((providerAssessments||[]).map(x=>x.provider).filter(Boolean))].sort();
  return {
    providers,
    count:providerAssessments.length,
    multiProvider:providers.length>1,
    authorityState:'Provider evidence coexists; no provider is selected or ranked automatically.'
  };
}

