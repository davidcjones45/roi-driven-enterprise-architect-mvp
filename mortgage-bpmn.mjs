const MAX_XML_BYTES = 250_000;
const FLOW_NODE_TYPES = new Set(['startEvent','endEvent','userTask','manualTask','serviceTask','businessRuleTask','exclusiveGateway']);
const SUPPORTED_TAGS = [...FLOW_NODE_TYPES, 'sequenceFlow'];
const PROHIBITED_XML = [
  {pattern:/<!DOCTYPE/i, message:'DOCTYPE declarations are prohibited.'},
  {pattern:/<!ENTITY/i, message:'Entity declarations are prohibited.'},
  {pattern:/<(?:\w+:)?scriptTask\b/i, message:'Script tasks are outside the controlled subset.'},
  {pattern:/<(?:\w+:)?callActivity\b/i, message:'Call activities are outside the controlled subset.'},
];
const CONSEQUENT_WORDS = /\b(approve|deny|decision|eligibility|price|pricing|counteroffer|notice|disburse|funds?|commitment|authorize)\b/i;

function decodeXml(value='') {
  return String(value).replaceAll('&quot;','"').replaceAll('&apos;',"'").replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&amp;','&');
}

function attributes(raw='') {
  const result={};
  const pattern=/([A-Za-z_][\w.:-]*)\s*=\s*("[^"]*"|'[^']*')/g;
  for (const match of raw.matchAll(pattern)) result[match[1]]=decodeXml(match[2].slice(1,-1));
  return result;
}

function tags(xml) {
  const names=SUPPORTED_TAGS.join('|');
  const pattern=new RegExp(`<(?:\\w+:)?(${names})\\b([^>]*)\\/?\\s*>`,'g');
  return [...xml.matchAll(pattern)].map(match=>({type:match[1],...attributes(match[2])}));
}

export function importMortgageBpmn(xml='') {
  const errors=[];
  if (typeof xml!=='string' || !xml.trim()) return {valid:false, errors:['BPMN XML is required.']};
  if (new TextEncoder().encode(xml).length>MAX_XML_BYTES) errors.push(`BPMN XML exceeds the ${MAX_XML_BYTES}-byte controlled limit.`);
  if (!/xmlns:bpmn=["']http:\/\/www\.omg\.org\/spec\/BPMN\/20100524\/MODEL["']/.test(xml)) errors.push('The BPMN 2.0 model namespace is required.');
  for (const rule of PROHIBITED_XML) if (rule.pattern.test(xml)) errors.push(rule.message);
  const processMatches=[...xml.matchAll(/<(?:\w+:)?process\b([^>]*)>/g)];
  if (processMatches.length!==1) errors.push('Exactly one process is required in the controlled fixture.');
  const process=processMatches[0]?attributes(processMatches[0][1]):{};
  if (process.isExecutable!=='false') errors.push('The controlled fixture must declare isExecutable="false".');

  const parsed=tags(xml);
  const nodes=parsed.filter(item=>FLOW_NODE_TYPES.has(item.type));
  const flows=parsed.filter(item=>item.type==='sequenceFlow');
  const allIds=[...nodes,...flows].map(item=>item.id).filter(Boolean);
  const duplicateIds=[...new Set(allIds.filter((id,index)=>allIds.indexOf(id)!==index))];
  if (duplicateIds.length) errors.push(`Duplicate BPMN identifiers: ${duplicateIds.join(', ')}`);
  for (const item of [...nodes,...flows]) if (!item.id) errors.push(`A ${item.type} is missing its id.`);
  if (nodes.filter(node=>node.type==='startEvent').length!==1) errors.push('Exactly one start event is required.');
  if (nodes.filter(node=>node.type==='endEvent').length<1) errors.push('At least one end event is required.');
  const nodeIds=new Set(nodes.map(node=>node.id));
  for (const flow of flows) {
    if (!nodeIds.has(flow.sourceRef)) errors.push(`Sequence flow ${flow.id||'(missing id)'} has an unknown sourceRef: ${flow.sourceRef||'(missing)'}.`);
    if (!nodeIds.has(flow.targetRef)) errors.push(`Sequence flow ${flow.id||'(missing id)'} has an unknown targetRef: ${flow.targetRef||'(missing)'}.`);
  }

  if (!errors.length) {
    const start=nodes.find(node=>node.type==='startEvent');
    const outgoing=new Map(nodes.map(node=>[node.id,[]]));
    flows.forEach(flow=>outgoing.get(flow.sourceRef)?.push(flow.targetRef));
    const reached=new Set([start.id]);
    const queue=[start.id];
    while(queue.length) for (const next of outgoing.get(queue.shift())||[]) if(!reached.has(next)){reached.add(next);queue.push(next);}
    const unreachable=nodes.filter(node=>!reached.has(node.id)).map(node=>node.id);
    if (unreachable.length) errors.push(`Unreachable flow nodes: ${unreachable.join(', ')}`);
  }

  return {
    valid:errors.length===0,
    errors,
    process:{id:process.id||null,name:process.name||null,isExecutable:process.isExecutable||null},
    nodes,
    flows,
    limits:{profile:'AIHS-BPMN-SUBSET-V0.1',fullBpmnValidation:false,executionAuthorized:false,semanticCorrectnessEstablished:false},
  };
}

export function analyzeBoundedAiOpportunities(model={}) {
  if (!model.valid) return {valid:false, errors:model.errors||['A valid controlled BPMN model is required.']};
  const candidates=[];
  const violations=[];
  for (const node of model.nodes) {
    const marked=node['aihs:aiCandidate']==='bounded-support';
    if (!marked) continue;
    if (!['serviceTask','businessRuleTask'].includes(node.type)) violations.push(`${node.id}: only serviceTask and businessRuleTask may be marked as bounded-support candidates.`);
    if (node['aihs:authority']!=='none') violations.push(`${node.id}: bounded support must declare aihs:authority="none".`);
    if (!node['aihs:purpose']) violations.push(`${node.id}: bounded support must declare an explicit purpose.`);
    if (CONSEQUENT_WORDS.test(node.name||'') || CONSEQUENT_WORDS.test(node['aihs:purpose']||'')) violations.push(`${node.id}: consequential decision or action language is incompatible with bounded support.`);
    candidates.push({
      nodeId:node.id,
      name:node.name||node.id,
      bpmnType:node.type,
      purpose:node['aihs:purpose']||null,
      authority:'NONE',
      disposition:'PROSPECTIVE CANDIDATE—NOT APPROVED OR IMPLEMENTED',
      requiredControls:['Permitted data and purpose','Traceable inputs and outputs','Human challenge and correction','Abstention on missing evidence','Manual fallback','Qualified accountable disposition'],
    });
  }
  return {
    valid:violations.length===0,
    errors:violations,
    candidates,
    protectedHumanNodes:model.nodes.filter(node=>node.type==='userTask'||node.type==='manualTask').map(node=>({nodeId:node.id,name:node.name||node.id,reason:'Human task is not converted into an AI authority candidate.'})),
    decisionGateways:model.nodes.filter(node=>node.type==='exclusiveGateway').map(node=>({nodeId:node.id,name:node.name||node.id,authorityState:'UNASSIGNED BY MODEL; NO AI AUTHORITY'})),
    conclusion:'Candidate identification is analytical only. It does not establish process validity, legal compliance, operational effectiveness, implementation suitability, approval, or authority.',
  };
}
