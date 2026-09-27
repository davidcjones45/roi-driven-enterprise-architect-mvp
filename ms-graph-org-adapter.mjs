import { normalizeGraphNode, normalizeGraphEdge } from './dependency-graph-model.mjs';

function text(v){ return String(v ?? '').trim(); }

export function microsoftGraphOrgToDependencyGraph(input={}) {
  const users=Array.isArray(input.users)?input.users:[];
  const relationships=Array.isArray(input.relationships)?input.relationships:[];
  const nodes=[]; const edges=[]; const unresolved=[];
  const known=new Set();

  for(const user of users){
    const id=text(user.id);
    if(!id){ unresolved.push({type:'USER_WITHOUT_ID',record:user}); continue; }
    const nodeId=`MSUSER-${id}`;
    known.add(id);
    nodes.push(normalizeGraphNode({
      id:nodeId,
      label:text(user.displayName)||text(user.userPrincipalName)||id,
      nodeType:'person',
      owner:text(user.managerDisplayName),
      sourceSystem:'Microsoft Graph',
      provenance:[{sourceType:'Microsoft Graph',sourceId:id,sourceReference:id,observedAt:text(input.retrievedAt)}],
      sourceReference:id,
      tags:[text(user.jobTitle),text(user.department),text(user.officeLocation),text(user.companyName)].filter(Boolean),
      attributes:{
        userPrincipalName:text(user.userPrincipalName),
        jobTitle:text(user.jobTitle), department:text(user.department),
        officeLocation:text(user.officeLocation), companyName:text(user.companyName),
        employeeId:text(user.employeeId), costCenter:text(user.employeeOrgData?.costCenter),
        division:text(user.employeeOrgData?.division),
      }
    }));
  }

  for(const rel of relationships){
    const employeeId=text(rel.userId||rel.employeeId);
    const managerId=text(rel.managerId);
    if(!employeeId || !managerId || !known.has(employeeId) || !known.has(managerId)){
      unresolved.push({type:'UNRESOLVED_MANAGER_RELATIONSHIP',userId:employeeId,managerId});
      continue;
    }
    edges.push(normalizeGraphEdge({
      id:`MSREL-${employeeId}-${managerId}`,
      sourceId:`MSUSER-${employeeId}`,
      targetId:`MSUSER-${managerId}`,
      edgeType:'reports-to',
      dimension:'organizational',
      resolutionState:'Resolved',
      sourceSystem:'Microsoft Graph',
      provenance:[{sourceType:'Microsoft Graph',sourceId:`${employeeId}->${managerId}`,sourceReference:'Microsoft Graph manager/directReports relationship',observedAt:text(input.retrievedAt)}],
      sourceReference:'Microsoft Graph manager/directReports relationship',
    }));
  }

  return {
    nodes,edges,unresolved,
    source:{type:'Microsoft Graph',tenantId:text(input.tenantId),retrievedAt:text(input.retrievedAt)},
    limitations:[
      'Reporting relationships describe directory organization structure, not process ownership or decision authority.',
      'Imported attributes may be incomplete or stale and require client validation before consulting conclusions.',
    ]
  };
}
