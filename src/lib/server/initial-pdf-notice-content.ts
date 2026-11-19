import { z } from "zod";
import { formatBrazilDate } from "@/lib/receipt";
import type { ApprovedPdfLayout } from "./approved-pdf-layout";

const channelLabels = {
  email: "E-mail", internal: "Aviso no aplicativo", whatsapp: "WhatsApp", push: "Notificação do navegador",
} as const;
const stateLabels = {
  pending: "Em fila", retry_pending: "Em fila após falha", processing: "Em processamento",
  accepted: "Aceito pelo provedor", sent: "Enviado", delivered: "Entregue", read: "Leitura observada",
  failed: "Falhou", uncertain: "Resultado incerto", cancelled: "Cancelado", expired: "Expirou",
} as const;
const noticeCut = z.object({
  capturedAt: z.iso.datetime({ offset: true }),
  unconfirmed: z.boolean(),
  counts: z.array(z.object({
    channel: z.enum(Object.keys(channelLabels) as (keyof typeof channelLabels)[]),
    state: z.enum(Object.keys(stateLabels) as (keyof typeof stateLabels)[]),
    total: z.number().int().positive(),
  }).strict()).max(44),
}).strict();

export function initialPdfNoticeFacts(value: unknown): Record<string, string> {
  if (value === undefined) return {};
  const cut = noticeCut.parse(value);
  return {
    "issuance/notices/cut": "Situação dos avisos no momento da geração · " + formatBrazilDate(cut.capturedAt),
    ...(cut.unconfirmed ? { "issuance/notices/unconfirmed": "Parte do processamento ainda precisa ser confirmada." } : {}),
    ...(cut.counts.length ? Object.fromEntries(cut.counts.map(row => [
      "issuance/notices/" + row.channel + "/" + row.state,
      channelLabels[row.channel] + " · " + stateLabels[row.state] + " · " + row.total,
    ])) : { "issuance/notices/empty": "Nenhum aviso registrado para esta emissão no momento da geração." }),
  };
}

export function appendInitialPdfNotices(layout: ApprovedPdfLayout, value: unknown) {
  if (value === undefined) return;
  layout.ensure(100);
  layout.heading("Comunicações da emissão");
  for (const [key, text] of Object.entries(initialPdfNoticeFacts(value)))
    layout.paragraph(text, key);
}
