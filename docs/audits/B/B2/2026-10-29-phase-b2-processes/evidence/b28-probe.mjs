/* global FormData, Blob */
import {writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {PDFDocument} from 'pdf-lib';
import {initialize,state,save,actor,rpc,issue,docState,countStock,recorder,rejected,assert,randomUUID,sql,sqlLiteral} from './local-harness.mjs';
import {app,safeError} from './http-harness.mjs';
await initialize();const record=recorder('B2.8'),admin=await actor('admin'),pro=await actor('professional'),family=await actor('family'),patient=state.patient;
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
let req,firstPdf;
await record.scenario('B28-01','REQ emitida por HTTP confirma persistência e PDF privado da versão1',async()=>{
 await rpc(admin,'configure_patient_access',{p_patient:patient,p_kind:'settings',p_change:{scienceRequired:true,scienceRoles:['family'],scienceUsers:[],scienceRequirement:'all',scienceByDispatch:false,scienceAutomatic:false},p_key:randomUUID(),p_version:Number(sql(`select version from public.patient_settings where care_recipient_id=${sqlLiteral(patient)};`))});
 const key=randomUUID(),response=await app('professional','/api/requisitions',{method:'POST',body:{careRecipientId:patient,lines:[{productId:state.products[0],currentStock:0,urgent:true}],extraItems:[],observations:['Necessidade fictícia para auditar documento,ciência e continuidade'],idempotencyKey:key}});assert.equal(response.status,201);const data=await response.json();assert.equal(data.persistence,'confirmed');
 req=sql(`select id from public.operational_documents where care_recipient_id=${sqlLiteral(patient)} and created_by=${sqlLiteral(state.actors.professional.id)} and idempotency_key=${sqlLiteral(key)};`);assert.ok(req);
 const pdf=await app('professional',`/api/documents/${req}/pdf?version=1`);assert.equal(pdf.status,200);firstPdf=Buffer.from(await pdf.arrayBuffer());const loaded=await PDFDocument.load(firstPdf);writeFileSync(new URL('b28-req-v1.pdf',import.meta.url),firstPdf);
 state.objects.continuityRequest=req;save();return{requestId:req,httpStatus:response.status,persistence:data.persistence,pdf:{status:pdf.status,contentType:pdf.headers.get('content-type'),cacheControl:pdf.headers.get('cache-control'),bytes:firstPdf.length,sha256:hash(firstPdf),pages:loaded.getPageCount(),version:1},stock:countStock(state.products[0])};
});
await record.scenario('B28-02','Marcar aviso visto não registra ciência nem atendimento',async()=>{
 const notification=JSON.parse(sql(`select jsonb_build_object('id',id,'state',state,'channel',channel,'seenAt',seen_at) from public.requisition_notifications where document_id=${sqlLiteral(req)} and recipient_user_id=${sqlLiteral(state.actors.family.id)} order by created_at limit 1;`));assert.ok(notification.id);
 const seen=await app('family','/api/notifications',{method:'POST',body:{id:notification.id}});assert.equal(seen.status,200);
 const progress=await rpc(family,'requisition_progress',{p_id:req});assert.equal(progress.scienceSatisfied,false);assert.equal(progress.completedAt,null);
 const fulfillment=await rpc(pro,'requisition_fulfillment',{p_requisition:req});assert.equal(fulfillment.fulfilled,0);
 return{notification:{id:notification.id,state:notification.state,channel:notification.channel},seenHttpStatus:seen.status,scienceSatisfied:progress.scienceSatisfied,completedAt:progress.completedAt,fulfilled:fulfillment.fulfilled,providerDeliveredOrReadProven:false};
});
await record.scenario('B28-03','Arquivo exige conclusão;aceite ENT completa necessidade sem ciência obrigatória',async()=>{
 const early=await app('admin',`/api/requisitions/${req}/archive`,{method:'POST',body:{reason:'Tentativa fictícia anterior ao atendimento real'}});assert.notEqual(early.status,200);const refusal=await safeError(early);
 const line=sql(`select id from public.requisition_items where requisition_id=${sqlLiteral(req)};`);
 const issued=await app('admin','/api/documents',{method:'POST',body:{careRecipientId:patient,type:'ENT',idempotencyKey:randomUUID(),payload:{source:'FAMILY',destination:'CARE_TEAM',recipientId:state.actors.professional.id,lines:[{productId:state.products[0],quantity:'1',requisitionItemIds:[line]}]}}});assert.equal(issued.status,201);const d=(await issued.json()).data;
 const receipt=await app('professional',`/api/documents/${d.id}`,{method:'POST',body:{action:'receive',expectedVersion:d.version,idempotencyKey:randomUUID(),body:{divergences:[]}}});assert.equal(receipt.status,200);
 const progress=await rpc(family,'requisition_progress',{p_id:req});assert.ok(progress.completedAt);assert.equal(progress.scienceSatisfied,false);assert.equal(progress.manualArchiveRequired,true);
 return{earlyArchive:refusal,deliveryId:d.id,receiptHttpStatus:receipt.status,progress:{completedAt:progress.completedAt,scienceSatisfied:progress.scienceSatisfied,manualArchiveRequired:progress.manualArchiveRequired},document:docState(req)};
});
await record.scenario('B28-04','Ciência expressa tardia não apaga exceção original;arquivo manual conserva motivos',async()=>{
 const before=docState(req),response=await app('family',`/api/requisitions/${req}/science`,{method:'POST',body:{mode:'express',expectedVersion:before.version}});assert.equal(response.status,200);
 const progress=await rpc(family,'requisition_progress',{p_id:req});assert.equal(progress.scienceSatisfied,true);assert.equal(progress.manualArchiveRequired,true);
 const archived=await app('admin',`/api/requisitions/${req}/archive`,{method:'POST',body:{reason:'Família conferiu a ciência tardia e encerrou a necessidade fictícia sem apagar a exceção'}});assert.equal(archived.status,200);const after=await rpc(family,'requisition_progress',{p_id:req});assert.ok(after.archivedAt);
 return{scienceHttpStatus:response.status,scienceMode:progress.science.at(-1).mode,manualExceptionPreserved:true,archiveHttpStatus:archived.status,archivedAt:after.archivedAt,archiveReason:after.archiveReason,events:after.events};
});
await record.scenario('B28-05','PDF histórico conserva bytes após ciência/arquivo;versão atual e acesso indevido são distintos',async()=>{
 const old=await app('professional',`/api/documents/${req}/pdf?version=1`);assert.equal(old.status,200);const oldBytes=Buffer.from(await old.arrayBuffer());assert.equal(hash(oldBytes),hash(firstPdf));
 const version=docState(req).version,current=await app('professional',`/api/documents/${req}/pdf?version=${version}`);assert.equal(current.status,200);const bytes=Buffer.from(await current.arrayBuffer());writeFileSync(new URL(`b28-req-v${version}.pdf`,import.meta.url),bytes);assert.notEqual(hash(bytes),hash(firstPdf));
 const denied=await app('reader',`/api/documents/${state.objects.comPartial}/pdf?version=1`);assert.notEqual(denied.status,200);const refused=await safeError(denied);
 const publicHash=sql(`select content_hash from public.document_events where document_id=${sqlLiteral(req)} and version=1;`);
 const verification=await fetch('http://127.0.0.1:54321/rest/v1/rpc/verify_document_integrity',{method:'POST',headers:{apikey:(await import('./local-harness.mjs')).env.anonKey,'content-type':'application/json'},body:JSON.stringify({p_id:req,p_version:1,p_hash:publicHash})});const minimal=await verification.json();
 return{versionOneHash:hash(firstPdf),oldHashAfterChanges:hash(oldBytes),currentVersion:version,currentHash:hash(bytes),currentPages:(await PDFDocument.load(bytes)).getPageCount(),unauthorizedComPdf:refused,publicVerification:minimal,limits:'Hash comparison and version persistence;not signature,physical QR or visual PDF acceptance'};
});
await record.scenario('B28-06','Anexo privado por HTTP recupera mesma tentativa;bytes diferentes com mesma chave são recusados',async()=>{
 const bytes=await sharp({create:{width:32,height:32,channels:3,background:'#d9e8fa'}}).png().toBuffer(),other=await sharp({create:{width:32,height:32,channels:3,background:'#f1d9e8'}}).png().toBuffer(),key=randomUUID();
 const form=buffer=>{const f=new FormData();f.set('careRecipientId',patient);f.set('documentId',req);f.set('idempotencyKey',key);f.set('file',new Blob([buffer],{type:'image/png'}),'comprovante-ficticio-b2.png');return f;};
 const first=await app('admin','/api/attachments',{method:'POST',body:form(bytes)});assert.equal(first.status,201);const saved=await first.json();
 const retry=await app('admin','/api/attachments',{method:'POST',body:form(bytes)});assert.equal(retry.status,201);const recovered=await retry.json();assert.equal(saved.id,recovered.id);
 const conflict=await app('admin','/api/attachments',{method:'POST',body:form(other)});assert.equal(conflict.status,409);
 const row=JSON.parse(sql(`select jsonb_build_object('id',id,'state',state,'bytes',bytes,'sha256',sha256,'documentId',document_id) from public.attachments where id=${sqlLiteral(saved.id)};`));assert.equal(row.state,'ready');
 return{firstStatus:first.status,retryStatus:retry.status,sameId:saved.id===recovered.id,conflictingBytes:await safeError(conflict),attachment:row,limits:'No lost transport injected here;API idempotency proven,not B1 visual recovery flaw fixed;no signed URL exported'};
});
await record.scenario('B28-07','Dez reservas abandonadas consomem limite de anexo sem arquivo confirmado',async()=>{
 const target=(await issue(pro,[state.products[1]],{repeatReason:'REQ fictícia separada para limite de anexos abandonados'})).id;
 for(let index=0;index<10;index++)await rpc(admin,'reserve_attachment',{p_patient:patient,p_document:target,p_movement:null,p_filename:'reserva-ficticia-'+index+'.png',p_mime:'image/png',p_bytes:128,p_key:randomUUID()});
 const eleventh=await rejected(()=>rpc(admin,'reserve_attachment',{p_patient:patient,p_document:target,p_movement:null,p_filename:'nova-ficha-ficticia.png',p_mime:'image/png',p_bytes:128,p_key:randomUUID()}));assert.equal(eleventh.rejected,true);
 const states=JSON.parse(sql(`select jsonb_agg(x) from(select state,count(*) as count from public.attachments where document_id=${sqlLiteral(target)} group by state)x;`));assert.equal(Number(states[0].count),10);
 return{documentId:target,states,eleventh,knownFinding:'A DB-004 revalidated locally;abandoned reservations are not ready files;no cleanup performed',recoveryLimit:'Same-key retry can finish a retained reservation;lost keys have no explicit user abandonment path'};
});record.finish();
