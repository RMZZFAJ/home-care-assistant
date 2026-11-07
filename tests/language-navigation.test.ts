import {describe,expect,it} from "vitest";
import {historyFilterPresentation,historyStatusLabels,documentStatusLabel} from "@/lib/documents/presentation";
import {roleLabel,roleLabels} from "@/lib/role-labels";
import {scheduleEventLabel} from "@/lib/schedules/presentation";
import {notificationHref,notificationTargetLabel,type NotificationTarget} from "@/lib/notifications/navigation";

describe("human filter and role vocabulary",()=>{
 it("unknown document status has a human fallback instead of a technical or prototype value",()=>{
  for(const status of ["future_document_state","__proto__","toString",""])expect(documentStatusLabel(status)).toBe("Situação não reconhecida");
 });
 it("special history statuses and chip removal use the same human term",()=>{
  for(const [value,label]of [["science_required","Requisições para sua ciência"],["archive_pending","Conclusões para revisar e arquivar"]]){
   expect(historyStatusLabels[value]).toBe(label);
   expect(historyFilterPresentation("status",value)).toEqual({text:"Situação: "+label,removeLabel:"Remover filtro de situação: "+label});
  }
 });
 it("names search, document type and date boundaries without technical keys",()=>{
  expect(historyFilterPresentation("search","REQ-7")).toEqual({text:"Busca: REQ-7",removeLabel:"Remover filtro de busca: REQ-7"});
  expect(historyFilterPresentation("type","ENT").text).toMatch(/^Tipo de ficha: Entrega/);
  expect(historyFilterPresentation("from","2026-11-07")).toEqual({text:"Data inicial: 07/11/2026",removeLabel:"Remover filtro de data inicial: 07/11/2026"});
  expect(historyFilterPresentation("to","2026-11-08").text).toBe("Data final: 08/11/2026");
 });
 it("unknown status, type, date and prototype keys have explicit safe fallbacks",()=>{
  expect(historyFilterPresentation("status","future_status").text).toBe("Situação: Situação não reconhecida");
  expect(historyFilterPresentation("type","future_type").text).toBe("Tipo de ficha: Tipo de ficha não reconhecido");
  for(const value of ["2026-02-30","2026-99-99","private-invalid-date"])expect(historyFilterPresentation("from",value).text).toBe("Data inicial: Data não reconhecida");
  expect(historyFilterPresentation("__proto__","private-value")).toEqual({text:"Filtro: Valor não reconhecido",removeLabel:"Remover filtro de filtro: Valor não reconhecido"});
 });
 it("covers all five patient roles without adding global administration as a local role",()=>{
  expect(roleLabels).toEqual({admin:"Administrador do paciente",supervisor:"Supervisor",professional:"Profissional",family:"Familiar",reader:"Leitor"});
  for(const [key,label]of Object.entries(roleLabels))expect(roleLabel(key)).toBe(label);
  for(const value of ["global","future_role","__proto__","toString",null,{}])expect(roleLabel(value)).toBe("Função não reconhecida");
 });
 it("covers emitted schedule action terms and a safe future action",()=>{
  const labels={"schedule.type":"Tipo de plantão atualizado","schedule.proposed":"Programação proposta","schedule.published":"Programação publicada","schedule.approve":"Programação aprovada","schedule.reject":"Programação recusada","schedule.end_series":"Programação encerrada","schedule.change_requested":"Alteração proposta","schedule.change_decided":"Decisão de alteração","schedule.change":"Plantão alterado","schedule.cancel":"Plantão cancelado"};
  for(const [action,label]of Object.entries(labels))expect(scheduleEventLabel(action)).toBe(label);
  expect(scheduleEventLabel("future_action")).toBe("Alteração registrada");expect(scheduleEventLabel("__proto__")).toBe("Alteração registrada");
 });
});

describe("notification names describe the resolved destination and retain scope",()=>{
 const patient="10000000-0000-4000-8000-000000000001",target="10000000-0000-4000-8000-000000000002";
 const cases:[NotificationTarget,string,string][]=[
  [{document_id:target,operational_documents:{type:"REQ"}},"/historico/"+target,"Abrir requisição"],
  [{requisition_id:target},"/historico/"+target,"Abrir requisição"],
  [{document_id:target,operational_documents:{type:"COM"}},"/fichas/"+target,"Abrir compra ou doação"],
  [{document_id:target,operational_documents:{type:"ENT"}},"/fichas/"+target,"Abrir entrega"],
  [{document_id:target,operational_documents:{type:"BAL"}},"/fichas/"+target,"Abrir balanço"],
  [{document_id:target},"/fichas/"+target,"Abrir ficha"],
  [{reminder_id:target,event_key:"schedule.published"},"/escalas","Abrir escalas e plantões"],
  [{reminder_id:target,event_key:"bal.cycle.assigned"},"/balancos","Abrir balanços e plantões"],
  [{alert_event_id:target},"/estoque","Abrir estoque"],
  [{reminder_id:target,event_key:"bal.reminder"},"/fichas/bal","Abrir contagem de estoque"],
  [{consumption_report_id:target},"/consumo","Abrir ocorrências e consumo"],
  [{},"/notificacoes","Abrir notificações"],
 ];
 it.each(cases)("resolves %j to its human task",(row,path,label)=>{
  const url=new URL(notificationHref({...row,care_recipient_id:patient}),"https://local.invalid");
  expect(url.pathname).toBe(path);expect(url.searchParams.get("careRecipientId")).toBe(patient);expect(notificationTargetLabel(row)).toBe(label);
  expect(url.searchParams.get("ref")).toBe(row.reminder_id??row.consumption_report_id??row.alert_event_id??null);
 });
 it("document destination takes precedence without carrying an unrelated reminder reference",()=>{
  const row={document_id:target,reminder_id:patient,event_key:"schedule.published",care_recipient_id:patient};
  expect(notificationHref(row)).toBe(`/fichas/${target}?careRecipientId=${patient}`);expect(notificationTargetLabel(row)).toBe("Abrir ficha");
 });
});
