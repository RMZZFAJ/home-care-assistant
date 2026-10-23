import catalogue from "./template-catalog.json";
export type TemplateDefinition = {
  name: string;
  version: number;
  language: string;
  approval: string;
  components: {
    type: string;
    format?: string;
    text?: string;
    example?: {
      body_text_named_params?: { param_name: string; example: string }[];
    };
    buttons?: { type: string; text: string; url?: string }[];
  }[];
};
export const templates = catalogue as TemplateDefinition[];
export function templateForEvent(
  event: string,
  status?: string,
  recipient = false,
) {
  const mapping: Record<string, string> = {
    "stock.alert": "hca_estoque_alerta_v3",
    "occurrence.received": "hca_ocorrencia_recebida_v3",
    "bal.reminder": "hca_bal_lembrete_v3",
    "shift.reminder": "hca_plantao_ocorrencia_v3",
    "req.issued": "hca_req_ciencia_familia_v4",
    "req.registered_author": "hca_req_registrada_autor_v4",
    "req.fulfillment_updated": "hca_req_atendimento_parcial_v3",
    "req.science_satisfied": "hca_req_ciencia_registrada_autor_v4",
    "req.completed": "hca_req_concluida_v3",
    "req.reminder": "hca_req_pendentes_lembrete_v3",
    "com.issued": "hca_com_aprovacao_v3",
    "com.receive":
      status === "received"
        ? "hca_com_validada_v3"
        : "hca_com_validar_recebimento_v3",
    "com.validate_receipt": "hca_com_validada_v3",
    "ent.issued": recipient
      ? "hca_ent_conferencia_autenticada_v3"
      : "hca_ent_expedida_pdf_v3",
    "ent.submit": recipient
      ? "hca_ent_conferencia_autenticada_v3"
      : "hca_ent_expedida_pdf_v3",
    "ent.receive":
      status === "confirmed"
        ? "hca_ent_concluida_pdf_v3"
        : "hca_ent_divergencia_v3",
    "ent.resolve": "hca_ent_regularizada_v3",
    "ent.reminder": "hca_ent_aceite_pendente_v3",
    "ent.cancel": "hca_ent_cancelamento_v3",
    "bal.issued":
      status === "approved" ? "hca_bal_concluido_v3" : "hca_bal_aprovacao_v3",
    "bal.approve":
      status === "approved" ? "hca_bal_concluido_v3" : "hca_bal_aprovacao_v3",
    "com.revised": "hca_documento_atualizado_pdf_v3",
    "ent.revised": "hca_documento_atualizado_pdf_v3",
    "bal.recount": "hca_documento_atualizado_pdf_v3",
  };
  return templates.find((template) => template.name === mapping[event]) ?? null;
}
export function namedBody(
  template: TemplateDefinition,
  values: Record<string, string | undefined>,
) {
  const required = [
    ...new Set(
      Array.from(
        template.components
          .find((part) => part.type === "BODY")
          ?.text?.matchAll(/\{\{([a-z][a-z0-9_]*)\}\}/g) ?? [],
        (match) => match[1],
      ),
    ),
  ];
  if (required.some((name) => !values[name]?.trim()))
    throw new Error("MISSING_TEMPLATE_PARAMETER");
  return required.map((parameter_name) => ({
    type: "text",
    parameter_name,
    text: values[parameter_name]!,
  }));
}
export function templateButtons(
  template: TemplateDefinition,
  suffix: string,
  acceptanceToken?: string,
) {
  return (
    template.components.find((part) => part.type === "BUTTONS")?.buttons ?? []
  ).map((button, index) => {
    if (button.type === "URL") {
      if (
        !button.url?.startsWith("https://home-care-assistant.vercel.app/") ||
        !button.url.endsWith("{{1}}")
      )
        throw new Error("INVALID_TEMPLATE_URL");
      return {
        type: "button",
        sub_type: "url",
        index: String(index),
        parameters: [{ type: "text", text: suffix }],
      };
    }
    if (button.type === "QUICK_REPLY") {
      if (!acceptanceToken) throw new Error("VERIFIED_CHALLENGE_REQUIRED");
      const prefix = template.name.startsWith("hca_req_")
        ? "HCA_SCIENCE:"
        : template.name.includes("plantao")
          ? "HCA_NO_ISSUES:"
          : "HCA_ACCEPT:";
      return {
        type: "button",
        sub_type: "quick_reply",
        index: String(index),
        parameters: [{ type: "payload", payload: prefix + acceptanceToken }],
      };
    }
    throw new Error("UNSUPPORTED_TEMPLATE_BUTTON");
  });
}
