import test from 'node:test';
import assert from 'node:assert/strict';
import { logisticsFixture } from './logistics-release-fixture.mjs';
import { analyzeCase,validateCase,readiness,recordReview,replaceCaseSource,economics,compareOutcomes,nearestRank } from './logistics-release-diagnostic.mjs';
import { projection,mergeArchitecture,mergeRoi } from './logistics-release-adapter.mjs';
import { createLogisticsStore,LOGISTICS_KEY } from './logistics-release-store.mjs';
function storage(){const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),m};}
const reviewed=(variant='primary')=>recordReview(logisticsFixture(variant),{kind:'evidence',reviewer:'Synthetic reviewer',rationale:'Reviewed source rows and context',confirmed:true});
const hypothesis=(variant='primary',choice='D-03')=>recordReview(reviewed(variant),{kind:'hypothesis',reviewer:'Synthetic reviewer',rationale:'Packet-ready evidence, capacity and rival explanation reviewed',choice,evidenceRefs:['E-2','E-5','E-6','E-capacity'],confirmed:true});
const decided=()=>recordReview(hypothesis(),{kind:'decision',reviewer:'Operations reviewer',rationale:'Test formally approved backup; no execution here',choice:'A1',confirmed:true});
test('F01 exact primary timing and no implied labor/cash/authority',()=>{
 const a=analyzeCase(logisticsFixture()),r=a.shipments[0].rows;
 for(const [k,v] of Object.entries({resolution:58,physicalToRelease:57,reviewQueue:38,reviewService:8,reviewToRelease:4,releaseToLoad:1,loadService:20,loadToGate:7,physicalToGate:85,departureLateness:30,receiptLateness:30,releaseDeadlineMiss:22}))assert.equal(r[k].value,v,k);
 assert.equal(a.laborMinutes,null);assert.equal(a.readiness.eligible,'TRUE');assert.equal(a.provesRealImprovement,false);
 assert.equal(projection(logisticsFixture()).evaluations.constraint.effectiveValidationStatus,'CANDIDATE');
 assert.equal(projection(hypothesis()).evaluations.constraint.effectiveValidationStatus,'VALIDATED');
 assert.notEqual(projection(hypothesis()).evaluations.reliance.effectiveStatus,'SUPPORTED');
});
test('F02 delegate replay improves gate 38, lateness 30, with no realized result',()=>{
 const c=compareOutcomes(logisticsFixture(),logisticsFixture('delegate'));assert.equal(c.gateMinutesImproved,38);assert.equal(c.departureLatenessImproved,30);assert.deepEqual(c.types,['RELIEVED']);assert.equal(c.provesRealImprovement,false);
 const out=recordReview(decided(),{kind:'outcome',reviewer:'Reviewer',rationale:'Synthetic replay comparison',choice:'delegate',confirmed:true});
 assert.equal(projection(out).evaluations.outcome[0].realizedOutcomeSupported,false);
});
test('F03 rival diagnostic validates dock but rejects review concentration',()=>{
 assert.equal(analyzeCase(logisticsFixture('dock')).shipments[0].rows.reviewQueue.value,0);
 assert.equal(projection(hypothesis('primary','D-DOCK')).evaluations.constraint.effectiveValidationStatus,'CANDIDATE');
 assert.equal(projection(hypothesis('dock','D-03')).evaluations.constraint.effectiveValidationStatus,'CANDIDATE');
 assert.equal(projection(hypothesis('dock','D-DOCK')).evaluations.constraint.effectiveValidationStatus,'VALIDATED');
});
test('F04 release improvement cannot hide transferred/worsened end-to-end delay',()=>{
 const c=compareOutcomes(logisticsFixture(),logisticsFixture('transfer'));assert.equal(c.releaseMinutesImproved,38);assert.equal(c.gateMinutesImproved,-17);assert.deepEqual(c.types,['WORSENED','TRANSFERRED']);
});
test('F05 conflicting missing stale evidence yields unknown and source revisions invalidate reviews',()=>{
 for(const v of ['conflict','missing','stale'])assert.equal(readiness(logisticsFixture(v)).eligible,'UNKNOWN');
 const c=decided(),source=structuredClone(c);source.readiness.conflicting=true;
 const changed=replaceCaseSource(c,source);assert.equal(changed.revision,2);assert.equal(changed.decisions.length,1);assert.equal(projection(changed).roi.architecture.preferredAlternative,'');
 assert.throws(()=>recordReview(changed,{kind:'decision',choice:'A1',reviewer:'R',rationale:'Changed',confirmed:true}),/Review current/);
});
test('F06 acknowledgement missing stays unknown and triggers human escalation',()=>{
 const a=analyzeCase(logisticsFixture('unacknowledged'));assert.equal(a.shipments[0].handoff.acknowledged,false);assert.equal(a.shipments[0].handoff.escalationDue,true);
 const c=logisticsFixture();c.readiness.release_authorized=false;assert.equal(readiness(c).releaseAuthorized,'NOT ESTABLISHED');
 assert.throws(()=>recordReview(c,{kind:'evidence',reviewer:'R',rationale:'R',confirmed:false}),/confirmation/);
 assert.throws(()=>recordReview(reviewed(),{kind:'decision',reviewer:'R',rationale:'R',choice:'A1',confirmed:true}),/hypothesis/);
});
test('F07 malformed unsupported duplicate dangling and offset-free sources rejected without normalization',()=>{
 for(const mutate of [c=>c.schemaVersion='future',c=>c.synthetic=false,c=>c.events.push(c.events[0]),c=>c.events[0].event_type='DONE',c=>c.events[0].shipment_id='absent',c=>c.events[0].evidence_ref='absent',c=>c.events[0].occurred_at='2026-10-05T09:00:00',c=>c.readiness.physical_ready='true',c=>c.economics.loadedRate=-1]){const c=logisticsFixture();mutate(c);assert.throws(()=>validateCase(c));}
 const c=logisticsFixture();c.events[0].occurred_at='2026-10-05T14:00:00Z';assert.equal(analyzeCase(c).shipments[0].rows.resolution.value,58);
 c.events[6].occurred_at='2026-10-05T08:50:00-05:00';assert.equal(analyzeCase(c).shipments[0].rows.reviewQueue.value,null);
});
test('F08 missing endpoints, reopened episodes, parallel effort and out-of-scope counts',()=>{
 const m=analyzeCase(logisticsFixture('missing'));assert.equal(m.shipments[0].rows.physicalToRelease.value,null);assert.equal(m.summary.receiptLateness.censored_n,1);
 assert.equal(analyzeCase(logisticsFixture('reopened')).shipments[0].rows.resolution.value,null);
 assert.equal(analyzeCase(logisticsFixture('parallel')).laborMinutes,null);
 const c=logisticsFixture();c.shipments[0].scope_class='OUT_OF_SCOPE';assert.equal(analyzeCase(c).summary.reviewQueue.excluded_n,1);
 assert.equal(nearestRank([10,5,100,20],.9),100);assert.equal(nearestRank([], .5),null);
});
test('cash/capacity economic classifications and fees are explicit',()=>{
 const c=logisticsFixture(),cash=economics(c,{chargesVerified:true,includeFee:false});assert.equal(cash.cashPaybackMonths,12);assert.equal(cash.annualCashNet,2400);assert.equal(cash.capacityHours,20);assert.equal(cash.capacityEquivalent,700);
 assert.equal(economics(c).cashPaybackMonths,null);assert.equal(economics(c).monthlyCashNet,-100);assert.equal(economics(c).totalOneTime,6900);
});
test('F09 guarded persistence protects corrupt, competing and failed storage without false success',()=>{
 const s=storage();s.setItem('unrelated','preserve');const a=createLogisticsStore(()=>s);a.save(logisticsFixture());assert.equal(s.getItem('unrelated'),'preserve');assert.equal(createLogisticsStore(()=>s).list().length,1);
 const b=createLogisticsStore(()=>s);a.save(reviewed());assert.throws(()=>b.save(logisticsFixture('dock')),/Another tab/);assert.equal(b.list().length,1);
 const bad=storage();bad.setItem(LOGISTICS_KEY,'broken');const blocked=createLogisticsStore(()=>bad);assert.throws(()=>blocked.save(logisticsFixture()),/protected/);assert.equal(bad.getItem(LOGISTICS_KEY),'broken');
 const failed=storage(),f=createLogisticsStore(()=>failed);failed.setItem=()=>{throw Error('quota');};assert.throws(()=>f.save(logisticsFixture()),/not saved/);assert.equal(f.list().length,0);
});
test('native projection is additive idempotent collision-protected and noncanonical',()=>{
 const c=decided(),existing={graphNodes:[{id:'existing',label:'Retain'}],custom:{keep:true}},next=mergeArchitecture(existing,c);
 assert.deepEqual(next.custom,{keep:true});assert.deepEqual(next.graphNodes[0],existing.graphNodes[0]);assert.deepEqual(mergeArchitecture(next,c),next);
 const collided=structuredClone(next);collided.graphNodes[1].label='Other work';assert.throws(()=>mergeArchitecture(collided,c),/collision/);
 const roi=mergeRoi({opportunity:{},architecture:{alternatives:[]},evidence:[{claim:'Retain'}],inventory:[],authorityEnvelope:{status:'Draft'},custom:{keep:true}},c);
 assert.equal(roi.evidence[0].claim,'Retain');assert.equal(roi.authorityEnvelope.status,'Draft');assert.deepEqual(mergeRoi(roi,c),roi);
 assert.throws(()=>mergeRoi({opportunity:{name:'Client work'}},c),/contains work/);assert.equal(projection(c).canonicalization,false);
});

test('quantities, dates, sparse economics and insufficient evidence cannot become validated',()=>{
 const c=logisticsFixture();c.readiness.document_quantity=24;assert.equal(readiness(c).eligible,'UNKNOWN');
 const bad=logisticsFixture();bad.events[0].occurred_at='2026-02-30T09:00:00-05:00';assert.throws(()=>validateCase(bad),/Invalid occurred/);
 delete bad.economics.loadedRate;assert.throws(()=>validateCase(bad));
 const h=recordReview(reviewed(),{kind:'hypothesis',reviewer:'R',rationale:'Only a source label',choice:'D-03',evidenceRefs:['E-1'],confirmed:true});assert.equal(projection(h).evaluations.constraint.effectiveValidationStatus,'CANDIDATE');
});

 test('ROI handoff uses native architecture selections without implying approval',()=>{
 const a=projection(decided()).roi.architecture;
 assert.equal(a.decisionStatus,'Proposed');
 const categories=['Do nothing','Retire or consolidate','Simplify','Integrate','Automate','Improve analytics','Introduce bounded AI'];
 assert.ok(a.alternatives.every(row=>categories.includes(row.category)));
 assert.equal(a.preferredAlternative,'1');
 });
