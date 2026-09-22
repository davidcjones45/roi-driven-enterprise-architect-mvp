// M3 AWS discovery-to-dependency bridge.
// Conservative translation only: unresolved endpoints remain unresolved.

import { stableId } from './authority-model.mjs';
import { normalizeDependency } from './modernization-dependency-model.mjs';

const first=(obj,names)=>names.map(n=>obj?.[n]).find(v=>v!==undefined&&v!==null&&String(v).trim()!=='')||'';

function appForResource(resourceId, associations=[]){
  const matches=associations.filter(r=>{
    const row=r.row||r;
    const rid=first(row,['resourceId','resourceID','serverId','serverID','configurationId','configurationID']);
    return String(rid)===String(resourceId);
  });
  const ids=[...new Set(matches.map(r=>first(r.row||r,['applicationId','applicationID','applicationConfigurationId'])).filter(Boolean))];
  return ids.length===1?ids[0]:'';
}

export function awsDiscoveryDependencies(awsDiscoveryImports=[], options={}) {
  const imports=awsDiscoveryImports||[];
  const associationRows=imports
    .filter(x=>x.fileType==='applicationResourceAssociation')
    .flatMap(x=>x.records||[]);

  const connectionRecords=imports
    .filter(x=>['sourceProcessConnection','destinationProcessConnection'].includes(x.fileType))
    .flatMap(x=>(x.records||[]).map(r=>({...r,_fileType:x.fileType,_sourceReference:x.sourceReference||x.filename||''})));

  const dependencies=[], unresolved=[];
  for(const rec of connectionRecords){
    const row=rec.row||{};
    const sourceResource=first(row,[
      'sourceServerId','sourceServerID','sourceConfigurationId','sourceResourceId',
      'serverId','serverID','configurationId'
    ]);
    const targetResource=first(row,[
      'destinationServerId','destinationServerID','destinationConfigurationId','destinationResourceId',
      'remoteServerId','remoteServerID','remoteConfigurationId'
    ]);
    const sourceApp=appForResource(sourceResource,associationRows);
    const targetApp=appForResource(targetResource,associationRows);
    const protocol=first(row,['protocol','transportProtocol']);
    const port=first(row,['destinationPort','remotePort','port']);

    const dep=normalizeDependency({
      id:stableId(`AWS-${rec._fileType}-${sourceResource||'unknown'}-${targetResource||'unknown'}-${protocol}-${port}`,'DEP'),
      sourceId:sourceApp,
      targetId:targetApp,
      sourceType:'application',
      targetType:'application',
      dependencyType:'network',
      direction:'DIRECTED',
      criticality:'Unknown',
      migrationCoupling:'Unknown',
      confidence:(sourceApp&&targetApp)?0.6:null,
      resolutionState:(sourceApp&&targetApp)?'Partially resolved':'Unresolved',
      evidenceRefs:[rec.id].filter(Boolean),
      sourceProvider:'AWS',
      sourceReference:rec._sourceReference,
      notes:`Discovery connection ${sourceResource||'?'} → ${targetResource||'?'}${protocol?` via ${protocol}`:''}${port?`:${port}`:''}. Migration coupling and business criticality require review.`
    });

    if(sourceApp&&targetApp) dependencies.push(dep);
    else unresolved.push({
      dependency:dep,
      unresolvedSourceResource:sourceResource,
      unresolvedTargetResource:targetResource,
      reason:'AWS discovery connection could not be mapped uniquely to both local applications.'
    });
  }

  return {
    provider:'AWS',
    dependencies,
    unresolved,
    warnings: unresolved.length
      ? [`${unresolved.length} discovered connection(s) could not be mapped uniquely to local applications.`]
      : []
  };
}
