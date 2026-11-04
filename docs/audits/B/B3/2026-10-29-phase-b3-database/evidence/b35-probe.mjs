/* MUTABLE LOCAL ONLY: new B3 quantities/documents. No ledger edits or cleanup. */
import Decimal from 'decimal.js';
import {actor,state,save,rpc,recorder,rejected,assert,randomUUID,sql,sqlLiteral as lit,createDoc,command,docState,countStock,move} from './local-harness.mjs';
const audit=recorder('B3.5',{resume:true}),admin=await actor('admin'),family=await actor('family'),pro=await actor('professional');
const sum=s=>new Decimal(s.FAMILY).plus(s.CARE_TEAM).plus(s.TRANSIT).toString(),payload=(p,q)=>({source:'FAMILY',destination:'CARE_TEAM',recipientId:state.actors.professional.id,lines:[{productId:p,quantity:q}]});
await audit.scenario('B35-01','Entrada e expedição conservam quantidades entre família e trânsito',async()=>{
 const p=state.products[0],before=countStock(p);await move(admin,p,'10');const entered=countStock(p),d=await createDoc(family,'ENT',payload(p,'4'));state.objects.transfer=d.id;save();const after=countStock(p);
 assert.equal(new Decimal(sum(entered)).minus(sum(before)).toString(),'10');assert.equal(sum(after),sum(entered));assert.equal(new Decimal(after.FAMILY).minus(entered.FAMILY).toString(),'-4');assert.equal(after.TRANSIT,'4.000000');return {before,entered,after,document:d.id};
});
await audit.scenario('B35-02','Aceite parcial muda custódia uma vez e divergência não inventa perda',async()=>{
 const id=state.objects.transfer,d=docState(id),before=countStock(state.products[0]),key=randomUUID(),body={divergences:[{lineId:d.lines[0].id,acceptedQuantity:'2',problem:'Diferença fictícia de duas unidades B3'}]};
 await command(pro,id,'receive',body,key,d.version);const first=docState(id),after=countStock(state.products[0]);await command(pro,id,'receive',body,key,d.version);assert.deepEqual(countStock(state.products[0]),after);assert.equal(docState(id).events,first.events);assert.equal(sum(before),sum(after));assert.equal(after.CARE_TEAM,'2.000000');assert.equal(after.TRANSIT,'2.000000');return {before,after,status:first.status,retryNoDuplicate:true};
});
await audit.scenario('B35-03','Devolução conserva quantidade; perda formal reduz somente o trânsito elegível',async()=>{
 const id=state.objects.transfer,d=docState(id),before=countStock(state.products[0]);await command(admin,id,'resolve',{lineId:d.lines[0].id,quantity:'1',resolution:'returned',reason:'Uma unidade retornou fisicamente na prova B3'});const returned=countStock(state.products[0]);assert.equal(sum(before),sum(returned));
 await command(pro,id,'resolve',{lineId:d.lines[0].id,quantity:'1',resolution:'missing',reason:'Uma unidade fictícia perdida formalmente na prova B3'});const after=countStock(state.products[0]);assert.equal(new Decimal(sum(after)).minus(sum(returned)).toString(),'-1');assert.equal(after.TRANSIT,'0.000000');return {before,returned,after,document:docState(id)};
});
await audit.scenario('B35-04','Relato não debita; confirmação única debita somente custódia correta',async()=>{
 const p=state.products[0],before=countStock(p),id=await rpc(pro,'report_extraordinary_consumption',{p_patient:state.patient,p_kind:'consumption',p_location:'CARE_TEAM',p_text:'Uso físico fictício B3 confirmado',p_lines:[{productId:p,quantity:'1'}],p_key:randomUUID()});assert.deepEqual(countStock(p),before);
 await rpc(admin,'confirm_extraordinary_consumption',{p_id:id,p_accept:true});const after=countStock(p);await rpc(admin,'confirm_extraordinary_consumption',{p_id:id,p_accept:true});assert.deepEqual(countStock(p),after);assert.equal(after.FAMILY,before.FAMILY);assert.equal(new Decimal(sum(after)).minus(sum(before)).toString(),'-1');return {id,before,after,reportNoDebit:true,repeatNoDebit:true};
});
await audit.scenario('B35-05','Retorno da equipe à família usa ENT com recebedor familiar',async()=>{
 const p=state.products[0],before=countStock(p),d=await createDoc(admin,'ENT',{source:'CARE_TEAM',destination:'FAMILY',recipientId:state.actors.family.id,lines:[{productId:p,quantity:'1'}]});await command(family,d.id,'receive',{divergences:[]});const after=countStock(p);assert.equal(sum(before),sum(after));assert.equal(after.CARE_TEAM,'0.000000');return {before,after,document:d.id};
});
await audit.scenario('B35-06','Compra, chegada familiar e validação são três fatos distintos',async()=>{
 const p=state.products[1],d=await createDoc(family,'COM',{origin:'donation',lines:[{productId:p,quantity:'3'}]}),line=d.lines[0].id,before=countStock(p);await command(admin,d.id,'approve',{lines:[{lineId:line,quantity:'3'}]});await command(family,d.id,'purchase',{lines:[{lineId:line,quantity:'3'}]});assert.deepEqual(countStock(p),before);
 await command(family,d.id,'receive',{lines:[{lineId:line,quantity:'2'}]});const pending=docState(d.id);assert.deepEqual(countStock(p),before);await command(admin,d.id,'validate_receipt',{receiptId:pending.receipts[0].id});const after=countStock(p);assert.equal(new Decimal(after.FAMILY).minus(before.FAMILY).toString(),'2');state.objects.partialCom=d.id;save();return {before,after,final:docState(d.id),pendingReceiptBeforeValidation:pending.receipts[0].state};
});
await audit.scenario('B35-07','Sem quantidade negativa, não finita ou superior ao teto na entrada de ledger',async()=>{
 const p=state.products[1],before=countStock(p),rows=[];for(const q of ['0','-1','NaN','Infinity','1000000001']){const result=await rejected(()=>move(admin,p,q));assert.equal(result.rejected,true);rows.push({quantity:q,result});}assert.deepEqual(countStock(p),before);return {rows,before,after:countStock(p),nonFiniteLedgerHypothesis:'REFUTED_AT_EXPOSED_BOUND'};
});
await audit.scenario('B35-08','Saída maior que saldo e precisão incompatível não deixam efeitos parciais',async()=>{
 const p=state.products[1],before=countStock(p),overdraw=await rejected(()=>move(admin,p,'3','outbound')),fraction=await rejected(()=>move(admin,p,'0.1'));assert.equal(overdraw.rejected,true);assert.equal(fraction.rejected,true);assert.deepEqual(countStock(p),before);return {overdraw,fraction,before,after:countStock(p)};
});
await audit.scenario('B35-09','Precisão além de seis casas é arredondada antes do trigger na RPC familiar',async()=>{
 const p=state.products[2],id=await rpc(admin,'family_stock_movement',{p_patient:state.patient,p_product:p,p_quantity:'1.0000004',p_action:'inbound',p_reason:'Prova B3 de precisão perdida antes do trigger',p_key:randomUUID()}),stored=sql(`select quantity::text from public.stock_movements where id=${lit(id)};`);assert.equal(stored,'1.000000');return {id,requested:'1.0000004',stored,productPrecision:0,apiRegexBlocksMoreThanSixDecimals:true,triggerReceivesAlreadyCoercedNumeric:true};
});
await audit.scenario('B35-10','Fator NaN de apresentação passa pelo contrato direto de catálogo',async()=>{
 if(!state.objects.numericProduct){const p=await rpc(admin,'admin_upsert_recipient_product',{p_care_recipient_id:state.patient,p_product_id:null,p_name:'Apresentação fictícia B3 com fator inválido',p_category:'higiene',p_unit:'unidade',p_aliases:[],p_is_active:true});state.objects.numericProduct=p.product_id;save();}
 const result=await rpc(admin,'configure_catalogue_unit',{p_patient:state.patient,p_product:state.objects.numericProduct,p_unit:'unidade',p_decimals:0,p_barcode:'7890000035010',p_presentation:'Embalagem fictícia NaN B3',p_base_quantity:'NaN'}),stored=sql(`select base_quantity::text from public.product_presentations where id=${lit(result.presentationId)};`);assert.equal(stored,'NaN');return {presentationId:result.presentationId,requested:'NaN',stored,stockMovements:countStock(state.objects.numericProduct).movements,limits:'Catalogue factor only; no NaN ledger reproduced'};
});
await audit.scenario('B35-11','Correção sem referência reproduz B2-005; referência alheia é recusada',async()=>{
 const p=state.products[2],id=await move(admin,p,'1','correction_in'),stored=sql(`select reference_type||':'||coalesce(reference_id::text,'NULL') from public.stock_movements where id=${lit(id)};`),foreign=await rejected(()=>rpc(admin,'family_stock_movement',{p_patient:state.patient,p_product:state.products[1],p_quantity:'1',p_action:'correction_in',p_reason:'Referência de produto diferente na prova B3',p_key:randomUUID(),p_reference:id}));assert.equal(stored,'family_manual:NULL');assert.equal(foreign.rejected,true);return {id,stored,foreign};
});
await audit.scenario('B35-12','Unidade com ledger ou linha histórica não muda por contrato alternativo',async()=>{
 const before=countStock(state.products[2]),result=await rejected(()=>rpc(admin,'configure_catalogue_unit',{p_patient:state.patient,p_product:state.products[2],p_unit:'mL',p_decimals:3}));assert.equal(result.rejected,true);assert.deepEqual(countStock(state.products[2]),before);return result;
});
audit.finish();
