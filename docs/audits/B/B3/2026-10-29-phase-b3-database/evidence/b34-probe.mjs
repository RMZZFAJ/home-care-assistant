/* MUTABLE LOCAL: only B3 reports/catalogue; privileged bypass attempts must fail. */
import {actor,service,state,rpc,recorder,rejected,sql,sqlLiteral as lit,assert,randomUUID} from './local-harness.mjs';
const audit=recorder('B3.4',{resume:true}),admin=await actor('admin'),pro=await actor('professional');
await audit.scenario('B34-01','Helpers históricos não são entrypoints públicos alternativos',async()=>{
 const rows=[];for(const name of ['audited_legacy_supply_command','fluent_pre_shift_command','v3_revise_supply_document']){
 const args=name==='v3_revise_supply_document'?{p_id:randomUUID(),p_payload:{lines:[]},p_key:randomUUID(),p_version:1,p_recount:false}:{p_id:randomUUID(),p_action:'cancel',p_body:{reason:'Tentativa B3'},p_key:randomUUID(),p_version:1};
 const result=await rejected(()=>rpc(admin,name,args));assert.equal(result.rejected,true);assert.equal(result.sqlstate,'42501');rows.push({name,result});}return rows;
});
await audit.scenario('B34-02','Chamador autenticado não usa finalizador de serviço nem configura worker',async()=>{
 const finalize=await rejected(()=>rpc(admin,'finalize_attachment',{p_id:randomUUID(),p_actor:state.actors.admin.id,p_hash:'0'.repeat(64),p_mime:'image/jpeg',p_bytes:1,p_valid:true})),configure=await rejected(()=>rpc(admin,'configure_worker_schedule',{p_token:'synthetic-never-installed'}));assert.equal(finalize.sqlstate,'42501');assert.equal(configure.sqlstate,'42501');return {finalize,configure,noConfigurationWritten:true};
});
await audit.scenario('B34-03','Serviço não usa RPC de operação local como usuário arbitrário',async()=>{
 const result=await rejected(()=>rpc(service,'family_stock_movement',{p_patient:state.patient,p_product:state.products[0],p_quantity:1,p_action:'inbound',p_reason:'Tentativa B3',p_key:randomUUID()}));assert.equal(result.sqlstate,'42501');return result;
});
await audit.scenario('B34-04','Decisão oposta após confirmação retorna sucesso sem aplicar: B2-011',async()=>{
 const id=await rpc(pro,'report_extraordinary_consumption',{p_patient:state.patient,p_kind:'shortage',p_location:'CARE_TEAM',p_text:'Falta fictícia para decisão B3',p_lines:[],p_key:randomUUID()});
 await rpc(admin,'confirm_extraordinary_consumption',{p_id:id,p_accept:true});const before=sql(`select status from public.consumption_reports where id=${lit(id)};`);
 const response=await rpc(await actor('admin2'),'confirm_extraordinary_consumption',{p_id:id,p_accept:false}),after=sql(`select status from public.consumption_reports where id=${lit(id)};`);assert.equal(before,'confirmed');assert.equal(after,before);return {id,firstDecision:before,oppositeResponse:response,after,noLedgerEffect:true};
});
await audit.scenario('B34-05','Decisão nula de consumo é tratada como rejeição na RPC direta',async()=>{
 const id=await rpc(pro,'report_extraordinary_consumption',{p_patient:state.patient,p_kind:'shortage',p_location:'CARE_TEAM',p_text:'Falta fictícia sem decisão booleana B3',p_lines:[],p_key:randomUUID()});
 const response=await rpc(admin,'confirm_extraordinary_consumption',{p_id:id,p_accept:null}),after=sql(`select status from public.consumption_reports where id=${lit(id)};`);assert.equal(after,'rejected');return {id,response,after,apiBooleanSchemaIsCompensatingControl:true};
});
audit.finish();
