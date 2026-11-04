import { initialize,state,save,actor,rpc,createDoc,command,docState,countStock,move,recorder,rejected,assert,randomUUID,sql,sqlLiteral } from './local-harness.mjs';
await initialize();const record=recorder('B2.4'),admin=await actor('admin'),pro=await actor('professional');
async function product(name,unit='unidade') { return (await rpc(admin,'admin_upsert_recipient_product',{p_care_recipient_id:state.patient,p_product_id:null,p_name:name,p_category:'higiene',p_unit:unit,p_aliases:[],p_is_active:true})).product_id; }
let exact,pack,retired,original;
await record.scenario('B24-01','Estoque inicial avulso tem movimento próprio e correção referenciada não apaga original',async()=>{
 exact=await product('Volume fictício B2 exato','mL');state.objects.exactProduct=exact;save();
 await rpc(admin,'configure_catalogue_unit',{p_patient:state.patient,p_product:exact,p_unit:'mL',p_decimals:3});
 original=await move(admin,exact,'10.125','inbound','Volume físico inicial fictício conferido para prova decimal');
 await rpc(admin,'family_stock_movement',{p_patient:state.patient,p_product:exact,p_quantity:'0.125',p_action:'correction_out',p_reason:'Compensação fictícia referenciada do volume digitado a maior',p_key:randomUUID(),p_reference:original});
 assert.equal(Number(countStock(exact).FAMILY),10);
 const movements=JSON.parse(sql(`select jsonb_agg(jsonb_build_object('id',id,'quantity',quantity::text,'referenceType',reference_type,'referenceId',reference_id) order by created_at,id) from public.stock_movements where care_recipient_id=${sqlLiteral(state.patient)} and product_id=${sqlLiteral(exact)};`));
 assert.equal(movements.length,2);assert.equal(movements.some(row=>row.referenceId===original),true);return{product:exact,stock:countStock(exact),movements};
});
await record.scenario('B24-02','Precisão além da unidade e saída maior que saldo são recusadas sem arredondamento',async()=>{
 const before=countStock(exact),precision=await rejected(()=>move(admin,exact,'0.0001'),/precision/),negative=await rejected(()=>move(admin,exact,'11','outbound'),/insufficient stock/);
 assert.equal(precision.rejected,true);assert.equal(negative.rejected,true);assert.deepEqual(countStock(exact),before);return{precision,negative,before,after:countStock(exact)};
});
await record.scenario('B24-03','Correção sem referência é aceita na RPC apesar do contrato operacional exigir original',async()=>{
 const before=countStock(exact),id=await move(admin,exact,'1','correction_in','Correção fictícia enviada sem identificar movimento original');
 const row=JSON.parse(sql(`select jsonb_build_object('id',id,'referenceType',reference_type,'referenceId',reference_id,'quantity',quantity::text) from public.stock_movements where id=${sqlLiteral(id)} and care_recipient_id=${sqlLiteral(state.patient)};`));
 assert.equal(row.referenceId,null);assert.equal(Number(countStock(exact).FAMILY),Number(before.FAMILY)+1);return{before,after:countStock(exact),row,contractGap:'API schema optional referenceId and RPC conditional validation; UI required is the only mandatory reference guard'};
});
await record.scenario('B24-04','Unidade/precisão com história protegidas também por trigger; hipótese de bypass refutada',async()=>{
 const stockGuard=await rejected(()=>rpc(admin,'configure_catalogue_unit',{p_patient:state.patient,p_product:exact,p_unit:'g',p_decimals:3}),/immutable/);assert.equal(stockGuard.rejected,true);
 const draftProduct=await product('Material fictício B2 com draft e unidade protegida');
 const draft=await createDoc(admin,'COM',{origin:'purchase',lines:[{productId:draftProduct,quantity:'2'}]},randomUUID(),true);
 const draftGuard=await rejected(()=>rpc(admin,'configure_catalogue_unit',{p_patient:state.patient,p_product:draftProduct,p_unit:'mL',p_decimals:3}),/immutable/);assert.equal(draftGuard.rejected,true);
 return{stockGuard,draftGuard,draftId:draft.id,discardedHypothesis:'configure_catalogue_unit has a narrower local check, but guard_catalogue_unit also protects REQ/document line history'};
});
await record.scenario('B24-05','Apresentação converte para base mas COM não conserva embalagem/código original',async()=>{
 pack=await product('Material fictício B2 em embalagem');state.objects.packProduct=pack;save();
 const barcode='7890000000029';await rpc(admin,'configure_catalogue_unit',{p_patient:state.patient,p_product:pack,p_unit:'unidade',p_decimals:0,p_barcode:barcode,p_presentation:'Pacote fictício com dez unidades',p_base_quantity:'10'});
 const lookup=await admin.from('product_presentations').select('product_id,barcode,name,base_quantity').eq('care_recipient_id',state.patient).eq('barcode',barcode);assert.ifError(lookup.error);
 const d=await createDoc(admin,'COM',{origin:'purchase',lines:[{productId:pack,quantity:'20'}]});
 await rpc(admin,'configure_catalogue_unit',{p_patient:state.patient,p_product:pack,p_unit:'unidade',p_decimals:0,p_barcode:barcode,p_presentation:'Pacote fictício reconfigurado com doze unidades',p_base_quantity:'12'});
 const detail=await rpc(admin,'operational_document',{p_id:d.id});assert.equal(detail.lines[0].unit_snapshot,'unidade');assert.deepEqual(detail.lines[0].metadata,{});
 return{lookupBefore:lookup.data,documentId:d.id,persisted:docState(d.id),lineUnit:detail.lines[0].unit_snapshot,lineMetadata:detail.lines[0].metadata,hasOriginalPresentationField:false,methodLimit:'Diagnostic payload uses20base units; source scan() demonstrates accumulation and emitted payload has no presentation provenance. No camera or browser scan executed.'};
});
await record.scenario('B24-06','Inativação com saldo preserva ledger e consulta,mas exclui material de novos fluxos',async()=>{
 retired=await product('Material fictício B2 retirado do catálogo');state.objects.retiredProduct=retired;save();
 await move(admin,retired,'8','inbound','Estoque físico fictício inicial antes de retirada do catálogo');
 const ent=await createDoc(admin,'ENT',{source:'FAMILY',destination:'CARE_TEAM',recipientId:state.actors.professional.id,lines:[{productId:retired,quantity:'4'}]});await command(pro,ent.id,'receive',{divergences:[]});
 await rpc(admin,'admin_upsert_recipient_product',{p_care_recipient_id:state.patient,p_product_id:retired,p_name:'Material fictício B2 retirado do catálogo',p_category:'higiene',p_unit:'unidade',p_aliases:[],p_is_active:false});
 const overview=(await rpc(admin,'stock_overview',{p_patient:state.patient})).find(row=>row.productId===retired);assert.equal(overview.active,false);assert.equal(Number(overview.team.confirmed),4);
 const consumption=await rejected(()=>rpc(pro,'report_extraordinary_consumption',{p_patient:state.patient,p_kind:'consumption',p_location:'CARE_TEAM',p_text:'Uso físico fictício de material inativado ainda existente',p_lines:[{productId:retired,quantity:'1'}],p_key:randomUUID()}),/invalid structured/);assert.equal(consumption.rejected,true);
 const active=await admin.from('care_recipient_products').select('product_id').eq('care_recipient_id',state.patient).eq('is_active',true);assert.ifError(active.error);assert.equal(active.data.some(row=>row.product_id===retired),false);
 const includeInBal=await rejected(()=>createDoc(pro,'BAL',{lines:[...active.data.map(row=>({productId:row.product_id,quantity:'0'})),{productId:retired,quantity:'4'}]},randomUUID(),true),/invalid patient catalogue product/);assert.equal(includeInBal.rejected,true);
 const beforeReactivate=countStock(retired);
 await rpc(admin,'admin_upsert_recipient_product',{p_care_recipient_id:state.patient,p_product_id:retired,p_name:'Material fictício B2 retirado do catálogo',p_category:'higiene',p_unit:'unidade',p_aliases:[],p_is_active:true});assert.deepEqual(countStock(retired),beforeReactivate);
 return{overview,consumption,includeInBal,stock:beforeReactivate,recovery:'Reativação administrativa preservou estoque;nenhum consumo ou ajuste foi inventado',limits:'Inativo continua visível no estoque; não foi alegado desaparecimento de saldo'};
});
await record.scenario('B24-07','Leitura de equipe não expõe saldo geral familiar e histórico pagina sem salto nesta amostra',async()=>{
 const overview=await rpc(pro,'stock_overview',{p_patient:state.patient});assert.equal(overview.every(row=>row.family===null),true);
 const args={p_patient:state.patient,p_page:1,p_size:2};const first=await rpc(pro,'stock_history',args),second=await rpc(pro,'stock_history',{...args,p_page:2});
 assert.equal(first.data.some(a=>second.data.some(b=>a.id===b.id)),false);
 for(const row of [...first.data,...second.data]) { if(row.source_location==='FAMILY')assert.equal(row.source_balance_before,null);if(row.destination_location==='FAMILY')assert.equal(row.destination_balance_before,null); }
 return{familyMasked:true,total:first.total,pageOne:first.data,pageTwo:second.data,limits:'Two stable pages in synthetic sample; not a concurrent pagination proof'};
});
await record.scenario('B24-08','Retirada manual não é contada como consumo confirmado na métrica',async()=>{
 const args={p_patient:state.patient,p_from:new Date(Date.now()-86400000).toISOString(),p_to:new Date(Date.now()+60000).toISOString()},before=await rpc(admin,'stock_consumption_metrics',args);
 await move(admin,exact,'1','outbound','Retirada fictícia para finalidade diversa de consumo confirmado');const after=await rpc(admin,'stock_consumption_metrics',args);assert.deepEqual(after,before);
 return{before,after,stock:countStock(exact),meaning:'Métrica usa somente reference_type=consumption;BAL e retirada avulsa não equivalem a uso confirmado'};
});
await record.scenario('B24-09','Trânsito cancelamento pendente pode conter zero físico;remanescentes COM não são saldo',async()=>{
 const transit=await rpc(admin,'stock_transit',{p_patient:state.patient}),target=transit.find(row=>row.id===state.objects.entCancelPending);assert.ok(target);assert.equal(target.status,'cancellation_pending');assert.equal(Number(target.lines[0].pending),0);
 const overview=await rpc(admin,'stock_overview',{p_patient:state.patient}),abandoned=overview.find(row=>row.productId===state.products[3]);assert.equal(Number(abandoned.family.confirmed),2);assert.equal(Number(abandoned.family.purchasePending),8);
 return{transitTarget:target,abandonedAcquisition:abandoned,interpretation:'Pendência documental de cancelamento não implica quantidade física em trânsito;previsão8 não é disponível2'};
});
record.finish();
