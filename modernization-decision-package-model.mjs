import { normalizeModernizationAssessment, assessmentIssues } from './modernization-model.mjs';
import { candidateTransitionWaves, unresolvedDependencies } from './modernization-dependency-model.mjs';
import { economicsForAlternative, investmentMetrics, economicsCompleteness } from './modernization-economics-model.mjs';
import { portfolioPlan, nextPortfolioActions } from './modernization-portfolio-model.mjs';
import { providerCoexistenceSummary } from './multicloud-modernization-adapter.mjs';

const pct = value => value === null || value === undefined ? null : Math.round(Number(value) * 100);
const money = value => Number.isFinite(Number(value)) ? Number(value) : null;

export function decisionPackage(workspace={}, options={}){
  const applications = workspace.applications || [];
  const alternatives = workspace.alternatives || [];
  const assessments = (workspace.assessments || []).map(normalizeModernizationAssessment);
  const providers = workspace.providerAssessments || [];
  const dependencies = workspace.dependencies || [];
  const economicLines = workspace.economicLines || [];
  const portfolio = portfolioPlan(workspace);
  const waves = workspace.candidateTransitionWaves?.candidateWaves?.length
    ? workspace.candidateTransitionWaves
    : candidateTransitionWaves(workspace);

  const appPackages = applications.map(app => {
    const assessment = assessments.find(x => x.applicationId === app.id) || null;
    const appAlternatives = alternatives.filter(x => x.applicationId === app.id);
    const providerEvidence = providers.filter(x => x.applicationId === app.id);
    const dependencyIssues = unresolvedDependencies(dependencies,{applications})
      .filter(x => x.dependency.sourceId === app.id || x.dependency.targetId === app.id);
    const portfolioRow = portfolio.rows.find(x => x.applicationId === app.id) || null;
    const wave = waves.candidateWaves.find(x => x.applicationIds.includes(app.id)) || null;

    const alternativeViews = appAlternatives.map(alt => {
      const e = economicsForAlternative(app.id,alt.id,economicLines);
      const complete = economicsCompleteness(app.id,alt.id,economicLines);
      const metrics = investmentMetrics(e,workspace.economicSettings || {});
      return {
        id:alt.id,
        name:alt.name || alt.id,
        provider:alt.provider || 'Provider neutral',
        strategyClass:alt.strategyClass || '',
        targetArchitecture:alt.targetArchitecture || '',
        confidence:pct(alt.confidence),
        evidenceCompleteness:pct(alt.evidenceCompleteness),
        decisionStatus:alt.decisionStatus || 'Candidate',
        economics:{
          comparisonReady:complete.decisionReadyForEconomicComparison,
          currentAnnualCost:money(e.currentAnnualCost),
          transitionCost:money(e.transitionCost),
          targetAnnualCost:money(e.targetAnnualCost),
          riskAdjustedAnnualBenefit:money(e.riskAdjustedAnnualBenefit),
          npv:complete.decisionReadyForEconomicComparison?money(metrics.npv):null,
          roi:complete.decisionReadyForEconomicComparison?metrics.roi:null,
          paybackYears:complete.decisionReadyForEconomicComparison?metrics.simplePaybackYears:null
        }
      };
    });

    const assessmentGapList = assessment
      ? assessmentIssues(assessment,{applications}).issues
      : ['No modernization assessment exists.'];

    return {
      application:{
        id:app.id,
        name:app.name || app.id,
        description:app.description || '',
        businessOwner:app.businessOwner || '',
        technicalOwner:app.technicalOwner || '',
        businessCriticality:app.businessCriticality || 'Unknown',
        strategicImportance:app.strategicImportance || 'Unknown',
        lifecycleStatus:app.lifecycleStatus || 'Unknown',
        expectedRemainingLife:app.expectedRemainingLife || ''
      },
      assessment:assessment ? {
        date:assessment.assessmentDate,
        reviewStatus:assessment.reviewStatus,
        reviewAuthority:assessment.reviewAuthority,
        overallConfidence:pct(assessment.overallConfidence),
        evidenceCompleteness:pct(assessment.evidenceCompleteness),
        leastRegretNextMove:assessment.leastRegretNextMove || '',
        gaps:assessmentGapList
      } : null,
      alternatives:alternativeViews,
      providerEvidence:providerEvidence.map(x=>({
        id:x.id,
        provider:x.provider,
        strategy:x.strategy,
        canonicalStrategy:x.canonicalStrategy || '',
        targetDestination:x.targetDestination || '',
        confidence:x.confidence === null || x.confidence === undefined ? null : pct(x.confidence),
        status:x.status || 'Advisory evidence only',
        source:x.source || x.sourceReference || ''
      })),
      dependencies:{
        unresolvedCount:dependencyIssues.length,
        unresolved:dependencyIssues.map(x=>({
          id:x.dependency.id,
          sourceId:x.dependency.sourceId,
          targetId:x.dependency.targetId,
          type:x.dependency.dependencyType,
          coupling:x.dependency.migrationCoupling,
          confidence:x.dependency.confidence === null ? null : pct(x.dependency.confidence),
          issues:x.issues
        }))
      },
      candidateWave:wave ? {
        id:wave.id,
        applicationIds:wave.applicationIds,
        sequenceLayer:wave.sequenceLayer,
        rationale:wave.rationale,
        unresolvedDependencyCount:wave.unresolvedDependencyCount,
        status:wave.status
      } : null,
      portfolioState:portfolioRow ? {
        state:portfolioRow.state,
        reasons:portfolioRow.reasons,
        candidateWaveId:portfolioRow.candidateWaveId,
        sequenceLayer:portfolioRow.sequenceLayer
      } : null
    };
  });

  const providerSummary = providerCoexistenceSummary(providers);
  const unresolvedQuestions = appPackages.flatMap(x => {
    const items=[];
    if(!x.assessment) items.push(`${x.application.name}: modernization assessment is missing.`);
    else x.assessment.gaps.forEach(g=>items.push(`${x.application.name}: ${g}`));
    if(x.dependencies.unresolvedCount) items.push(`${x.application.name}: ${x.dependencies.unresolvedCount} dependency issue(s) require review.`);
    if(x.portfolioState && ['BLOCKED','DEFERRED_FOR_EVIDENCE','NO_VIABLE_ALTERNATIVE','NOT_ASSESSED'].includes(x.portfolioState.state)){
      x.portfolioState.reasons.forEach(r=>items.push(`${x.application.name}: ${r}`));
    }
    return items;
  });

  return {
    metadata:{
      title:options.title || 'Application Modernization Decision Package',
      client:options.client || 'Client / design partner',
      preparedBy:options.preparedBy || 'ROI-Driven Enterprise Architect',
      preparedAt:options.preparedAt || new Date().toISOString(),
      packageVersion:'M7-v0.1'
    },
    executiveSummary:{
      applications:applications.length,
      alternatives:alternatives.length,
      providers:providerSummary.providers,
      providerEvidenceRecords:providerSummary.count,
      candidateWaves:waves.candidateWaves.length,
      capacityConstraints:portfolio.constrainedCapacity.length,
      unresolvedQuestionCount:unresolvedQuestions.length,
      authorityBoundary:'Decision-support package only. It does not authorize architecture, funding, migration, security exceptions, cutover, or production release.'
    },
    applications:appPackages,
    portfolio:{
      rows:portfolio.rows,
      capacity:portfolio.capacity,
      constrainedCapacity:portfolio.constrainedCapacity,
      nextActions:nextPortfolioActions(portfolio),
      waves:{
        candidateWaves:waves.candidateWaves,
        sequencingCycle:waves.sequencingCycle,
        sequencingRemainder:waves.sequencingRemainder,
        authorityState:waves.authorityState
      }
    },
    providerSummary,
    unresolvedQuestions:[...new Set(unresolvedQuestions)],
    serviceDeliveryBlueprint:[
      {stage:'1. Discover',purpose:'Establish the decision-scoped application, infrastructure, data, dependency, and provider evidence baseline.',exit:'Material inventory gaps and provenance are explicit.'},
      {stage:'2. Assess',purpose:'Evaluate business significance, functional adequacy, technical/data/integration health, security, operations, organization, economics, complexity, and lifecycle.',exit:'Assessment confidence and evidence completeness are visible.'},
      {stage:'3. Rationalize',purpose:'Maintain multiple viable strategies and eliminate only those invalidated by explicit hard constraints.',exit:'Candidate alternatives and unresolved questions are documented.'},
      {stage:'4. Architect',purpose:'Develop and validate provider-neutral target patterns and provider-specific candidate implementations.',exit:'Target architecture candidates remain advisory pending accountable review.'},
      {stage:'5. Plan',purpose:'Use dependencies, candidate waves, economics, readiness, and delivery capacity to build a reviewable modernization portfolio plan.',exit:'Blocked, deferred, ready-to-plan, and capacity-constrained items are distinguishable.'},
      {stage:'6. Validate',purpose:'Use pilots, migration evidence, and actual outcomes to validate assumptions before scaling.',exit:'Forecast-versus-actual evidence is available for reassessment and institutional learning.'}
    ]
  };
}

const esc = value => String(value ?? '').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const moneyFmt = value => value === null || value === undefined ? 'Not established' : Number(value).toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0});
const pctFmt = value => value === null || value === undefined ? 'Not supplied' : `${Math.round(Number(value)*100)}%`;

export function renderDecisionPackageHtml(pkg={}){
  const apps=(pkg.applications||[]).map(a=>{
    const alternatives=(a.alternatives||[]).map(x=>`<tr><td>${esc(x.name)}</td><td>${esc(x.provider)}</td><td>${esc(x.strategyClass)}</td><td>${esc(x.targetArchitecture||'Not established')}</td><td>${x.confidence===null?'Not supplied':esc(x.confidence+'%')}</td><td>${x.economics.comparisonReady?moneyFmt(x.economics.npv):'Incomplete'}</td></tr>`).join('');
    const providers=(a.providerEvidence||[]).map(x=>`<li>${esc(x.provider)}: ${esc(x.strategy||'Not supplied')} -> ${esc(x.targetDestination||'Not supplied')} (${x.confidence===null?'confidence not supplied':esc(x.confidence+'% confidence')}) - ${esc(x.status)}</li>`).join('');
    const gaps=a.assessment?.gaps?.length?a.assessment.gaps.map(x=>`<li>${esc(x)}</li>`).join(''):'<li>No assessment gaps recorded.</li>';
    return `<section><h2>${esc(a.application.name)}</h2><p><strong>Criticality:</strong> ${esc(a.application.businessCriticality)} | <strong>Strategic importance:</strong> ${esc(a.application.strategicImportance)} | <strong>Lifecycle:</strong> ${esc(a.application.lifecycleStatus)}</p><p><strong>Assessment confidence:</strong> ${a.assessment?.overallConfidence ?? 'Not assessed'}% | <strong>Evidence completeness:</strong> ${a.assessment?.evidenceCompleteness ?? 'Not assessed'}%</p><p><strong>Least-regret next move:</strong> ${esc(a.assessment?.leastRegretNextMove||'Not recorded')}</p><h3>Candidate alternatives</h3><table><thead><tr><th>Alternative</th><th>Provider</th><th>Strategy</th><th>Target</th><th>Confidence</th><th>NPV</th></tr></thead><tbody>${alternatives||'<tr><td colspan="6">No alternatives recorded.</td></tr>'}</tbody></table><h3>Provider evidence</h3><ul>${providers||'<li>No provider evidence recorded.</li>'}</ul><h3>Open assessment issues</h3><ul>${gaps}</ul></section>`;
  }).join('');

  const capacity=(pkg.portfolio?.capacity||[]).map(x=>`<tr><td>${esc(x.type)}</td><td>${esc(x.availableFte)}</td><td>${esc(x.demandFte)}</td><td>${esc(x.shortfallFte)}</td><td>${x.constrained?'Constrained':'Available under recorded demand'}</td></tr>`).join('');
  const actions=(pkg.portfolio?.nextActions||[]).map(x=>`<li>${esc(x.applicationId||x.capacityType)}: ${esc(x.action)}</li>`).join('');
  const questions=(pkg.unresolvedQuestions||[]).map(x=>`<li>${esc(x)}</li>`).join('');
  const blueprint=(pkg.serviceDeliveryBlueprint||[]).map(x=>`<tr><td>${esc(x.stage)}</td><td>${esc(x.purpose)}</td><td>${esc(x.exit)}</td></tr>`).join('');

  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(pkg.metadata?.title||'Modernization Decision Package')}</title><style>body{font-family:Arial,sans-serif;max-width:1100px;margin:40px auto;color:#142a3d;line-height:1.45}h1,h2,h3{color:#0d3047}table{width:100%;border-collapse:collapse;margin:12px 0 28px}th,td{border:1px solid #cbd7df;padding:8px;text-align:left;vertical-align:top}th{background:#eef4f7}.boundary{border-left:5px solid #b58522;background:#fff8e8;padding:14px}.muted{color:#526775;font-size:.92rem}@media print{body{margin:12mm}.no-print{display:none}}</style></head><body><h1>${esc(pkg.metadata?.title)}</h1><p><strong>Client:</strong> ${esc(pkg.metadata?.client)}<br><strong>Prepared by:</strong> ${esc(pkg.metadata?.preparedBy)}<br><strong>Prepared:</strong> ${esc(pkg.metadata?.preparedAt)}</p><div class="boundary"><strong>Authority boundary:</strong> ${esc(pkg.executiveSummary?.authorityBoundary)}</div><h2>Executive summary</h2><ul><li>${esc(pkg.executiveSummary?.applications)} application(s)</li><li>${esc(pkg.executiveSummary?.alternatives)} candidate alternative(s)</li><li>Provider evidence: ${esc((pkg.executiveSummary?.providers||[]).join(', ')||'None')}</li><li>${esc(pkg.executiveSummary?.candidateWaves)} candidate transition wave(s)</li><li>${esc(pkg.executiveSummary?.capacityConstraints)} delivery capacity constraint(s)</li><li>${esc(pkg.executiveSummary?.unresolvedQuestionCount)} unresolved question(s)</li></ul>${apps}<section><h2>Delivery capacity</h2><table><thead><tr><th>Capability</th><th>Available FTE</th><th>Demand FTE</th><th>Shortfall</th><th>Status</th></tr></thead><tbody>${capacity||'<tr><td colspan="5">No capacity records.</td></tr>'}</tbody></table><h3>Next portfolio actions</h3><ul>${actions||'<li>No blocking portfolio actions derived from current records.</li>'}</ul></section><section><h2>Unresolved questions</h2><ul>${questions||'<li>No unresolved questions derived from current records.</li>'}</ul></section><section><h2>Service delivery blueprint</h2><table><thead><tr><th>Stage</th><th>Purpose</th><th>Exit condition</th></tr></thead><tbody>${blueprint}</tbody></table></section><p class="muted">Forecast economics are decision-support estimates, not realized savings. Provider recommendations are advisory evidence. Candidate waves are not authorized migration schedules.</p></body></html>`;
}
