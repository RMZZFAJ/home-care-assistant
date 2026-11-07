export type NotificationTarget = {
  document_id?: string | null;
  requisition_id?: string | null;
  consumption_report_id?: string | null;
  reminder_id?: string | null;
  alert_event_id?: string | null;
  care_recipient_id?: string;
  event_key?: string;
  operational_documents?: { type: string } | null;
};
function notificationDestination(row: NotificationTarget) {
  const query = new URLSearchParams({
    ...(row.care_recipient_id
      ? { careRecipientId: row.care_recipient_id }
      : {}),
    ...(!row.document_id && !row.requisition_id && (row.consumption_report_id || row.reminder_id || row.alert_event_id)
      ? { ref: (row.consumption_report_id ?? row.reminder_id ?? row.alert_event_id)! }
      : {}),
  });
  if(!row.document_id&&!row.requisition_id){if(row.consumption_report_id)query.set("refKind","report");else if(row.reminder_id)query.set("refKind","reminder");else if(row.alert_event_id)query.set("refKind","alert");}
  let path:string,label:string;
  if(row.document_id){
    const kind=row.operational_documents?.type;
    path=(kind==="REQ"?"/historico/":"/fichas/")+row.document_id;
    label=kind==="REQ"?"Abrir requisição":kind==="COM"?"Abrir compra ou doação":kind==="ENT"?"Abrir entrega":kind==="BAL"?"Abrir balanço":"Abrir ficha";
  }else if(row.requisition_id){path="/historico/"+row.requisition_id;label="Abrir requisição";}
  else if(row.event_key?.startsWith("schedule.")){path="/escalas";label="Abrir escalas e plantões";}
  else if(row.event_key?.startsWith("bal.cycle.")){path="/balancos";label="Abrir balanços e plantões";}
  else if(row.alert_event_id){path="/estoque";label="Abrir estoque";}
  else if(row.event_key==="bal.reminder"){path="/fichas/bal";label="Abrir contagem de estoque";}
  else if(row.consumption_report_id||row.reminder_id){path="/consumo";label="Abrir ocorrências e consumo";}
  else{path="/notificacoes";label="Abrir notificações";}
  return {href:path+(query.size?"?"+query:""),label};
}
export function notificationHref(row:NotificationTarget){return notificationDestination(row).href;}
export function notificationTargetLabel(row:NotificationTarget){return notificationDestination(row).label;}
