// ROI-EA AWS provider adapter v0.1 (M2)
// AWS-specific evidence is translated into the provider-neutral modernization model.
// Nothing in this module grants architecture, migration, cutover, financial,
// security, compliance, or production authority.

import { stableId } from './authority-model.mjs';
import { providerRecommendationAsEvidence } from './modernization-model.mjs';

export const AWS_PROVIDER = 'AWS';

export const AWS_STRATEGY_MAP = Object.freeze({
  'Rehost': 'rehost',
  'Retirement': 'retire',
  'Retire': 'retire',
  'Refactor': 'refactor',
  'Replatform': 'replatform',
  'Retain': 'retain',
  'Relocate': 'relocate',
  'Repurchase': 'replace'
});

export const AWS_DISCOVERY_FILE_TYPES = Object.freeze({
  'Application.csv': 'application',
  'ApplicationResourceAssociation.csv': 'applicationResourceAssociation',
  'NetworkInterface.csv': 'networkInterface',
  'Server.csv': 'server',
  'SystemPerformance.csv': 'systemPerformance',
  'Tags.csv': 'tags',
  'VMwareInfo.csv': 'vmwareInfo',
  'destinationProcessConnection.csv': 'destinationProcessConnection',
  'networkInterface.csv': 'networkInterface',
  'osInfo.csv': 'osInfo',
  'process.csv': 'process',
  'sourceProcessConnection.csv': 'sourceProcessConnection',
  'systemPerformance.csv': 'systemPerformance'
});

const list = value => Array.isArray(value)
  ? value.filter(Boolean)
  : String(value || '').split(/[;,\n]/).map(v => v.trim()).filter(Boolean);
const first = (...values) => values.find(v => v !== undefined && v !== null && v !== '');
const clamp01 = value => {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(1, n > 1 ? n / 100 : n));
};

export function canonicalAwsStrategy(strategy='') {
  const value = String(strategy || '').trim();
  return AWS_STRATEGY_MAP[value] || '';
}

export function awsDiscoveryFileType(filename='') {
  const name = String(filename || '');
  const match = Object.keys(AWS_DISCOVERY_FILE_TYPES)
    .sort((a,b)=>b.length-a.length)
    .find(suffix => name.endsWith(suffix));
  return match ? AWS_DISCOVERY_FILE_TYPES[match] : '';
}

export function parseCsv(text='') {
  const rows = [];
  let row = [], field = '', quoted = false;
  const input = String(text || '').replace(/^\uFEFF/, '');
  for (let i=0; i<input.length; i++) {
    const ch = input[i];
    if (quoted) {
      if (ch === '"' && input[i+1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else {
      if (ch === '"') quoted = true;
      else if (ch === ',') { row.push(field); field = ''; }
      else if (ch === '\n') { row.push(field.replace(/\r$/,'')); rows.push(row); row=[]; field=''; }
      else field += ch;
    }
  }
  if (field.length || row.length) { row.push(field.replace(/\r$/,'')); rows.push(row); }
  if (!rows.length) return [];
  const headers = rows.shift().map(h=>String(h||'').trim());
  return rows
    .filter(r=>r.some(v=>String(v||'').trim()!==''))
    .map(r=>Object.fromEntries(headers.map((h,i)=>[h,String(r[i]??'').trim()])));
}

export function normalizeAwsRecommendation(raw={}, options={}) {
  const recommendation = raw.recommendationSet || raw.recommendation || raw.strategyOption || raw;
  const strategy = first(
    recommendation.strategy,
    raw.strategy,
    raw.recommendedStrategy,
    raw.rStrategy
  ) || '';
  const targetDestination = first(
    recommendation.targetDestination,
    raw.targetDestination,
    raw.targetService,
    raw.awsTargetService
  ) || '';
  const transformationTool = first(
    recommendation.transformationTool?.name,
    recommendation.transformationTool?.toolName,
    recommendation.toolName,
    raw.transformationTool,
    raw.toolName
  ) || '';

  const applicationId = first(
    options.applicationId,
    raw.applicationId,
    raw.application?.id,
    raw.applicationComponentId,
    raw.serverId,
    raw.resourceId
  ) || '';

  const sourceSystem = first(options.sourceSystem, raw.sourceSystem, 'AWS Migration Hub Strategy Recommendations');
  const sourceReference = first(options.sourceReference, raw.sourceReference, raw.source, '');
  const reasoning = first(raw.reasoning, raw.rationale, raw.explanation, '') || '';
  const confidence = clamp01(first(raw.confidence, raw.confidenceScore, raw.recommendationConfidence));

  const evidence = providerRecommendationAsEvidence({
    id: raw.id || stableId(`${sourceSystem}-${applicationId}-${strategy}-${targetDestination}`,'PRA'),
    provider: AWS_PROVIDER,
    applicationId,
    strategy,
    targetServiceRefs: targetDestination ? [targetDestination] : [],
    reasoning,
    confidence,
    source: sourceReference || sourceSystem,
    assessedAt: first(options.assessedAt, raw.assessedAt, raw.generatedAt, raw.analysisDate, '') || ''
  });

  return {
    ...evidence,
    sourceSystem,
    sourceReference,
    confidence,
    canonicalStrategy: canonicalAwsStrategy(strategy),
    targetDestination,
    transformationTool,
    isPreferred: Boolean(first(recommendation.isPreferred, raw.isPreferred, false)),
    riskFlags: list(first(raw.riskFlags, raw.risks, [])),
    antiPatterns: Array.isArray(raw.antiPatterns) ? raw.antiPatterns : [],
    rawRecordType: raw.rawRecordType || 'awsRecommendation',
    status: 'Advisory evidence only'
  };
}

export function importAwsRecommendationJson(payload, options={}) {
  const parsed = typeof payload === 'string' ? JSON.parse(payload) : payload;
  let records = [];
  if (Array.isArray(parsed)) records = parsed;
  else if (Array.isArray(parsed?.recommendations)) records = parsed.recommendations;
  else if (Array.isArray(parsed?.items)) records = parsed.items;
  else if (parsed?.recommendationSet || parsed?.strategy || parsed?.recommendedStrategy) records = [parsed];
  else if (parsed && typeof parsed === 'object') {
    // Accept maps keyed by application/server identifier without guessing provider semantics.
    records = Object.entries(parsed)
      .filter(([,v]) => v && typeof v === 'object')
      .map(([key,v]) => ({applicationId:v.applicationId || key, ...v}));
  }

  const recommendations = records.map(r=>normalizeAwsRecommendation(r, options));
  return {
    provider: AWS_PROVIDER,
    sourceSystem: options.sourceSystem || 'AWS Migration Hub Strategy Recommendations',
    sourceReference: options.sourceReference || '',
    importedAt: options.importedAt || new Date().toISOString(),
    recommendations,
    warnings: recommendations
      .flatMap(r => [
        !r.applicationId ? `Recommendation ${r.id} has no resolvable application identifier.` : '',
        !r.canonicalStrategy ? `Recommendation ${r.id} has an unmapped AWS strategy: ${r.strategy || '(blank)'}.` : ''
      ].filter(Boolean))
  };
}

export function importAwsDiscoveryCsv(filename, text, options={}) {
  const fileType = awsDiscoveryFileType(filename);
  if (!fileType) {
    return {
      provider: AWS_PROVIDER, filename, fileType:'unknown',
      records:[], warnings:[`Unsupported or unrecognized AWS discovery CSV filename: ${filename}`]
    };
  }
  const rows = parseCsv(text);
  return {
    provider: AWS_PROVIDER,
    sourceSystem:'AWS Application Discovery Service / Migration Hub export',
    sourceReference: options.sourceReference || filename,
    importedAt: options.importedAt || new Date().toISOString(),
    filename,
    fileType,
    records: rows.map((row,index)=>({
      id: stableId(`${filename}-${index+1}`,'AWSD'),
      fileType,
      row,
      status:'Discovery evidence only'
    })),
    warnings:[]
  };
}

export function discoveryEvidenceSummary(imports=[]) {
  const recognized = (imports||[]).filter(x=>x.fileType && x.fileType!=='unknown');
  const byType = {};
  for (const item of recognized) byType[item.fileType]=(byType[item.fileType]||0)+(item.records?.length||0);
  return {
    files: recognized.length,
    records: recognized.reduce((n,x)=>n+(x.records?.length||0),0),
    byType,
    warnings:(imports||[]).flatMap(x=>x.warnings||[])
  };
}

export function proposalFromAwsRecommendation(raw={}) {
  const r = normalizeAwsRecommendation(raw);
  if (!r.applicationId || !r.canonicalStrategy) return null;
  return {
    id: stableId(`${r.applicationId}-aws-${r.canonicalStrategy}-${r.targetDestination}`,'ALT'),
    applicationId:r.applicationId,
    name:`AWS evidence candidate — ${r.strategy}${r.targetDestination ? ` → ${r.targetDestination}` : ''}`,
    provider:AWS_PROVIDER,
    strategyClass:r.canonicalStrategy,
    description:'Candidate alternative derived from AWS provider-generated recommendation evidence. Human review required.',
    targetArchitecture:r.targetDestination || '',
    confidence:r.confidence ?? 0,
    evidenceCompleteness:0,
    evidenceRefs:[r.id],
    decisionStatus:'Candidate / provider evidence',
    sourceProviderAssessmentId:r.id
  };
}

export function awsAdapterAcceptance(importResult={}) {
  const issues=[];
  for(const r of importResult.recommendations||[]){
    if(r.status!=='Advisory evidence only') issues.push(`${r.id} is not marked advisory.`);
    if(r.confidence === 0 && !('confidence' in r)) issues.push(`${r.id} incorrectly inferred zero confidence.`);
    if(r.strategy && !r.canonicalStrategy) issues.push(`${r.id} contains an unmapped strategy.`);
  }
  return {valid:issues.length===0,issues};
}
