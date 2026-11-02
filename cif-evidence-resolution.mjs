/** Local evidence register: reference resolution is not authentication of an external source. */
const present=x=>typeof x==='string'&&x.trim().length>0;
export function resolveEvidenceReferences(refs=[],register=[],{asOf=null}={}){
 const issues=[],resolved=[],ids=new Set();
 if(!Array.isArray(refs))return {valid:false,issues:['Evidence references must be an array.'],resolved:[]};
 for(const ref of refs){
  if(!present(ref)){issues.push('Blank evidence reference.');continue}
  if(ids.has(ref)){issues.push('Duplicate evidence reference '+ref);continue}ids.add(ref);
  const matches=register.filter(x=>x.id===ref);
  if(matches.length!==1){issues.push('Unresolved or ambiguous evidence reference '+ref);continue}
  const e=matches[0];
  if(!present(e.source)||!present(e.ownerId)||!present(e.revision)||!present(e.recordedAt))issues.push('Incomplete provenance '+ref);
  if(e.status!=='VERIFIED')issues.push('Evidence '+ref+' is not verified.');
  if(asOf&&e.effectiveFrom&&e.effectiveFrom>asOf)issues.push('Evidence '+ref+' is not effective yet.');
  if(asOf&&e.effectiveTo&&e.effectiveTo<asOf)issues.push('Evidence '+ref+' has expired.');
  resolved.push(e);
 }
 return {valid:issues.length===0,issues,resolved};
}
export function validateP1Evidence(context={},register=[]){
 const refs=[...(context.baseline?.evidenceRefs||[])];
 for(const a of [...(context.costAllocations||[]),...(context.benefitAllocations||[])])refs.push(a.evidenceRef);
 for(const b of context.benefitItems||[])if(b.category==='CASHABLE')refs.push(b.evidenceRef);
 const unique=[...new Set(refs.filter(Boolean))];
 if(!unique.length)return {valid:false,issues:['At least one resolvable P1 evidence reference is required.'],resolved:[]};
 return resolveEvidenceReferences(unique,register,{asOf:context.baseline?.effectiveFrom||null});
}
