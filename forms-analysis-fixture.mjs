import {createForm,saveField,verifyStructure,runQuickScan,recordDecision} from './forms-analysis-model.mjs';
export function formsExample() {
  let f=createForm({name:'Sample: equipment service request',owner:'Fictional Service Operations',organization:'Example Company (fictional)',purpose:'Request equipment service and verify requester identity.',process:'Service request',system:'Example CRM',sourceVersion:'Synthetic FAC example v1',notes:'Fictional sample. Policy SAMPLE-17 is invented and is not a real legal requirement.'});f.sample=true;
  const sectionId=f.sections[0].id;
  for(const values of [
    {label:'Customer account',type:'Text',required:'Yes',sourceSystem:'Example CRM',justification:'Downstream system',purpose:'Associate the request with a customer.',downstreamUse:'Service allocation',canPrefill:'Yes',directInput:'Yes',dependencies:'Example CRM availability',evidence:'Synthetic process walkthrough',instructions:'Use the account identifier.'},
    {label:'Customer account',type:'Text',required:'Yes',purpose:'Repeated billing entry',instructions:''},
    {label:'Site access details',type:'Long text',required:'No',canCondition:'Yes',purpose:'Describe entry restrictions.',instructions:'Complete for restricted sites.',justification:'Business process'},
    {label:'Requester identity check',type:'Boolean',required:'Yes',justification:'Policy / control',evidence:'Fictional policy SAMPLE-17, section 2',controlJustification:'Verify that requester may initiate service.',humanVerification:'Yes',instructions:'Record the operator check.'},
    {label:'Supervisor signature',type:'Signature',required:'Yes',approval:'Supervisor queue before dispatch',justification:'Workflow',notes:'Synthetic observation: requests wait for supervisor availability.',dependencies:'Supervisor availability',instructions:'Supervisor signs before dispatch.'}
  ]) f=saveField(f,{sectionId,...values});
  f=verifyStructure(f,'Sample practitioner');f=runQuickScan(f);
  const prefill=f.recommendations.find(r=>r.treatment==='Prefill');
  f=recordDecision(f,prefill.id,{status:'Accepted',reviewer:'Sample owner',rationale:'Synthetic walkthrough confirms account context is available.',specification:'Read account ID from the selected CRM customer. Let the operator correct the customer selection.'});
  const approval=f.recommendations.find(r=>f.fields.find(x=>x.id===r.fieldId)?.label==='Supervisor signature'&&f.findings.find(x=>x.id===r.findingId)?.lens==='Process burden');
  f=recordDecision(f,approval.id,{status:'Deferred',reviewer:'Sample owner',rationale:'Measure queue time and confirm delegated authority before changing the approval.'});return f;
}
