import type { SupabaseClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { renderDocumentPdf } from "@/lib/server/document-pdf";
import { rpc } from "@/lib/server/api";
import { formatBrazilDate } from "@/lib/receipt";
import { templateForEvent, templates, type TemplateDefinition } from "./template-registry";
import type { NotificationJob } from "./provider";
import { tokenHash } from "./flows";

export async function prepareDocumentNotification(client: SupabaseClient, job: NotificationJob, workerId: string): Promise<NotificationJob> {
  if (!job.document_id && (job.alert_event_id || job.consumption_report_id || job.reminder_id)) {
    const notice = await rpc(client, "notification_notice_payload", { p_id: job.id, p_worker: workerId }) as { event: string; suffix: string; values: Record<string, string> } | null;
    if (!notice) return { ...job, preparationError: "EVENT_TEMPLATE_NOT_CONFIGURED" };
    const definition = templateForEvent(notice.event);
    if (!definition) return { ...job, preparationError: "EVENT_TEMPLATE_NOT_CONFIGURED" };
    const template = await rpc(client, "bind_notification_template", { p_id: job.id, p_worker: workerId, p_name: definition.name, p_version: definition.version, p_language: definition.language }) as TemplateDefinition | null;
    if (!template) return { ...job, preparationError: "EVENT_TEMPLATE_NOT_CONFIGURED" };
    let acceptanceToken: string | undefined;
    if (notice.event === "shift.reminder" && template.approval === "APPROVED") {
      const token = randomBytes(32).toString("base64url");
      if (await rpc(client, "issue_reminder_challenge", { p_notification: job.id, p_worker: workerId, p_hash: tokenHash(token) })) acceptanceToken = token;
    }
    return { ...job, template, templateValues: notice.values, urlSuffix: notice.suffix, acceptanceToken };
  }
  if (!job.document_id) return job;
  const payload = await rpc(client, "notification_document_payload", { p_id: job.id, p_worker_id: workerId }) as {
    code: string; type: string; version: number; hash: string; snapshot: Parameters<typeof renderDocumentPdf>[0]; eventKey: string;
    recipientName: string; shortPatientName: string; isDesignatedRecipient: boolean; includePdf: boolean;
  } | null;
  if (!payload) return { ...job, preparationError: "DOCUMENT_PREPARATION_FAILED" };
  let definition = templateForEvent(payload.eventKey, payload.snapshot.status, payload.isDesignatedRecipient);
  if (!definition) return { ...job, preparationError: "EVENT_TEMPLATE_NOT_CONFIGURED" };
  let acceptanceToken: string | undefined;
  if (payload.eventKey === "req.issued") {
    const token = randomBytes(32).toString("base64url");
    if (await rpc(client, "issue_science_challenge", { p_notification: job.id, p_worker: workerId, p_hash: tokenHash(token) })) {
      definition = templates.find(row => row.name === "hca_req_ciencia_simplificada_v4") ?? definition;
      acceptanceToken = token;
    }
  }
  if (payload.type === "ENT" && payload.isDesignatedRecipient && ["ent.issued","ent.submit"].includes(payload.eventKey)) {
    const quick = templates.find(row => row.name === "hca_ent_confirmar_pdf_v3");
    if (quick) {
      const registered = await rpc(client, "bind_notification_template", { p_id: job.id, p_worker: workerId, p_name: quick.name, p_version: quick.version, p_language: quick.language }) as TemplateDefinition | null;
      if (registered?.approval === "APPROVED") {
        const token = randomBytes(32).toString("base64url");
        if (await rpc(client, "issue_whatsapp_challenge", { p_notification: job.id, p_worker: workerId, p_hash: tokenHash(token) })) { definition = quick; acceptanceToken = token; }
      }
    }
  }
  const template = await rpc(client, "bind_notification_template", { p_id: job.id, p_worker: workerId, p_name: definition.name, p_version: definition.version, p_language: definition.language }) as TemplateDefinition | null;
  if (!template) return { ...job, preparationError: "EVENT_TEMPLATE_NOT_CONFIGURED" };
  if (template.approval !== "APPROVED") return { ...job, template, preparationError: "TEMPLATE_NOT_APPROVED" };
  const snapshot = payload.snapshot;
  const total = snapshot.lines.length, fulfilled = snapshot.fulfillmentLines?.filter(row => row.attended).length ?? 0;
  const science = snapshot.scienceEvents?.at(-1);
  const originLabels: Record<string, string> = { express: "Expressa no aplicativo", app_visible: "Automática: conteúdo exibido", whatsapp_confirm: "Simplificada: WhatsApp verificado", whatsapp_read: "Automática: leitura correlacionada", dispatch: "Expedição por responsável autorizado" };
  const values: Record<string, string | undefined> = {
    nome_destinatario: payload.recipientName, nome_paciente: payload.shortPatientName,
    nome_solicitante: snapshot.actors?.issuer?.name, nome_entregador: snapshot.actors?.issuer?.name,
    nome_recebedor: snapshot.actors?.recipient?.name ?? snapshot.history?.at(-1)?.actorName,
    nome_responsavel: science?.actor_name ?? snapshot.history?.at(-1)?.actorName,
    nome_comprador: snapshot.actors?.issuer?.name, nome_validador: snapshot.history?.at(-1)?.actorName,
    nome_contador: snapshot.actors?.issuer?.name,
    numero_requisicao: payload.type === "REQ" ? payload.code : undefined,
    numero_entrega: payload.type === "ENT" ? payload.code : undefined, numero_compra: payload.type === "COM" ? payload.code : undefined,
    numero_balanco: payload.type === "BAL" ? payload.code : undefined, numero_documento: payload.code,
    data_hora: snapshot.createdAt ? formatBrazilDate(snapshot.createdAt) : undefined,
    data_hora_conclusao: science?.created_at ? formatBrazilDate(science.created_at) : snapshot.history?.at(-1)?.createdAt ? formatBrazilDate(snapshot.history.at(-1)!.createdAt) : undefined,
    quantidade_itens: String(total), itens_urgentes: String(snapshot.lines.filter(row => row.urgent === true).length),
    itens_atendidos: `${fulfilled} de ${total}`, itens_total: String(total), itens_pendentes: String(total-fulfilled),
    itens_conferidos: `${snapshot.lines.filter(row => row.fully_checked === true).length} de ${total}`,
    itens_divergentes: String(snapshot.lines.filter(row => (row.metadata as Record<string, unknown> | undefined)?.issueOpen === true).length),
    itens_recebidos: String(snapshot.lines.filter(row => Number(row.accepted_quantity) > 0).length),
    itens_ajustados: String(snapshot.lines.filter(row => String((row.metadata as Record<string, unknown> | undefined)?.expectedQuantity) !== String(row.quantity)).length),
    versao_documento: String(payload.version), origem_ciencia: science ? originLabels[science.mode] : undefined,
  };
  const pdfHeader = template.components.some(part => part.type === "HEADER" && part.format === "DOCUMENT");
  if (pdfHeader && !payload.includePdf) return { ...job, preparationError: "PDF_TEMPLATE_VARIANT_REQUIRED" };
  return { ...job, code: payload.code, documentType: payload.type, template, templateValues: values, acceptanceToken,
    ...(pdfHeader ? { attachment: { bytes: await renderDocumentPdf(snapshot, payload.hash), filename: `${payload.code}-v${payload.version}-r4.pdf` } } : {}),
  };
}
