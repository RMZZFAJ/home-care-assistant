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
export function notificationHref(row: NotificationTarget) {
  if (row.document_id)
    return (
      (row.operational_documents?.type === "REQ" ? "/historico/" : "/fichas/") +
      row.document_id
    );
  if (row.requisition_id) return "/historico/" + row.requisition_id;
  const query = new URLSearchParams({
    ...(row.care_recipient_id
      ? { careRecipientId: row.care_recipient_id }
      : {}),
    ...(row.consumption_report_id || row.reminder_id
      ? { ref: (row.consumption_report_id ?? row.reminder_id)! }
      : {}),
  });
  return (
    (row.event_key?.startsWith("schedule.") ? "/escalas" : row.event_key?.startsWith("bal.cycle.") ? "/balancos" : row.alert_event_id
      ? "/estoque"
      : row.event_key === "bal.reminder"
        ? "/fichas/bal"
        : row.consumption_report_id || row.reminder_id
          ? "/consumo"
          : "/notificacoes") + (query.size ? "?" + query : "")
  );
}
