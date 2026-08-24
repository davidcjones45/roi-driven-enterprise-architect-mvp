const SENSITIVE_KEYS = new Set(['age','race','ethnicity','sex','gender','protected_class','protectedclass','hmda_demographic']);
const REQUIRED_INPUTS = ['application_id','bank','applicant_name','verified_base_annual_income','candidate_overtime_annual_income','gross_annual_income','credit_score','purchase_price','loan_amount','housing_expense_monthly','other_debt_monthly','liquid_reserves','overtime_evidence_accepted','current_asset_statement_accepted','synthetic_marker'];

const asMap = rows => Object.fromEntries(rows.map(row => [row.field, row]));
const policyMap = rows => Object.fromEntries(rows.map(row => [row.criterion, row]));
const unique = values => [...new Set(values)];
const finite = value => Number.isFinite(Number(value));
const round = (value, places=4) => Number(Number(value).toFixed(places));

function sensitivePaths(value, path='$', found=[]){
  if(Array.isArray(value)) value.forEach((item,index)=>sensitivePaths(item,`${path}[${index}]`,found));
  else if(value && typeof value==='object') for(const [key,item] of Object.entries(value)){
    if(SENSITIVE_KEYS.has(key.toLowerCase())) found.push(`${path}.${key}`);
    sensitivePaths(item,`${path}.${key}`,found);
  }
  return found;
}

export function validateMortgageFixture(fixture={}){
  const errors=[];
  if(fixture.synthetic!==true) errors.push('Fixture must be explicitly synthetic.');
  if(!Array.isArray(fixture.caseInputs)) errors.push('Case Inputs are required.');
  if(!Array.isArray(fixture.policy)) errors.push('Fictional Policy is required.');
  if(!Array.isArray(fixture.evidence)) errors.push('Evidence Inventory is required.');
  if(!Array.isArray(fixture.erirSources)) errors.push('ERIR Source Seed is required.');
  const sensitive=sensitivePaths(fixture);
  if(sensitive.length) errors.push(`Sensitive applicant fields are prohibited from the demonstrator projection: ${sensitive.join(', ')}`);
  const inputs=asMap(fixture.caseInputs||[]);
  const sensitiveInputFields=(fixture.caseInputs||[]).filter(row=>SENSITIVE_KEYS.has(String(row.field||'').toLowerCase())).map(row=>row.field);
  if(sensitiveInputFields.length) errors.push(`Sensitive applicant fields are prohibited from the demonstrator projection: ${unique(sensitiveInputFields).join(', ')}`);
  for(const name of REQUIRED_INPUTS) if(!inputs[name]) errors.push(`Required input is missing: ${name}`);
  for(const name of ['verified_base_annual_income','candidate_overtime_annual_income','gross_annual_income','credit_score','purchase_price','loan_amount','housing_expense_monthly','other_debt_monthly','liquid_reserves']) if(inputs[name]&&!finite(inputs[name].value)) errors.push(`Input must be numeric: ${name}`);
  if(inputs.synthetic_marker?.value!==true) errors.push('Every implemented case must retain its synthetic-data marker.');
  if((fixture.importedSheets||[]).includes('Protected Audit')) errors.push('Protected Audit may not be imported into the demonstrator.');
  if((fixture.evidence||[]).some(row=>String(row.documentType||'').toLowerCase().includes('demographic'))) errors.push('Protected-class audit evidence may not be imported into MERCA.');
  const duplicates=[];
  for(const collection of ['caseInputs','policy','evidence','erirSources']){
    const ids=(fixture[collection]||[]).map(x=>x.id);
    ids.filter((id,index)=>ids.indexOf(id)!==index).forEach(id=>duplicates.push(`${collection}:${id}`));
  }
  if(duplicates.length) errors.push(`Duplicate stable identifiers: ${unique(duplicates).join(', ')}`);
  return {valid:errors.length===0, errors};
}

function comparison(metric, value, rule){
  if(rule.operator==='minimum'){
    if(value>=rule.standard) return {state:'Within fictional standard', band:'standard'};
    if(rule.exceptionBoundary!==null && value>=rule.exceptionBoundary) return {state:'Within fictional exception-review band', band:'exception'};
    return {state:'Outside fictional band', band:'outside'};
  }
  if(rule.operator==='maximum'){
    if(value<=rule.standard) return {state:'Within fictional standard', band:'standard'};
    if(rule.exceptionBoundary!==null && value<=rule.exceptionBoundary) return {state:'Within fictional exception-review band', band:'exception'};
    return {state:'Outside fictional band', band:'outside'};
  }
  return {state:'Evidence acceptance required', band:'evidence'};
}

export function evaluateMortgageCase(fixture={}, options={}){
  const validation=validateMortgageFixture(fixture);
  if(!validation.valid) return {valid:false, errors:validation.errors, decisionState:'NOT MADE', aiActionState:'ABSTAIN'};
  const inputs=asMap(fixture.caseInputs);
  const rules=policyMap(fixture.policy);
  const currentConfigurationId=options.currentConfigurationId||fixture.capability.currentConfigurationId;
  const configurationMatch=currentConfigurationId===fixture.capability.reviewedConfigurationId;
  const grossAnnualIncome=Number(inputs.gross_annual_income.value);
  const baseAnnualIncome=Number(inputs.verified_base_annual_income.value);
  const housing=Number(inputs.housing_expense_monthly.value);
  const otherDebt=Number(inputs.other_debt_monthly.value);
  const obligations=housing+otherDebt;
  const monthlyIncome=grossAnnualIncome/12;
  const baseMonthlyIncome=baseAnnualIncome/12;
  const metrics={
    grossMonthlyIncome:round(monthlyIncome,2),
    totalMonthlyObligations:round(obligations,2),
    totalDti:round(obligations/monthlyIncome,8),
    combinedLtv:round(Number(inputs.loan_amount.value)/Number(inputs.purchase_price.value),8),
    reserveMonths:round(Number(inputs.liquid_reserves.value)/housing,8),
    baseOnlyDti:round(obligations/baseMonthlyIncome,8)
  };
  const policyTrace=[
    {metric:'Credit score', value:Number(inputs.credit_score.value), unit:'score', inputIds:['IN-010'], policyId:'POL-001', ...comparison('credit_score',Number(inputs.credit_score.value),rules.credit_score)},
    {metric:'Combined LTV', value:metrics.combinedLtv, unit:'percentage', inputIds:['IN-011','IN-012'], policyId:'POL-002', ...comparison('combined_ltv',metrics.combinedLtv,rules.combined_ltv)},
    {metric:'Total DTI', value:metrics.totalDti, unit:'percentage', inputIds:['IN-009','IN-013','IN-014'], policyId:'POL-003', ...comparison('total_dti',metrics.totalDti,rules.total_dti)},
    {metric:'Post-closing reserves', value:metrics.reserveMonths, unit:'months', inputIds:['IN-013','IN-015'], policyId:'POL-004', ...comparison('post_closing_reserves',metrics.reserveMonths,rules.post_closing_reserves)}
  ];
  const gaps=[];
  if(inputs.overtime_evidence_accepted.value!==true) gaps.push({id:'GAP-MTG-001', evidenceId:'DOC-MTG-004', message:'Overtime continuity evidence is not accepted.', requiredAction:'Qualified human review or evidence request'});
  if(inputs.current_asset_statement_accepted.value!==true) gaps.push({id:'GAP-MTG-002', evidenceId:'DOC-MTG-008', message:'A required current asset statement is missing.', requiredAction:'Qualified human evidence request'});
  if(!configurationMatch) gaps.push({id:'GAP-MTG-003', evidenceId:'CFG-MERCA-001', message:'Current capability configuration differs from the reviewed configuration.', requiredAction:'Suspend use and complete reassessment'});
  const outside=policyTrace.filter(item=>item.band==='outside');
  const exception=policyTrace.filter(item=>item.band==='exception');
  const abstain=gaps.length>0||outside.length>0;
  return {
    valid:true,
    fixtureId:fixture.fixtureId,
    applicationId:inputs.application_id.value,
    sourceArtifact:fixture.sourceArtifact,
    sourceSha256:fixture.sourceSha256,
    capability:{...fixture.capability,currentConfigurationId,configurationMatch},
    metrics,
    metricTrace:[
      {id:'CALC-001', metric:'Gross monthly income', value:metrics.grossMonthlyIncome, inputIds:['IN-009'], formula:'gross_annual_income / 12'},
      {id:'CALC-002', metric:'Total monthly obligations', value:metrics.totalMonthlyObligations, inputIds:['IN-013','IN-014'], formula:'housing_expense_monthly + other_debt_monthly'},
      {id:'CALC-003', metric:'Total DTI', value:metrics.totalDti, inputIds:['IN-009','IN-013','IN-014'], formula:'total_monthly_obligations / gross_monthly_income'},
      {id:'CALC-004', metric:'Combined LTV', value:metrics.combinedLtv, inputIds:['IN-011','IN-012'], formula:'loan_amount / purchase_price'},
      {id:'CALC-005', metric:'Reserve months', value:metrics.reserveMonths, inputIds:['IN-013','IN-015'], formula:'liquid_reserves / housing_expense_monthly'},
      {id:'CALC-006', metric:'Base-only DTI sensitivity', value:metrics.baseOnlyDti, inputIds:['IN-007','IN-013','IN-014'], formula:'total_monthly_obligations / (verified_base_annual_income / 12)'}
    ],
    policyTrace,
    evidenceGaps:gaps,
    reviewQuestions:gaps.map(gap=>gap.requiredAction==='Suspend use and complete reassessment'?'Has the current configuration been independently reviewed and reauthorized?':`Has ${gap.evidenceId} been supplied, reviewed, and accepted by qualified bank personnel?`),
    financialReviewRoute:outside.length?'OUTSIDE FICTIONAL BAND—HUMAN DISPOSITION REQUIRED':exception.length?'MANUAL EXCEPTION REVIEW CANDIDATE':'FICTIONAL STANDARD CRITERIA SATISFIED',
    evidenceState:gaps.length?'INSUFFICIENT EVIDENCE':'EVIDENCE COMPLETE FOR CONTROLLED COMPARISON',
    aiActionState:abstain?'ABSTAIN—ADVISORY TRACE ONLY':'ADVISORY TRACE ONLY',
    decisionState:'NOT MADE',
    authorityState:'NO CREDIT OR ACTION AUTHORITY',
    fairnessClaim:'NOT ESTABLISHED',
    interpretationLimit:'This deterministic synthetic demonstration does not establish approval, denial, eligibility, pricing, compliance, fair-lending performance, model validity, production safety, effectiveness, or realized ROI.'
  };
}
