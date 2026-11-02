/** Synthetic source evidence, deliberately separate from evaluator truth. */
export const LOGISTICS_SCHEMA='LOG-REL-DIAGNOSTIC-V0.1';
const at=t=>`2026-10-05T${t}:00-05:00`;
const rows=[
 ['09:00','QTY_MISMATCH_DETECTED','WMS','23 staged against 24 ordered'],
 ['09:05','PHYSICAL_READY','WMS','Count, QA and staging complete'],
 ['09:06','HANDOFF_SENT','Ledger','Customer service sends to inventory lead'],
 ['09:07','HANDOFF_ACKNOWLEDGED','Ledger','Inventory lead accepts ownership'],
 ['09:10','COMMERCIAL_DISPOSITION_APPROVED','ERP','Customer accepts 23; order revision 2'],
 ['09:12','PACKET_COMPLETE','Ledger','Revision-matched count and commercial evidence available'],
 ['09:50','REVIEW_STARTED','Ledger','Lead starts reconciliation'],
 ['09:58','RECONCILIATION_APPROVED','Ledger','Reconciliation approved'],
 ['10:00','DOCUMENTS_READY','ERP','Documents agree with 23 approved cases'],
 ['10:02','RELEASE_AUTHORIZED','WMS','Shipping supervisor records release'],
 ['10:03','LOAD_STARTED','WMS','Dock load starts'],
 ['10:23','LOAD_COMPLETE','WMS','Load complete'],
 ['10:30','GATE_DEPARTURE','TMS','Gate departure'],
 ['13:30','CUSTOMER_RECEIPT','ERP','Correct receipt, planned 13:00']
];
export function logisticsFixture(variant='primary') {
 if(!['primary','delegate','dock','transfer','conflict','missing','stale','unacknowledged','reopened','parallel'].includes(variant))throw Error('Unknown fixture.');
 const id=`LOG-REL-001-${variant}`;
 const c={schemaVersion:LOGISTICS_SCHEMA,id,revision:1,synthetic:true,name:'Riverbend outbound release',variant,
 scope:'One facility, domestic ambient nonhazardous household goods; WMS/ERP quantity mismatch; observation through customer receipt.',
 cutoff:at('14:00'),shipments:[{id:'S-101',scope_class:'IN_SCOPE',order_line_refs:['O-101:L-1'],planned_departure_at:at('10:00'),release_deadline_at:at('09:40'),planned_receipt_at:at('13:00')}],events:[],evidence:[],taskIntervals:[],reviews:[],hypotheses:[],decisions:[],outcomes:[],
 readiness:{as_of:at('10:02'),source_at:at('10:00'),order_revision:'2',approval_revision:'2',requested_quantity:24,approved_quantity:23,staged_quantity:23,document_quantity:23,quantity_unit:'CASE',physical_ready:true,commercial_ready:true,transport_ready:true,documentation_ready:true,reconciliation_complete:true,release_authorized:true,conflicting:false},
 context:{dock_available_at:at('09:05'),review_role_unavailable_until:at('09:50'),backup_authorized:false,source_versions_available:true,review_service_minutes:8},
 economics:{monthlyExceptions:120,activeMinutesSaved:10,loadedRate:35,monthlyAvoidedCharges:300,monthlyRecurring:100,implementationCost:2400,consultingFee:4500},
 pilot:{scope:'Same facility/family; four comparable baseline and four controlled pilot weeks; target 100 eligible episodes per phase, subject to volume and uncertainty.',metric:'p90 complete-packet review queue',target:'At least 30% lower; departure on-time +5 percentage points; end-to-end and correct receipt do not worsen.',guardrails:'Zero observed unauthorized releases; reopen/rework increase <=1 percentage point; no hidden labor transfer.',stopRules:'Unauthorized release, material quantity/document error, lost traceability or failed fallback.',review:'Weekly; reassess on configuration, performance/outcome divergence or evidence degradation.'}};
 c.events=rows.map(([t,type,system,detail],i)=>({id:`EV-${i+1}`,shipment_id:'S-101',exception_id:'X-101',event_type:type,occurred_at:at(t),recorded_at:at(t),source_system:system,source_record_id:`${system}-${i+1}`,source_revision:'2',actor_role:system==='Ledger'?'Inventory control':'Source owner',evidence_ref:`E-${i+1}`,detail}));
 const change=(type,t)=>{const e=c.events.find(x=>x.event_type===type);e.occurred_at=e.recorded_at=at(t);};
 if(['delegate','dock','transfer'].includes(variant)){
  [['REVIEW_STARTED','09:12'],['RECONCILIATION_APPROVED','09:20'],['DOCUMENTS_READY','09:22'],['RELEASE_AUTHORIZED','09:24'],['LOAD_STARTED','09:25'],['LOAD_COMPLETE','09:45'],['GATE_DEPARTURE','09:52'],['CUSTOMER_RECEIPT','12:52']].forEach(([type,t])=>change(type,t));
  c.context.review_role_unavailable_until=at('09:12');c.context.backup_authorized=true;
  c.readiness.as_of=at('09:24');c.readiness.source_at=at('09:22');
 }
 if(['dock','transfer'].includes(variant)){
  c.context.dock_available_at=at('10:20');[['LOAD_STARTED','10:20'],['LOAD_COMPLETE','10:40'],['GATE_DEPARTURE','10:47'],['CUSTOMER_RECEIPT','13:47']].forEach(([type,t])=>change(type,t));
 }
 if(variant==='conflict'){c.readiness.conflicting=true;c.readiness.document_quantity=24;c.readiness.approval_revision='1';}
 if(variant==='stale')c.readiness.source_at=at('09:00');
 if(variant==='missing'){c.readiness.physical_ready=null;c.events=c.events.filter(x=>!['PHYSICAL_READY','CUSTOMER_RECEIPT'].includes(x.event_type));}
 if(variant==='unacknowledged')c.events=c.events.filter(x=>x.event_type!=='HANDOFF_ACKNOWLEDGED');
 if(variant==='reopened')c.events.push({...c.events[0],id:'EV-reopen',event_type:'EXCEPTION_REOPENED',occurred_at:at('10:05'),recorded_at:at('10:05'),evidence_ref:'E-reopen',detail:'Quantity discrepancy reopened; final closure absent'});
 if(variant==='parallel')c.taskIntervals=[{id:'T1',role:'Inventory control',started_at:at('09:50'),ended_at:at('09:58'),evidence_ref:'E-tasks'},{id:'T2',role:'Inventory control',started_at:at('09:52'),ended_at:at('09:56'),evidence_ref:'E-tasks'}];
 c.evidence=c.events.map(e=>({id:e.evidence_ref,classification:'SYNTHETIC',review_state:'NOT REVIEWED',synthetic:true,source_system:e.source_system,source_record_id:e.source_record_id,source_revision:e.source_revision,locator:`events/${e.id}`,description:e.detail}));
 c.evidence.push({id:'E-capacity',classification:'SYNTHETIC',synthetic:true,review_state:'NOT REVIEWED',locator:'context',description:'Fictional role authority/capacity calendar, dock availability and source revision availability.'});
 if(variant==='parallel')c.evidence.push({id:'E-tasks',classification:'SYNTHETIC',synthetic:true,review_state:'NOT REVIEWED',locator:'taskIntervals',description:'Concurrent same-role activities; labor allocation unresolved.'});
 return c;
}
