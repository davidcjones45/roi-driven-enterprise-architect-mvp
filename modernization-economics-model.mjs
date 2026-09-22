import { stableId } from './authority-model.mjs';

export const ECONOMIC_LINE_TYPES=['CURRENT_RUN_COST','TRANSITION_COST','TARGET_RUN_COST','QUANTIFIED_BENEFIT','RISK_ADJUSTMENT'];
export const ECONOMIC_CATEGORIES=['Compute / hosting','Storage','Network / data transfer','Software licensing','Managed service','Operations labor','Engineering labor','Support / maintenance','Facilities / datacenter','Testing / validation','Data migration','Dual running','Training / change','Exit / termination','Compliance','Incident / outage','Technical debt','Productivity / capacity','Revenue / mission value','Risk exposure','Other'];

const list=v=>Array.isArray(v)?v.filter(Boolean):String(v||'').split(/[;,\n]/).map(x=>x.trim()).filter(Boolean);
const unique=v=>[...new Set(v)];
const num=v=>{if(v===null||v===undefined||v==='')return null;const n=Number(v);return Number.isFinite(n)?n:null};
const conf=v=>{const n=num(v);return n===null?null:Math.max(0,Math.min(1,n>1?n/100:n))};

export function normalizeEconomicLine(raw={}){
  const lineType=ECONOMIC_LINE_TYPES.includes(raw.lineType)?raw.lineType:'CURRENT_RUN_COST';
  return {...raw,
    id:raw.id||stableId(`${raw.applicationId||'app'}-${raw.alternativeId||'baseline'}-${lineType}-${raw.name||raw.category||'line'}`,'MECO'),
    applicationId:raw.applicationId||'',alternativeId:raw.alternativeId||'',lineType,
    name:raw.name||raw.category||'',category:ECONOMIC_CATEGORIES.includes(raw.category)?raw.category:'Other',
    amount:num(raw.amount),currency:raw.currency||'USD',period:raw.period||(lineType==='TRANSITION_COST'?'One-time':'Annual'),
    confidence:conf(raw.confidence),evidenceRefs:unique(list(raw.evidenceRefs)),assumptionRefs:unique(list(raw.assumptionRefs)),
    source:raw.source||'',sourceOwner:raw.sourceOwner||'',note:raw.note||''
  };
}

export function economicLineIssues(raw={}){
  const x=normalizeEconomicLine(raw),issues=[];
  if(!x.applicationId)issues.push('Economic line requires an application.');
  if(x.lineType!=='CURRENT_RUN_COST'&&!x.alternativeId)issues.push('Alternative-specific economic line requires an alternative.');
  if(x.amount===null)issues.push('Amount is not supplied.');
  if(x.amount!==null&&x.amount<0)issues.push('Amounts must be non-negative; use line type for direction.');
  if(!x.evidenceRefs.length&&!x.assumptionRefs.length&&!x.source)issues.push('Economic line requires evidence, a labeled assumption, or a source.');
  if(x.confidence===null)issues.push('Confidence is not supplied.');
  return {valid:issues.length===0,issues,line:x};
}

const sum=(lines,type)=>lines.filter(x=>x.lineType===type&&x.amount!==null).reduce((n,x)=>n+x.amount,0);

export function economicsForAlternative(applicationId,alternativeId,lines=[]){
  const n=lines.map(normalizeEconomicLine);
  const baseline=n.filter(x=>x.applicationId===applicationId&&x.lineType==='CURRENT_RUN_COST');
  const alt=n.filter(x=>x.applicationId===applicationId&&x.alternativeId===alternativeId);
  const currentAnnualCost=sum(baseline,'CURRENT_RUN_COST');
  const transitionCost=sum(alt,'TRANSITION_COST');
  const targetAnnualCost=sum(alt,'TARGET_RUN_COST');
  const explicitAnnualBenefit=sum(alt,'QUANTIFIED_BENEFIT');
  const annualRiskAdjustment=sum(alt,'RISK_ADJUSTMENT');
  const annualRunCostAvoidance=currentAnnualCost-targetAnnualCost;
  const grossAnnualBenefit=annualRunCostAvoidance+explicitAnnualBenefit;
  const riskAdjustedAnnualBenefit=grossAnnualBenefit-annualRiskAdjustment;
  const cs=[...baseline,...alt].map(x=>x.confidence).filter(x=>x!==null);
  return {applicationId,alternativeId,currentAnnualCost,transitionCost,targetAnnualCost,explicitAnnualBenefit,
    annualRunCostAvoidance,grossAnnualBenefit,annualRiskAdjustment,riskAdjustedAnnualBenefit,
    averageConfidence:cs.length?cs.reduce((a,b)=>a+b,0)/cs.length:null,
    evidenceIssueCount:[...baseline,...alt].reduce((n,x)=>n+economicLineIssues(x).issues.length,0)};
}

export function investmentMetrics(e={},options={}){
  const horizonYears=Math.max(1,Math.floor(Number(options.horizonYears||5)));
  const discountRate=Math.max(0,Number(options.discountRate||0));
  const annual=Number(e.riskAdjustedAnnualBenefit||0),transition=Number(e.transitionCost||0);
  let npv=-transition,cumulative=-transition,discountedCumulative=-transition,paybackYear=null,discountedPaybackYear=null;
  const yearly=[];
  for(let year=1;year<=horizonYears;year++){
    const discounted=annual/Math.pow(1+discountRate,year);
    cumulative+=annual;discountedCumulative+=discounted;npv+=discounted;
    if(paybackYear===null&&cumulative>=0)paybackYear=year;
    if(discountedPaybackYear===null&&discountedCumulative>=0)discountedPaybackYear=year;
    yearly.push({year,annualBenefit:annual,discountedBenefit:discounted,cumulative,discountedCumulative});
  }
  const totalNetBenefit=annual*horizonYears-transition;
  return {horizonYears,discountRate,totalNetBenefit,roi:transition>0?totalNetBenefit/transition:null,
    simplePaybackYears:annual>0?transition/annual:null,paybackYear,discountedPaybackYear,npv,yearly};
}

export function seedEconomicsFromAlternatives(applicationId,alternatives=[],existingLines=[]){
  const ids=new Set(existingLines.map(x=>x.id)),out=[];
  for(const a of alternatives.filter(x=>x.applicationId===applicationId)){
    for(const [lineType,amount,name,category] of [
      ['TRANSITION_COST',Number(a.oneTimeCost||0),`${a.name||a.id} transition estimate`,'Engineering labor'],
      ['TARGET_RUN_COST',Number(a.annualRunCost||0),`${a.name||a.id} annual run estimate`,'Other']]){
      if(amount<=0)continue;
      const x=normalizeEconomicLine({applicationId,alternativeId:a.id,lineType,name,category,amount,confidence:a.confidence,
        assumptionRefs:[`Seeded from modernization alternative ${a.id}`],source:'M1 modernization alternative'});
      if(!ids.has(x.id)){out.push(x);ids.add(x.id);}
    }
  }
  return out;
}

export function sensitivityCases(e={},options={}){
  const baseBenefit=Number(e.riskAdjustedAnnualBenefit||0),baseTransition=Number(e.transitionCost||0);
  return [
    {id:'DOWNSIDE',label:'Downside',benefitFactor:.75,transitionFactor:1.25},
    {id:'BASE',label:'Base',benefitFactor:1,transitionFactor:1},
    {id:'UPSIDE',label:'Upside',benefitFactor:1.15,transitionFactor:.9}
  ].map(c=>({...c,metrics:investmentMetrics({...e,riskAdjustedAnnualBenefit:baseBenefit*c.benefitFactor,transitionCost:baseTransition*c.transitionFactor},options)}));
}

export function economicsCompleteness(applicationId,alternativeId,lines=[]){
  const r=lines.map(normalizeEconomicLine).filter(x=>x.applicationId===applicationId&&(x.lineType==='CURRENT_RUN_COST'||x.alternativeId===alternativeId));
  const issues=r.flatMap(x=>economicLineIssues(x).issues.map(issue=>({lineId:x.id,issue})));
  const has=t=>r.some(x=>x.lineType===t&&x.amount!==null);
  return {hasBaseline:has('CURRENT_RUN_COST'),hasTransition:has('TRANSITION_COST'),hasTarget:has('TARGET_RUN_COST'),
    decisionReadyForEconomicComparison:has('CURRENT_RUN_COST')&&has('TRANSITION_COST')&&has('TARGET_RUN_COST')&&issues.length===0,issues};
}
