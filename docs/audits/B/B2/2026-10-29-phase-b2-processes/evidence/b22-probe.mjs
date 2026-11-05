import { initialize, state, save, actor, rpc, issue, createDoc, command, docState, countStock, recorder, rejected, assert, randomUUID } from './local-harness.mjs';
await initialize();
const record = recorder('B2.2');
const admin = await actor('admin'), family = await actor('family'), pro = await actor('professional'), reader = await actor('reader');
const product = state.products[0];
let req, com;
await record.scenario('B22-01','REQ normal; emissão não altera estoque e retry recupera mesmo ID',async()=>{
  const before = countStock(product);
  req = await issue(pro, [product]);
  const again = await rpc(pro,'submit_requisition',req.args);
  assert.equal(again[0].requisition_id,req.id);
  assert.deepEqual(countStock(product), before);
  const stored = docState(req.id);
  assert.equal(stored.events,1);
  state.objects.reqSupply = req; save();
  return { id:req.id, before, after:countStock(product), eventCount:stored.events, retrySameId:true };
});
await record.scenario('B22-02','REQ repetida sem justificativa recusada; com justificativa persiste',async()=>{
  const refused = await rejected(()=>issue(pro,[product]),/duplicate review required/);
  assert.equal(refused.rejected,true);
  const second = await issue(pro,[product],{repeatReason:'Reposição adicional real fictícia após revisão da anterior'});
  state.objects.reqRepeated=second;save();
  return { refused, justifiedId:second.id, stock:countStock(product) };
});
await record.scenario('B22-03','Extra correspondente ao catálogo recusado e extra desconhecido preservado',async()=>{
  const refused = await rejected(()=>issue(pro,[],{extras:[{customName:'Alternativo fictício B2 1',currentStock:'0',urgent:false}]}),/matches patient catalogue/);
  const extra = await issue(pro,[],{extras:[{customName:'Material adicional fictício não catalogado B2',currentStock:'2',urgent:true}]});
  state.objects.reqExtra=extra;save();
  assert.equal(extra.lines[0].productId,null);
  return { refused, extraId:extra.id, preservedText:extra.lines[0].customName, canonicalProduct:extra.lines[0].productId };
});
await record.scenario('B22-04','COM familiar vinculada: aprovação é anterior à aquisição e não atende REQ',async()=>{
  com=await createDoc(family,'COM',{origin:'purchase',lines:[{productId:product,quantity:'10',requisitionItemIds:[req.lines[0].id]}]});
  assert.equal(com.status,'pending_approval');
  const readOnlyRefusal=await rejected(()=>command(reader,com.id,'approve',{lines:[{lineId:com.lines[0].id,quantity:'10'}]}));
  assert.equal(readOnlyRefusal.rejected,true);
  await command(admin,com.id,'approve',{lines:[{lineId:com.lines[0].id,quantity:'10'}]});
  const fulfillment=await rpc(family,'requisition_fulfillment',{p_requisition:req.id});
  assert.equal(fulfillment.fulfilled,0);
  state.objects.comPartial=com.id;save();
  return { document:docState(com.id), fulfillment, stock:countStock(product), readOnlyRefusal };
});
await record.scenario('B22-05','Compra parcial e receipt pendente não creditam até validação',async()=>{
  const before=countStock(product);
  await command(family,com.id,'purchase',{lines:[{lineId:com.lines[0].id,quantity:'3'}]});
  await command(family,com.id,'receive',{lines:[{lineId:com.lines[0].id,quantity:'3'}]});
  const pending=docState(com.id);
  assert.equal(pending.receipts[0].state,'pending');
  assert.deepEqual(countStock(product),before);
  const overflow=await rejected(()=>command(family,com.id,'receive',{lines:[{lineId:com.lines[0].id,quantity:'1'}]}),/exceeds purchased/);
  assert.equal(overflow.rejected,true);
  return { pending, stockBefore:before, stockAfter:countStock(product), pendingReceiptsReserveQuantity:overflow };
});
await record.scenario('B22-06','Validação parcial mantém aquisição restante possível; hipótese de encerramento prematuro refutada',async()=>{
  const receipt=docState(com.id).receipts[0];
  const notValidator=await rejected(()=>command(pro,com.id,'validate_receipt',{receiptId:receipt.id}));
  assert.equal(notValidator.rejected,true);
  const key=randomUUID(),version=docState(com.id).version;
  await command(admin,com.id,'validate_receipt',{receiptId:receipt.id},key,version);
  const afterFirst=docState(com.id), stockFirst=countStock(product);
  assert.equal(afterFirst.status,'partially_received');
  await command(admin,com.id,'validate_receipt',{receiptId:receipt.id},key,version);
  assert.deepEqual(countStock(product),stockFirst);
  await command(family,com.id,'purchase',{lines:[{lineId:com.lines[0].id,quantity:'7'}]});
  await command(admin,com.id,'receive',{lines:[{lineId:com.lines[0].id,quantity:'7'}]});
  const final=docState(com.id);
  assert.equal(final.status,'received');
  assert.equal(Number(countStock(product).FAMILY),10);
  const fulfillment=await rpc(family,'requisition_fulfillment',{p_requisition:req.id});assert.equal(fulfillment.fulfilled,0);
  return { afterFirst, stockFirst, retryDidNotDuplicate:true, final, stock:countStock(product), fulfillment, notValidator, discardedHypothesis:'Receber tudo o que foi comprado parcialmente não encerra o saldo aprovado ainda não adquirido' };
});
await record.scenario('B22-07','Doação administrativa percorre aquisição/recebimento sem campos financeiros',async()=>{
  const donation=await createDoc(admin,'COM',{origin:'donation',lines:[{productId:state.products[1],quantity:'5'}]});
  assert.equal(donation.status,'approved');
  await command(admin,donation.id,'purchase',{lines:[{lineId:donation.lines[0].id,quantity:'5'}]});
  await command(admin,donation.id,'receive',{lines:[{lineId:donation.lines[0].id,quantity:'5'}]});
  const final=docState(donation.id); assert.equal(final.status,'received');
  return { origin:'donation', adminCreationAutoApproved:true, final, stock:countStock(state.products[1]), financialFieldsRequired:false };
});
await record.scenario('B22-08','Recebimento rejeitado não credita; registro corrigido pode ser confirmado',async()=>{
  const d=await createDoc(admin,'COM',{origin:'purchase',lines:[{productId:state.products[2],quantity:'4'}]});
  await command(admin,d.id,'purchase',{lines:[{lineId:d.lines[0].id,quantity:'4'}]});
  await command(family,d.id,'receive',{lines:[{lineId:d.lines[0].id,quantity:'4'}]});
  const receipt=docState(d.id).receipts[0];
  await command(admin,d.id,'reject_receipt',{receiptId:receipt.id,reason:'Conferência fictícia rejeitada por registro incorreto'});
  assert.equal(Number(countStock(state.products[2]).FAMILY),0);
  await command(admin,d.id,'receive',{lines:[{lineId:d.lines[0].id,quantity:'4'}]});
  return { final:docState(d.id), stock:countStock(state.products[2]), originalReceiptPreserved:true };
});
await record.scenario('B22-09','Aquisição parcial abandonada conserva saldo pendente sem comando de desistência',async()=>{
  const d=await createDoc(admin,'COM',{origin:'purchase',lines:[{productId:state.products[3],quantity:'10'}]});
  await command(admin,d.id,'purchase',{lines:[{lineId:d.lines[0].id,quantity:'2'}]});
  await command(admin,d.id,'receive',{lines:[{lineId:d.lines[0].id,quantity:'2'}]});
  const cancellation=await rejected(()=>command(admin,d.id,'cancel',{reason:'Fornecedor fictício não fornecerá os oito restantes'}),/reconciliation required/);
  const persisted=docState(d.id);
  assert.equal(persisted.status,'partially_received');assert.equal(cancellation.rejected,true);
  state.objects.comAbandoned=d.id;save();
  return { cancellation,persisted,remainingApprovedNotAcquired:'8',missingCapability:'Encerrar/desistir do saldo restante sem inventar compra, recebimento, devolução ou estoque' };
});
await record.scenario('B22-10','Draft servidor não expede material nem consome número; cancelamento anterior à aquisição permitido',async()=>{
  const d=await createDoc(family,'COM',{origin:'purchase',lines:[{productId:product,quantity:'1'}]},randomUUID(),true);
  assert.equal(d.status,'draft');assert.equal(d.number,null);
  await command(admin,d.id,'cancel',{reason:'Rascunho fictício dispensado antes da aquisição'});
  assert.equal(docState(d.id).status,'cancelled');
  const missing=await rejected(()=>command(admin,d.id,'purchase',{lines:[{lineId:d.lines[0].id,quantity:'1'}]}),/terminal/);
  return { final:docState(d.id), terminalRefusal:missing, stock:countStock(product) };
});
record.finish();
