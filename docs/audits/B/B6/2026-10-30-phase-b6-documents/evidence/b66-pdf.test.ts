/* Real renderer4. Fictional snapshots, no Storage/HTTP writes or provider calls.
 * Hash values identify the supplied synthetic body; only B62 fixture hashes
 * came from committed-in-transaction SQL events (transaction later rolled back).
 * Cases are observations of current behavior, not future product acceptance. */
import { it,expect } from 'vitest';
import { mkdirSync,readFileSync,writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { PDFDocument } from 'pdf-lib';
import { renderDocumentPdf,type DocumentSnapshot } from '@/lib/server/operational-pdf';
const dir='docs/audits/2026-10-30-phase-b6-documents/evidence';
const line=(id:string,name='Material fictício B6')=>({id,product_id:id,name_snapshot:name,unit_snapshot:'unidade',category_snapshot:'higiene',quantity:'10',approved_quantity:'8',purchased_quantity:'3',accepted_quantity:'2',reconciled_quantity:'0',fully_checked:false,metadata:{issueOpen:false,expectedQuantity:'10'}});
const base=(type:DocumentSnapshot['type'],status:string):DocumentSnapshot=>({
 id:'b6000000-0000-4000-8000-000000000001',type,code:type+'-0001',protocol:type+'-20261030-B6000000-B6000001-1-12345678',version:3,status,createdAt:'2026-10-27T23:30:00-03:00',
 actors:{issuer:{id:'b6000000-0000-4000-8000-000000000002',name:'Emissora fictícia B6'},recipient:{id:'b6000000-0000-4000-8000-000000000003',name:'Recebedora fictícia B6'},patient:{name:'Paciente fictício B6'}},
 lines:[line('b6000000-0000-4000-8000-000000000004')],payload:{notes:'Dados exclusivamente fictícios para auditoria B6.'},
 history:[{action:type.toLowerCase()+'.issued',actorName:'Emissora fictícia B6',createdAt:'2026-10-30T10:00:00-03:00',version:2},{action:type.toLowerCase()+'.receive',actorName:'Recebedora fictícia B6',createdAt:'2026-10-30T14:00:00Z',version:3}],
});
it('B66-R01 inspects representative PDF bodies without changing source snapshots',async()=>{
 mkdirSync(dir+'/pdf',{recursive:true});
 const cases:{id:string;purpose:string;snapshot:DocumentSnapshot;omitted?:string[]}[]=[];
 const req=base('REQ','submitted');req.lines=[{id:'req-a',product_name_snapshot:'Gaze fictícia B6',unit_snapshot:'pacote',current_stock:7,urgent:true},{id:'req-b',custom_name:'Item extra fictício B6',current_stock:null,urgent:false}];
 req.sciencePolicy={science_satisfied_at:'2026-10-29T12:00:00Z'};req.scienceEvents=[{actor_name:'Familiar fictício B6',mode:'express',created_at:'2026-10-29T12:00:00Z'}];req.fulfillmentLines=[{id:'req-a',attended:true},{id:'req-b',attended:false}];
 cases.push({id:'PV01',purpose:'REQ parcial;estoque observado7;extra;ciência independente',snapshot:req});
 const com=base('COM','partially_received');com.payload.origin='donation';com.workflow={pendingReceipt:'RECIBO_PENDENTE_B6'};com.payload.notes='Doação fictícia; não é documento fiscal.';
 Object.assign(com,{event:{receiptId:'RECIBO_PENDENTE_B6',reason:'RESSALVA_COMPRA_B6'}});
 cases.push({id:'PV02',purpose:'COM doação parcial;proposto10/aprovado8/adquirido3/validado2',snapshot:com,omitted:['RECIBO_PENDENTE_B6','RESSALVA_COMPRA_B6']});
 const ent=base('ENT','disputed');ent.payload={...ent.payload,source:'FAMILY',destination:'CARE_TEAM'};ent.workflow={acceptedBy:ent.actors!.recipient!.id,acceptedAt:'2026-10-30T14:00:00Z'};
 ent.lines=[{...line('ent-a'),accepted_quantity:'6',metadata:{issueOpen:true,receipt:{acceptedQuantity:'6',problem:'CAIXA_AVARIADA_B6',notes:'RESSALVA_ENT_B6_NAO_USAR'}}}];
 cases.push({id:'PV03',purpose:'ENT com avaria;data criação anterior à emissão;ressalva persistida',snapshot:ent,omitted:['CAIXA_AVARIADA_B6','RESSALVA_ENT_B6_NAO_USAR']});
 const cancel=structuredClone(ent);cancel.status='cancelled';cancel.workflow={};cancel.lines[0].accepted_quantity='0';cancel.lines[0].reconciled_quantity='0';cancel.lines[0].metadata={issueOpen:false};
 Object.assign(cancel,{event:{reason:'MOTIVO_CANCELAMENTO_B6'}});cancel.history=[cancel.history![0],{action:'ent.cancel',actorName:'Emissora fictícia B6',version:3,createdAt:'2026-10-30T15:00:00Z'}];
 cases.push({id:'PV04',purpose:'ENT cancelada antes do aceite;card e declaração ainda pedem conferência',snapshot:cancel,omitted:['MOTIVO_CANCELAMENTO_B6']});
 const bal=base('BAL','approved');bal.lines=[{...line('bal-a'),quantity:'8',accepted_quantity:'0',metadata:{expectedQuantity:'10'}}];
 bal.payload.balanceContext={cycleId:'b6000000-0000-4000-8000-000000000005',professionalName:'Contadora fictícia B6',shiftType:'Diurno fictício B6',startsAt:'2026-10-30T06:00:00-04:00',endsAt:'2026-10-30T18:00:00-04:00',countedAt:'2026-10-30T12:00:00-04:00',timezone:'America/Manaus',weeks:['2026-10-05','2026-10-12','2026-10-19','2026-10-26'],kind:'recount'};
 bal.workflow={countVersion:2,referenceRevision:'11',reviewPolicy:{balRequirement:'all',balApprovers:['family','supervisor']},appliedAt:'2026-10-30T17:00:00Z'};
 Object.assign(bal,{approvals:[{actor_id:'b6000000-0000-4000-8000-000000000006',review_group:'family',count_version:1},{actor_id:'b6000000-0000-4000-8000-000000000007',review_group:'family',count_version:2},{actor_id:'b6000000-0000-4000-8000-000000000008',review_group:'supervisor',count_version:2}]});
 bal.version=5;bal.history=[{action:'bal.issued',actorName:'Contadora fictícia B6',createdAt:'2026-10-29T16:00:00Z',version:1},{action:'bal.approve',actorName:'Revisora familiar fictícia B6',createdAt:'2026-10-29T17:00:00Z',version:2},{action:'bal.recount',actorName:'Contadora fictícia B6',createdAt:'2026-10-30T16:00:00Z',version:3},{action:'bal.approve',actorName:'Revisora familiar fictícia B6',createdAt:'2026-10-30T17:00:00Z',version:4},{action:'bal.approve',actorName:'Revisora supervisora fictícia B6',createdAt:'2026-10-30T17:05:00Z',version:5}];
 cases.push({id:'PV05',purpose:'BAL reconto;contador diferente do revisor;fuso Manaus e4 semanas',snapshot:bal});
 const legacy=JSON.parse(readFileSync(dir+'/b62-provenance-results.json','utf8')).scenarios['B62-S02'].snapshot as DocumentSnapshot;
 cases.push({id:'PV06',purpose:'Legacy helper:fonte sem data;nome original diferente do cadastro;zero linhas controlado',snapshot:legacy});
 const many=base('ENT','disputed');many.payload={...many.payload,source:'FAMILY',destination:'CARE_TEAM',notes:('Observação sintética extensa e legível B6. ').repeat(45)};
 many.lines=Array.from({length:35},(_,i)=>({...line('long-'+i,`Material fictício ${String(i).padStart(2,'0')} B6 com descrição longa para controlar continuidade de tabelas, acentos e linhas`),metadata:{issueOpen:i%2===0},accepted_quantity:'1'}));
 many.history=Array.from({length:48},(_,i)=>({action:i%2?'ent.resolve':'ent.receive',actorName:'Pessoa fictícia B6 '+i,createdAt:'2026-10-30T14:00:00Z',version:i+1}));many.version=48;
 many.attachments=[{filename:'ficha-fisica-ficticia-B6.pdf',sha256:'b'.repeat(64)}];
 cases.push({id:'PV07',purpose:'35linhas;48eventos;notas1800;anexo;paginação longa',snapshot:many});
 const token=base('COM','approved');token.lines=[{...line('token','PALAVRA'+ 'W'.repeat(150)),quantity:'0.123456',unit_snapshot:'unidade'}];token.payload.notes='Çãõ áéíóú — 0,123456; '+ 'Q'.repeat(1200);
 cases.push({id:'PV08',purpose:'Token sem espaço157;nota sem espaços;decimal6;registro profissional ausente',snapshot:token});
 const oversized=base('ENT','pending_receipt');oversized.payload={source:'FAMILY',destination:'CARE_TEAM'};oversized.lines=[{...line('oversized',('M\n').repeat(77)+'FIM_B6'),accepted_quantity:'0'}];
 cases.push({id:'PV09',purpose:'Nome160 com78parágrafos;contrato catálogo aceita LF interno',snapshot:oversized});
 for(const type of ['COM','BAL'] as const){const s=base(type,'cancelled');s.lines[0].purchased_quantity='0';s.lines[0].accepted_quantity='0';s.workflow={reviewPolicy:{balReview:'required'}};s.history=[{action:type.toLowerCase()+'.issued',actorName:'Emissora fictícia B6',createdAt:'2026-10-30T13:00:00Z',version:2},{action:type.toLowerCase()+'.cancel',actorName:'Emissora fictícia B6',createdAt:'2026-10-30T14:00:00Z',version:3}];cases.push({id:type==='COM'?'PV10':'PV11',purpose:type+' cancelado sem aquisição/aplicação;card EM ANDAMENTO',snapshot:s});}
 const selected=process.env.B6_CASES?.split(',');
 const previous=selected?JSON.parse(readFileSync(dir+'/b66-pdf-results.json','utf8')).cases:[];
 const reports:Record<string,unknown>[]=previous.filter((c:{id:string})=>!selected?.includes(c.id));
 for(const item of cases){
  if(selected&&!selected.includes(item.id))continue;
  const before=JSON.stringify(item.snapshot);const hash=createHash('sha256').update(before).digest('hex');
  const bytes=await renderDocumentPdf(item.snapshot,hash);const pdf=await PDFDocument.load(bytes);
  expect(JSON.stringify(item.snapshot)).toBe(before);expect(pdf.getPageCount()).toBeGreaterThanOrEqual(2);
  expect(pdf.getPages().every(p=>Math.abs(p.getWidth()-595.28)<0.01&&Math.abs(p.getHeight()-841.89)<0.01)).toBe(true);
  writeFileSync(`${dir}/pdf/${item.id}.pdf`,bytes);
  reports.push({id:item.id,purpose:item.purpose,source:item.snapshot,syntheticHash:hash,hashMethod:'SHA256(JSON.stringify fixture);NOT persisted PostgreSQL canonical hash;QR target is not queried',pdfSha256:createHash('sha256').update(bytes).digest('hex'),pages:pdf.getPageCount(),bytes:bytes.length,sourceUnchanged:true,omittedMarkers:item.omitted??[]});
 }
 reports.sort((a,b)=>String(a.id).localeCompare(String(b.id)));
 writeFileSync(dir+'/b66-pdf-results.json',JSON.stringify({recordedAt:new Date().toISOString(),method:'Real renderer4/pdf-lib;all fictional snapshots;no HTTP/Storage;not E2E',cases:reports},null,2)+'\n');
});
