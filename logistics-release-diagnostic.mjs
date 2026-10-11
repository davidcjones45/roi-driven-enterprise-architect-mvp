import { assertSafeJSON,isRecord } from './ux-safety-model.mjs';
import { LOGISTICS_SCHEMA } from './logistics-release-fixture.mjs';
export const EVENT_TYPES=['QTY_MISMATCH_DETECTED','PHYSICAL_READY','HANDOFF_SENT','HANDOFF_ACKNOWLEDGED','COMMERCIAL_DISPOSITION_APPROVED','PACKET_COMPLETE','REVIEW_STARTED','RECONCILIATION_APPROVED','DOCUMENTS_READY','RELEASE_AUTHORIZED','LOAD_STARTED','LOAD_COMPLETE','GATE_DEPARTURE','CUSTOMER_RECEIPT','EXCEPTION_REOPENED'];
const iso=v=>{
 if(typeof v!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(v)||!Number.isFinite(Date.parse(v)))return false;
 const date=v.slice(0,10),[year,month,day]=date.split('-').map(Number);
 return month>=1&&month<=12&&day>=1&&day<=new Date(Date.UTC(year,month,0)).getUTCDate()&&Number(v.slice(11,13))<24&&Number(v.slice(14,16))<60&&Number(v.slice(17,19))<60;
};
const required=(v,label)=>{if(typeof v!=='string'||!v.trim())throw Error(`${label} is required.`);};
export function validateCase(raw){
 if(!isRecord(raw))throw Error('Case must be an object.');assertSafeJSON(raw);
 if(raw.schemaVersion!==LOGISTICS_SCHEMA||raw.synthetic!==true)throw Error('Only the versioned synthetic diagnostic case is supported.');
 required(raw.id,'Case ID');if(!Number.isSafeInteger(raw.revision)||raw.revision<1)throw Error('Invalid revision.');
 for(const key of ['name','scope','variant'])required(raw[key],key);
 if(!iso(raw.cutoff))throw Error('Analysis cutoff requires an offset-bearing timestamp.');
 for(const key of ['shipments','events','evidence','taskIntervals','reviews','hypotheses','decisions','outcomes'])if(!Array.isArray(raw[key])||raw[key].some(x=>!isRecord(x)))throw Error(`Invalid ${key}.`);
 if(raw.events.length>10000||raw.shipments.length>1000||JSON.stringify(raw).length>5*1024*1024)throw Error('Case exceeds supported size.');
 for(const key of ['shipments','events','evidence','taskIntervals']){const ids=new Set();for(const x of raw[key]){required(x.id,`${key} ID`);if(ids.has(x.id))throw Error(`Duplicate ${key} ID: ${x.id}`);ids.add(x.id);}}
 const shipments=new Set(raw.shipments.map(x=>x.id)),ev=new Set(raw.evidence.map(x=>x.id));
 for(const s of raw.shipments){if(!['IN_SCOPE','OUT_OF_SCOPE'].includes(s.scope_class))throw Error('Unknown scope class.');for(const k of ['planned_departure_at','release_deadline_at','planned_receipt_at'])if(s[k]!==null&&!iso(s[k]))throw Error(`Invalid ${k}.`);}
 for(const e of raw.events){if(!shipments.has(e.shipment_id)||!ev.has(e.evidence_ref))throw Error('Dangling event reference.');if(!EVENT_TYPES.includes(e.event_type))throw Error('Unknown event type.');for(const k of ['occurred_at','recorded_at'])if(!iso(e[k]))throw Error(`Invalid ${k}.`);for(const k of ['source_system','source_record_id','source_revision','actor_role'])required(e[k],k);}
 for(const t of raw.taskIntervals){if(!iso(t.started_at)||!iso(t.ended_at)||Date.parse(t.ended_at)<Date.parse(t.started_at)||!ev.has(t.evidence_ref))throw Error('Invalid task interval.');required(t.role,'Task role');}
 if(!isRecord(raw.readiness)||!isRecord(raw.context)||!isRecord(raw.economics)||!isRecord(raw.pilot))throw Error('Missing case context.');
 for(const k of ['physical_ready','commercial_ready','transport_ready','documentation_ready','reconciliation_complete','release_authorized'])if(![true,false,null].includes(raw.readiness[k]))throw Error(`Unknown readiness value: ${k}`);
 if(typeof raw.readiness.conflicting!=='boolean'||!iso(raw.readiness.as_of)||!iso(raw.readiness.source_at))throw Error('Invalid readiness snapshot.');
 for(const k of ['requested_quantity','approved_quantity','staged_quantity','document_quantity'])if(raw.readiness[k]!==null&&(typeof raw.readiness[k]!=='number'||!Number.isFinite(raw.readiness[k])||raw.readiness[k]<0))throw Error(`Invalid quantity: ${k}`);
 required(raw.readiness.quantity_unit,'Quantity unit');
 for(const k of ['dock_available_at','review_role_unavailable_until'])if(!iso(raw.context[k]))throw Error(`Invalid context ${k}.`);
 for(const k of ['monthlyExceptions','activeMinutesSaved','loadedRate','monthlyAvoidedCharges','monthlyRecurring','implementationCost','consultingFee'])if(!Object.hasOwn(raw.economics,k))throw Error(`Missing economics: ${k}`);
 for(const e of raw.evidence){required(e.locator,'Evidence locator');required(e.description,'Evidence description');if(e.synthetic!==true)throw Error('Evidence must retain synthetic provenance.');}
 for(const k of ['reviews','hypotheses','decisions','outcomes'])for(const r of raw[k]){required(r.id,'Review ID');required(r.reviewer,'Reviewer');required(r.rationale,'Rationale');if(!Number.isSafeInteger(r.revision)||r.revision<1||r.revision>raw.revision||!iso(r.at)||r.synthetic!==true||r.confersAuthority!==false)throw Error('Invalid review history.');}
 for(const [k,v] of Object.entries(raw.economics))if(typeof v!=='number'||!Number.isFinite(v)||v<0)throw Error(`Invalid economics: ${k}`);
 return structuredClone(raw);
}
const mins=(a,b)=>(Date.parse(b)-Date.parse(a))/60000;
export function readiness(c){
 const r=c.readiness,flags=[];const age=mins(r.source_at,r.as_of);
 if(age<0||age>15)flags.push('Snapshot is stale or from the future.');
 if(r.conflicting||r.order_revision!==r.approval_revision||r.approved_quantity!==r.staged_quantity||r.approved_quantity!==r.document_quantity)flags.push('Conflicting source or approval revision.');
 const conditions=['physical_ready','commercial_ready','transport_ready','documentation_ready','reconciliation_complete'];
 const unknown=flags.length||['approved_quantity','staged_quantity','document_quantity'].some(k=>r[k]===null)||conditions.some(k=>r[k]===null);
 const eligible=unknown?'UNKNOWN':conditions.every(k=>r[k]===true)?'TRUE':'FALSE';
 return {eligible,releaseAuthorized:eligible==='TRUE'&&r.release_authorized===true?'RECORDED HUMAN AUTHORIZATION':'NOT ESTABLISHED',conditions:Object.fromEntries(conditions.map(k=>[k,r[k]===null?'UNKNOWN':r[k]?'TRUE':'FALSE'])),flags,confersAuthority:false};
}
export function nearestRank(values,p){if(!values.length)return null;return [...values].sort((a,b)=>a-b)[Math.ceil(p*values.length)-1];}
const PAIRS={resolution:['QTY_MISMATCH_DETECTED','RECONCILIATION_APPROVED'],physicalToRelease:['PHYSICAL_READY','RELEASE_AUTHORIZED'],reviewQueue:['PACKET_COMPLETE','REVIEW_STARTED'],reviewService:['REVIEW_STARTED','RECONCILIATION_APPROVED'],reviewToRelease:['RECONCILIATION_APPROVED','RELEASE_AUTHORIZED'],releaseToLoad:['RELEASE_AUTHORIZED','LOAD_STARTED'],loadService:['LOAD_STARTED','LOAD_COMPLETE'],loadToGate:['LOAD_COMPLETE','GATE_DEPARTURE'],physicalToGate:['PHYSICAL_READY','GATE_DEPARTURE']};
export function analyzeCase(input){
 const c=validateCase(input),byShipment=c.shipments.map(s=>{
  const events=c.events.filter(e=>e.shipment_id===s.id&&Date.parse(e.occurred_at)<=Date.parse(c.cutoff));
  const rows={},flags=[];
  const metric=(name,a,b,{lateness=false}={})=>{
   if(s.scope_class!=='IN_SCOPE')return rows[name]={value:null,unit:'minutes',eligible_n:0,excluded_n:1,censored_n:0,evidence_refs:[],quality_flags:['Out of scope.'],definition_version:1};
   const ea=typeof a==='string'?events.filter(e=>e.event_type===a):a?[a]:[],eb=typeof b==='string'?events.filter(e=>e.event_type===b):b?[b]:[];
   let reason='',value=null,censored=0;
   if(ea.length>1||eb.length>1)reason='Ambiguous repeated events; reconstruct episode before calculation.';
   else if(!ea.length||!eb.length){reason='Missing endpoint; no interval inferred.';censored=ea.length&&!eb.length?1:0;}
   else if(events.some(e=>e.event_type==='EXCEPTION_REOPENED')&&name==='resolution')reason='Reopened episode; final closure unresolved.';
   else{value=mins(ea[0].occurred_at,eb[0].occurred_at);if(!lateness&&value<0){reason='Negative interval / clock conflict.';value=null;}else if(lateness)value=Math.max(0,value);}
   const refs=[...ea,...eb].map(e=>e.evidence_ref).filter(Boolean);
   if(reason)flags.push(`${name}: ${reason}`);
   return rows[name]={value,unit:'minutes',eligible_n:value===null?0:1,excluded_n:value===null&&!censored?1:0,censored_n:censored,evidence_refs:refs,definition_version:1,quality_flags:reason?[reason]:[]};
  };
  for(const [name,[a,b]] of Object.entries(PAIRS))metric(name,a,b);
  metric('departureLateness',s.planned_departure_at?{occurred_at:s.planned_departure_at}:null,'GATE_DEPARTURE',{lateness:true});
  metric('receiptLateness',s.planned_receipt_at?{occurred_at:s.planned_receipt_at}:null,'CUSTOMER_RECEIPT',{lateness:true});
  metric('releaseDeadlineMiss',s.release_deadline_at?{occurred_at:s.release_deadline_at}:null,'RELEASE_AUTHORIZED',{lateness:true});
  const sent=events.find(e=>e.event_type==='HANDOFF_SENT'),ack=events.find(e=>e.event_type==='HANDOFF_ACKNOWLEDGED');
  const open=sent&&!ack;
  return {shipmentId:s.id,rows,flags,handoff:{acknowledged:!!ack,ageMinutes:open?mins(sent.occurred_at,c.cutoff):null,escalationDue:!!open&&mins(sent.occurred_at,c.cutoff)>=5}};
 });
 const summary=Object.fromEntries(Object.keys(byShipment[0]?.rows||{}).map(k=>{const records=byShipment.map(s=>s.rows[k]),values=records.map(r=>r.value).filter(v=>v!==null);return [k,{p50:nearestRank(values,.5),p90:nearestRank(values,.9),eligible_n:values.length,excluded_n:records.reduce((n,r)=>n+r.excluded_n,0),censored_n:records.reduce((n,r)=>n+r.censored_n,0),method:'nearest rank',unit:'minutes'}];}));
 const overlapping=c.taskIntervals.some((a,i)=>c.taskIntervals.slice(i+1).some(b=>a.role===b.role&&Date.parse(a.started_at)<Date.parse(b.ended_at)&&Date.parse(b.started_at)<Date.parse(a.ended_at)));
 return {synthetic:true,caseId:c.id,revision:c.revision,readiness:readiness(c),shipments:byShipment,summary,laborMinutes:overlapping||!c.taskIntervals.length?null:c.taskIntervals.reduce((n,t)=>n+mins(t.started_at,t.ended_at),0),laborFlags:overlapping?['Concurrent same-role tasks; allocation unresolved.']:!c.taskIntervals.length?['No labor evidence.']:[],provesRealImprovement:false};
}
export function economics(c,{includeFee=true,chargesVerified=false}={}){
 const e=c.economics,capacityHours=e.monthlyExceptions*e.activeMinutesSaved/60,capacityEquivalent=capacityHours*e.loadedRate;
 const cash=chargesVerified?e.monthlyAvoidedCharges:0,monthlyNet=cash-e.monthlyRecurring,totalOneTime=e.implementationCost+(includeFee?e.consultingFee:0);
 return {classification:'SYNTHETIC FORECAST',capacityHours,capacityEquivalent,chargesVerified,monthlyCashNet:monthlyNet,annualCashNet:monthlyNet*12,totalOneTime,cashPaybackMonths:monthlyNet>0?totalOneTime/monthlyNet:null,annualEquivalentNet:(monthlyNet+capacityEquivalent)*12,equivalentPaybackMonths:monthlyNet+capacityEquivalent>0?totalOneTime/(monthlyNet+capacityEquivalent):null,queueIsNotLabor:true};
}
export function compareOutcomes(baseline,target){
 const b=analyzeCase(baseline),t=analyzeCase(target),v=(r,k)=>r.shipments[0]?.rows[k].value;
 const delta=k=>v(b,k)===null||v(t,k)===null?null:v(b,k)-v(t,k);
 const gateDelta=delta('physicalToGate'),releaseDelta=delta('physicalToRelease'),receiptDelta=delta('receiptLateness');
 const types=gateDelta===null||receiptDelta===null?['UNRESOLVED']:gateDelta<0?['WORSENED',...(releaseDelta>0?['TRANSFERRED']:[])]:gateDelta>0&&receiptDelta>=0?['RELIEVED']:releaseDelta>0?['TRANSFERRED']:['UNCHANGED_EXPOSURE'];
 return {classification:'SYNTHETIC REPLAY, NOT OBSERVED PILOT',types,gateMinutesImproved:gateDelta,releaseMinutesImproved:releaseDelta,departureLatenessImproved:delta('departureLateness'),receiptLatenessImproved:receiptDelta,provesRealImprovement:false};
}
export function replaceCaseSource(current,source){
 const next=validateCase(source);if(next.id!==current.id)throw Error('Source revision must retain case ID.');
 next.revision=current.revision+1;for(const k of ['reviews','hypotheses','decisions','outcomes'])next[k]=structuredClone(current[k]);
 next.evidence=next.evidence.map(e=>({...e,review_state:'NOT REVIEWED'}));return next;
}
export function recordReview(input,{kind,reviewer,rationale,confirmed,choice,evidenceRefs=[],now=new Date().toISOString()}){
 const c=validateCase(input);if(confirmed!==true)throw Error('Explicit confirmation required.');if(!iso(now))throw Error('Invalid review time.');required(reviewer,'Reviewer');required(rationale,'Rationale');
 const record={id:globalThis.crypto.randomUUID(),revision:c.revision,kind,reviewer:reviewer.trim(),rationale:rationale.trim(),choice,evidenceRefs,at:now,synthetic:true,confersAuthority:false};
 if(kind==='evidence'){c.evidence=c.evidence.map(e=>({...e,review_state:'REVIEWED',reviewer,reviewed_at:now}));c.reviews.push(record);}
 else{
  if(!c.reviews.some(r=>r.revision===c.revision&&r.kind==='evidence'))throw Error('Review current source evidence first.');
  if(kind==='hypothesis'){if(!['D-03','D-DOCK','UNRESOLVED'].includes(choice))throw Error('Select a supported hypothesis.');if(!evidenceRefs.length||evidenceRefs.some(id=>!c.evidence.some(e=>e.id===id)))throw Error('Link current source evidence.');c.hypotheses.push(record);}
  else if(kind==='decision'){if(!c.hypotheses.some(r=>r.revision===c.revision))throw Error('Record current hypothesis disposition first.');if(!['A0','A1','A2','A3','A4','DEFERRED'].includes(choice))throw Error('Unknown alternative.');c.decisions.push(record);}
  else if(kind==='outcome'){if(!c.decisions.some(r=>r.revision===c.revision))throw Error('Record a current decision first.');if(!['delegate','dock','transfer'].includes(choice))throw Error('Choose a replay fixture.');c.outcomes.push(record);}
  else throw Error('Unknown review kind.');
 }
 return c;
}
