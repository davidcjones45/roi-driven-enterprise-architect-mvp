import { assessEconomicAssurance } from './ibm-assurance-workflow.mjs';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
/**
 * Read-only presentation of optional, advisory economics scenarios.
 * Scenario records are not treated as independently authenticated evidence.
 */
export function advisoryEconomicSnapshot(workspace={},applicationId='',alternativeId=''){
 const records=(workspace.ibmAssuranceScenarios||[]).filter(x=>x.applicationId===applicationId&&x.alternativeId===alternativeId);
 const scenario=records.length===1?records[0].valueLeakage:null;
 const result=assessEconomicAssurance(workspace,applicationId,alternativeId,scenario);
 return {status:records.length>1?'AMBIGUOUS':result.valueLeakage.status,
  issues:records.length>1?['Multiple advisory scenarios match this application and alternative.']:result.valueLeakage.issues,
  netBenefit:records.length>1?null:result.valueLeakage.netBenefit,
  leakage:records.length>1?null:(result.valueLeakage.leakage??null),
  evidenceStatus:'USER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED',
  advisoryOnly:true,
  canonicalComparisonReady:result.canonical.decisionReadyForEconomicComparison};
}
export function advisoryEconomicHtml(snapshot={}){
 const fmt=n=>typeof n==='number'&&Number.isFinite(n)?n.toLocaleString('en-US',{style:'currency',currency:'USD'}):'Not assessed';
 return '<section class="card" data-ibm-assurance="advisory"><h3>IBM research assurance — advisory scenario</h3>'+
 '<p><strong>Status:</strong> '+esc(snapshot.status||'NOT_ASSESSED')+'</p>'+
 '<p><strong>Evidence:</strong> '+esc(snapshot.evidenceStatus||'USER_ASSERTED_NOT_INDEPENDENTLY_VERIFIED')+'</p>'+
 '<p><strong>Illustrative net benefit:</strong> '+esc(fmt(snapshot.netBenefit))+
 ' | <strong>Illustrative leakage:</strong> '+esc(fmt(snapshot.leakage))+'</p>'+
 '<p class="quiet-note">Not recognized cash, independent evidence authentication, investment approval or deployment authority. Canonical economics readiness is unchanged.</p></section>';
}
