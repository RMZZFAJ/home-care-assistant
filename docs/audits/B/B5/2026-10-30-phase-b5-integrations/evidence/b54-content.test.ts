/* Real presenter/registry, simulated authorized SQL payloads, renderer replaced.
 * These assertions describe defects, not future acceptance of those defects. */
import { it, expect, vi } from 'vitest';
import { writeFileSync } from 'node:fs';
vi.mock('@/lib/server/document-pdf',()=>({renderDocumentPdf:async()=>new Uint8Array([1])}));
import { prepareDocumentNotification } from '@/lib/notifications/document-notification';
import { templates, templateForEvent, whatsappEvents, namedBody } from '@/lib/notifications/template-registry';
import { formatBrazilDate } from '@/lib/receipt';
const results:Record<string,unknown>={};
async function prepare(type:string,event:string,status:string,extra:Record<string,unknown>={}) {
 const snapshot={id:'b5000000-0000-4000-8000-000000000010',type,code:type+'-B5',status,createdAt:'2026-10-20T10:00:00Z',version:3,actors:{issuer:{name:'Emissor fictício B5'},recipient:{name:'Recebedor fictício B5'}},lines:[{quantity:'3',accepted_quantity:'3',fully_checked:true,metadata:{expectedQuantity:'3'}}],history:[{action:event,actorName:'Ator do evento fictício B5',createdAt:'2026-10-30T13:00:00Z',version:3}],...extra};
 const payload={type,code:snapshot.code,version:3,hash:'synthetic',snapshot,eventKey:event,includePdf:true,recipientName:'Destinatário fictício B5',shortPatientName:'Paciente fictício B5',isDesignatedRecipient:false};
 const rpc=vi.fn(async(name:string,args?:{p_name?:string})=>({error:null,data:name==='bind_notification_template'?{...templates.find(t=>t.name===args?.p_name),approval:'APPROVED'}:name==='notification_document_payload'?payload:false}));
 const job={id:'b5000000-0000-4000-8000-000000000011',document_id:snapshot.id,requisition_id:null,channel:'whatsapp',destination:'+15550000001'};
 return {prepared:await prepareDocumentNotification({rpc} as never,job,'B5-controlled-worker'),snapshot};
}
it('B54-C01 completed REQ takes conclusion date from earlier science instead of latest receipt',async()=>{
 const {prepared}=await prepare('REQ','req.completed','submitted',{scienceEvents:[{actor_name:'Familiar fictício B5',mode:'express',created_at:'2026-10-21T11:00:00Z'}],fulfillmentLines:[{attended:true}]});
 expect(prepared.templateValues?.data_hora_conclusao).toBe(formatBrazilDate('2026-10-21T11:00:00Z'));
 expect(prepared.templateValues?.data_hora_conclusao).not.toBe(formatBrazilDate('2026-10-30T13:00:00Z'));
 results['B54-C01']={event:'req.completed',observed:prepared.templateValues?.data_hora_conclusao,expectedEvent:formatBrazilDate('2026-10-30T13:00:00Z')};
});
it('B54-C02 completed partial COM receipt selects another validation request',async()=>{
 const {prepared}=await prepare('COM','com.receive','partially_received');
 expect(prepared.template?.name).toBe('hca_com_validar_recebimento_v3');
 results['B54-C02']={event:'com.receive',status:'partially_received',template:prepared.template?.name,limit:'SQL receipt validation behavior reviewed separately; simulated payload, no COM persisted here'};
});
it('B54-C03 final ENT cancellation uses the same request-for-consent template as pending cancellation',async()=>{
 const {prepared}=await prepare('ENT','ent.cancel','cancelled');
 expect(prepared.template?.name).toBe('hca_ent_cancelamento_v3');
 expect(prepared.template?.components.find(p=>p.type==='BODY')?.text).toContain('Sua manifestação é necessária');
 results['B54-C03']={event:'ent.cancel',status:'cancelled',template:prepared.template?.name};
});
it('B54-C04 legitimate ENT counters and immutable PDF version are preserved',async()=>{
 const {prepared}=await prepare('ENT','ent.receive','confirmed');
 expect(prepared.templateValues?.itens_conferidos).toBe('1 de 1');
 expect(prepared.attachment?.filename).toBe('ENT-B5-v3-r4.pdf');
 results['B54-C04']={checked:prepared.templateValues?.itens_conferidos,pdfFilename:prepared.attachment?.filename,limit:'Renderer controlled; no PDF layout claim'};
});
it('B54-C05 presenter forwards a full patient identifier value to the external named parameter',async()=>{
 const {prepared}=await prepare('REQ','req.registered_author','submitted');
 expect(namedBody(prepared.template!,{...prepared.templateValues,nome_paciente:'Nome completo fictício do paciente B5'})).toContainEqual({type:'text',parameter_name:'nome_paciente',text:'Nome completo fictício do paciente B5'});
 results['B54-C05']={patientParameterAccepted:true,limit:'Synthetic value; SQL fallback to patient snapshot/current name established by static contract, no real personal data used'};
});
it('B54-C06 every external event maps to a local contract and unmapped legacy definitions are explicit',()=>{
 const variants:{event:string;status:string;recipient:boolean;template:string;version:number;language:string;approvalInSource:string;pdf:boolean;parameters:string;meaning:string}[]=whatsappEvents.flatMap(event=>{
  const statuses=event==='com.receive'?['partially_received','received']:event==='ent.receive'?['disputed','confirmed']:event.startsWith('bal.')&&event!=='bal.reminder'?['submitted','approved']:['default'];
  const recipients=['ent.issued','ent.submit'].includes(event)?[false,true]:[false];
  return statuses.flatMap(status=>recipients.map(recipient=>{const t=templateForEvent(event,status==='default'?undefined:status,recipient)!;expect(t).not.toBeNull();return {event,status,recipient,template:t.name,version:t.version,language:t.language,approvalInSource:t.approval,pdf:t.components.some(p=>p.format==='DOCUMENT'),parameters:Array.from(t.components.find(p=>p.type==='BODY')?.text?.matchAll(/\{\{([a-z][a-z0-9_]*)\}\}/g)??[],m=>m[1]).join(';'),meaning:'payload do evento; ressalvas BE-002/B54-C01..03; destinatário revalidado no SQL'};}));
 });
 for(const name of ['hca_ent_confirmar_pdf_v3','hca_req_ciencia_simplificada_v4']){const t=templates.find(t=>t.name===name)!;variants.push({event:'conditional_verified_challenge',status:'policy+phone+purpose',recipient:true,template:name,version:t.version,language:t.language,approvalInSource:t.approval,pdf:true,parameters:Array.from(t.components.find(p=>p.type==='BODY')?.text?.matchAll(/\{\{([a-z][a-z0-9_]*)\}\}/g)??[],m=>m[1]).join(';'),meaning:'desafio de propósito específico; não confirmação genérica'});}
 const columns=['event','status','recipient','template','version','language','approvalInSource','pdf','parameters','meaning'];
 const line=(a:unknown[])=>a.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',');
 writeFileSync('docs/audits/2026-10-30-phase-b5-integrations/04_EVENT_TEMPLATE_MATRIX.csv',[line(columns),...variants.map(r=>line(columns.map(k=>r[k as keyof typeof r])))].join('\n')+'\n');
 results['B54-C06']={externalEvents:whatsappEvents.length,variants:variants.length,catalogTemplates:templates.length,unmapped:templates.filter(t=>!variants.some(v=>v.template===t.name)).map(t=>t.name)};
 writeFileSync('docs/audits/2026-10-30-phase-b5-integrations/evidence/b54-content-cases.json',JSON.stringify(results,null,2)+'\n');
});
