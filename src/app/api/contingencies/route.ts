import {NextResponse} from 'next/server';
import {api,ApiError,authenticate,parseQuery,patientContext,readJson,rpc} from '@/lib/server/api';
import {contingencyCase,contingencyCommand,contingencyQuery,parseContingencyCases,parseContingencyReceipt} from '@/lib/validation/contingency';
const reply=(data:unknown)=>NextResponse.json({data},{headers:{'cache-control':'private, no-store'}});
export async function GET(request:Request){return api('contingencies.read',async()=>{
 const params=new URL(request.url).searchParams;if([...params.keys()].some(k=>params.getAll(k).length!==1))throw new ApiError('VALIDATION_ERROR','Não repita os filtros desta consulta.');
 const q=parseQuery(contingencyQuery,Object.fromEntries(params)),auth=await authenticate();await patientContext(auth,q.careRecipientId);
 if(q.view==='recovery'){if(!q.attemptKey)throw new ApiError('VALIDATION_ERROR','Informe a tentativa a consultar.');return reply(parseContingencyReceipt(await rpc(auth.client,'contingency_recovery',{p_patient:q.careRecipientId,p_process:q.process,p_key:q.attemptKey,p_resolve:false}),{patientId:q.careRecipientId,process:q.process,key:q.attemptKey,actorId:auth.userId}));}
 if(q.view==='references')return reply(await rpc(auth.client,'contingency_references',{p_patient:q.careRecipientId,p_process:q.process,p_query:q.query,p_page:q.page}));
 const data=await rpc(auth.client,'contingency_cases',{p_patient:q.careRecipientId,p_process:q.process,p_id:q.id??null,p_page:q.page});
 if(q.id){const c=contingencyCase.parse(data);if(c.id!==q.id||c.patientId!==q.careRecipientId||c.process!==q.process)throw new Error('Unmatched contingency response');return reply(c);}
 return reply(parseContingencyCases(data,q.careRecipientId,q.process,q.page));
});}
export async function POST(request:Request){return api('contingencies.command',async()=>{
 const input=await readJson(request,contingencyCommand,96000),auth=await authenticate();if(input.expectedActorId!==auth.userId)throw new ApiError("CONTEXT_REQUIRED","A conta mudou. Volte ao contexto correto antes de confirmar.",409);await patientContext(auth,input.careRecipientId);
 const data=input.action==='resolve'?await rpc(auth.client,'contingency_recovery',{p_patient:input.careRecipientId,p_process:input.process,p_key:input.idempotencyKey,p_resolve:true}):await rpc(auth.client,'contingency_command',{p_patient:input.careRecipientId,p_process:input.process,p_id:'id' in input?input.id:null,p_expected:'expectedRevision' in input?input.expectedRevision:null,p_action:input.action,p_body:'content' in input?input.content:{reason:input.reason,targetId:input.targetId},p_key:input.idempotencyKey});
 return reply(parseContingencyReceipt(data,{patientId:input.careRecipientId,process:input.process,key:input.idempotencyKey,actorId:auth.userId}));
});}
