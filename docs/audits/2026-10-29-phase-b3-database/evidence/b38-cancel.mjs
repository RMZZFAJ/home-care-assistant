/* MUTABLE LOCAL B3: conflicting physical commands serialized on patient lock. */
import Decimal from 'decimal.js';
import {actor,state,recorder,assert,randomUUID,createDoc,docState,countStock,move} from './local-harness.mjs';
import {raw,atStockLock,safe} from './concurrency-harness.mjs';
const audit=recorder('B3.8c',{resume:true});
await audit.scenario('B38-12','Cancelar e aceitar simultaneamente conservam custódias em uma ordem válida',async()=>{
 const admin=await actor('admin'),family=await actor('family'),pro=await actor('professional'),p=state.objects.raceProduct;await move(admin,p,'1');const d=await createDoc(family,'ENT',{source:'FAMILY',destination:'CARE_TEAM',recipientId:state.actors.professional.id,lines:[{productId:p,quantity:'1'}]}),before=countStock(p),race=await atStockLock(state.patient,[()=>raw(pro,'supply_document_command',{p_id:d.id,p_action:'receive',p_body:{divergences:[]},p_key:randomUUID(),p_version:d.version}),()=>raw(admin,'supply_document_command',{p_id:d.id,p_action:'cancel',p_body:{reason:'Intenção contrária concorrente B3'},p_key:randomUUID(),p_version:d.version})]),after=countStock(p),doc=docState(d.id),total=s=>new Decimal(s.FAMILY).plus(s.CARE_TEAM).plus(s.TRANSIT).toString();
 assert.equal(race.responses.filter(x=>x.status===200).length,1);assert.equal(total(before),total(after));assert.equal(after.TRANSIT,'0.000000');assert.ok(['confirmed','cancelled'].includes(doc.status));return {barrier:{requests:race.independentHTTP,waiters:race.waitersObserved},responses:race.responses.map(safe),before,after,documentState:doc.status,oneCommandRejectedByExpectedVersion:true};
});audit.finish();
