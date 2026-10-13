import { createGuardedStore,isRecord } from './ux-safety-model.mjs';
import { validateCase } from './logistics-release-diagnostic.mjs';
export const LOGISTICS_KEY='roi-ea-logistics-release-v0.1';
function normalize(raw){
 if(!isRecord(raw)||raw.schemaVersion!==1||!Array.isArray(raw.cases))throw Error('Unsupported Logistics workspace.');
 const ids=new Set();return {...raw,cases:raw.cases.map(c=>{const v=validateCase(c);if(ids.has(v.id))throw Error('Duplicate case ID.');ids.add(v.id);return v;})};
}
export function createLogisticsStore(storage){
 const guarded=createGuardedStore({key:LOGISTICS_KEY,storage,empty:()=>({schemaVersion:1,cases:[]}),normalize});let data=guarded.read();
 return {list:()=>structuredClone(data.cases),state:()=>guarded.getState(),recovery:()=>guarded.getState().raw||JSON.stringify(data),save(input){const c=validateCase(input),next=structuredClone(data),i=next.cases.findIndex(x=>x.id===c.id);if(i<0)next.cases.push(c);else next.cases[i]=c;guarded.save(normalize(next));data=next;return structuredClone(c);}};
}
