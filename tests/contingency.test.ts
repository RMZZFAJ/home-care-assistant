import {expect,it} from 'vitest';
import {contingencyCommand,contingencyContent,emptyContingency,parseContingencyCases,parseContingencyReceipt,storedContingencyContent} from '@/lib/validation/contingency';
const patient='20000000-0000-4000-8000-000000000001',actor='20000000-0000-4000-8000-000000000002',key='20000000-0000-4000-8000-000000000003',id='20000000-0000-4000-8000-000000000004';
const content=()=>({...emptyContingency(),fact:'Declaração física fictícia, sem presumir ciência.'});
it('keeps explicit unknowns and valid known physical time separate from digital attribution',()=>{
 expect(contingencyContent.parse(content()).receiver).toBeNull();expect(contingencyContent.parse({...content(),occurredOn:'2026-11-11',occurredTime:'13:45',timeZone:'America/Sao_Paulo'}).occurredTime).toBe('13:45');
 for(const invalid of [{...content(),occurredTime:'13:45'},{...content(),receiver:''},{...content(),actorId:actor},{...content(),occurredTime:'25:12'},{...content(),materials:[{productId:null,description:null,quantity:'NaN',custody:null}]}])expect(contingencyContent.safeParse(invalid).success).toBe(false);
});
it('normalizes exact decimal input while preserving zero unknowns and server-owned unit snapshots',()=>{
 const material={productId:'material',description:null,quantity:'0',custody:'CARE_TEAM' as const,reviewedUnit:'unidade',reviewedDecimals:0};expect(contingencyContent.parse({...content(),materials:[material]}).materials[0].quantity).toBe('0');expect(contingencyContent.parse({...content(),materials:[{...material,quantity:'0,125'}]}).materials[0].quantity).toBe('0.125');expect(contingencyContent.safeParse({...content(),materials:[{...material,unit:'inventada'}]}).success).toBe(false);
 const stored=storedContingencyContent.parse({...content(),materials:[{productId:material.productId,description:null,quantity:'0',custody:material.custody,productName:'Nome histórico',unit:'unidade',decimals:0}]});expect(stored.materials[0].unit).toBe('unidade');
});
it('requires expected actor and a matching explicit decision without arbitrary client fields',()=>{
 const base={careRecipientId:patient,expectedActorId:actor,process:'REQ' as const,idempotencyKey:key};expect(contingencyCommand.parse({...base,action:'record',content:content()}).action).toBe('record');
 for(const invalid of [{...base,expectedActorId:undefined,action:'record',content:content()},{...base,action:'link_existing',id,expectedRevision:1,reason:'Conferido',targetId:null},{...base,action:'needs_clarification',id,expectedRevision:1,reason:'Conferido',targetId:id}])expect(contingencyCommand.safeParse(invalid).success).toBe(false);
});
it('never accepts another scope or an incomplete confirmation as the official result',()=>{
 const scope={patientId:patient,actorId:actor,process:'REQ',key},value={...scope,persistence:'confirmed',caseId:id,revision:1,action:'record',recordedAt:'2026-11-12T12:00:00Z'};
 expect(parseContingencyReceipt(value,scope).caseId).toBe(id);
 for(const invalid of [{...value,patientId:actor},{...value,actorId:patient},{...value,process:'COM'},{...value,key:actor},{...value,caseId:undefined},{...value,revision:undefined}])expect(()=>parseContingencyReceipt(invalid,scope)).toThrow();
 expect(()=>parseContingencyCases({patientId:patient,process:'REQ',page:0,pageSize:25,total:1,canReport:true,data:[]},patient,'REQ',0)).toThrow();
});
