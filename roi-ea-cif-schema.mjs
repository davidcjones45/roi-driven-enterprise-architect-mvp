import { CIF_BINDING, CIF_REGISTRY } from './roi-ea-cif-registry.mjs';

// Generated schema view of the application binding. Registry constraints are not
// maintained a second time in a hand-written JSON Schema enum/table.
export function cifApplicationSchema() {
  return {
    $schema:'https://json-schema.org/draft/2020-12/schema',
    $id:'urn:roi-ea:cif:0.4.1:compatibility:1',
    title:'ROI-EA CIF v0.4.1 compatibility binding',type:'object',
    properties:{
      id:{type:'string',minLength:1},family:{enum:CIF_BINDING.family_names.map((_,i)=>`OF-${String(i+1).padStart(2,'0')}`)},
      frameworkVersion:{type:['string','null']},schemaVersion:{type:['string','null']},recordVersion:{type:['string','null']},specializationVersion:{type:['string','null']},
      subtype:{type:['string','null']},absenceStates:{type:'object',additionalProperties:{enum:[...CIF_BINDING.absence_states]}}
    },required:['id','family'],
    allOf:[
      {if:{properties:{family:{const:'OF-01'}},required:['family']},then:{properties:{subtype:{enum:[...CIF_BINDING.actor_subtypes]}},required:['subtype']}},
      {if:{properties:{subtype:{const:'ASSUMPTION_PROPOSITION'}},required:['subtype']},then:{properties:{family:{const:'OF-12'}}}},
      {if:{properties:{subtype:{enum:['ASSUMPTION','ASSUMPTION_ADOPTION']}},required:['subtype']},then:{properties:{family:{const:'OF-16'}},required:['propositionId','actorId','scope','basisRef','relyingIds','reassessmentTriggerRefs']}}
    ],
    $defs:{relationship:{type:'object',required:['id','relationshipType','sourceId','targetId','sourceFamily','targetFamily','representationMode'],
      properties:{relationshipType:{enum:CIF_REGISTRY.relationships.map(r=>r.relationship_type)}},
      allOf:CIF_REGISTRY.relationships.map(row=>({if:{properties:{relationshipType:{const:row.relationship_type}},required:['relationshipType']},then:{
        properties:{representationMode:{const:row.authoritative_representation},
          ...Object.fromEntries(['source','target'].map(side=>[`${side}Family`,{enum:row[`allowed_${side}`].includes('ANY_GOVERNED_OBJECT')?CIF_BINDING.family_names.map((_,i)=>`OF-${String(i+1).padStart(2,'0')}`):row[`allowed_${side}`]}]))},
        ...(row.basis_requirement==='MUST'?{required:['basisRef']}:{})
      }}))}}
  };
}
