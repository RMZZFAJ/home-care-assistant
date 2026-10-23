export type DeliveryStatus = {
  id: string;
  requisition_id: string;
  recipient_group: string;
  recipient_label: string;
  channel: string;
  state: string;
  attempts: number;
  attempted_at: string | null;
  delivered_at?: string | null;
  read_at?: string | null;
  error_code?: string | null;
};
export const deliveryLabels: Record<string, string> = {
  pending: "Pendente",
  processing: "Processando",
  sent: "Enviada ao provedor",
  accepted: "Aceita pelo provedor",
  delivered: "Entregue",
  read: "Lida",
  uncertain: "Resultado incerto",
  failed: "Falhou",
  cancelled: "Cancelada",
};
export const recipientGroupLabels: Record<string, string> = {
  family: "Família",
  supervision: "Supervisão",
  care_team: "Equipe de cuidado",
  other: "Responsável",
};
export const deliveryErrorLabels: Record<string, string> = {
  TEMPLATE_NOT_APPROVED:
    "Template preparado, aguardando aprovação Meta. Envio pausado até regularização.",
  EVENT_TEMPLATE_NOT_CONFIGURED:
    "Evento sem template externo configurado; processamento pausado.",
  EVENT_APP_ONLY: "Evento disponível somente no aplicativo.",
  EVENT_DISABLED: "Envio cancelado pela configuração atual do paciente.",
  META_COUNTRY_RESTRICTED_130497:
    "A Meta restringiu envios para o país deste destinatário (130497). Solicite revisão da elegibilidade da conta antes de tentar novamente.",
  DOCUMENT_TEMPLATE_NOT_CONFIGURED:
    "Template de documento aguardando aprovação e configuração na Meta.",
  MEDIA_UPLOAD_FAILED: "Não foi possível enviar o PDF ao provedor.",
  DOCUMENT_PREPARATION_FAILED:
    "Comprovante aguardando preparação; o registro operacional foi preservado.",
  INVALID_DESTINATION: "Destino inválido; revise a configuração.",
  PROVIDER_RATE_LIMIT:
    "Provedor limitou os envios; aguarde a próxima tentativa.",
  PROVIDER_RESULT_UNCERTAIN:
    "Confirme o resultado no provedor antes de reenviar.",
  PROVIDER_REJECTED: "Provedor recusou o envio; revise sua configuração.",
  CHANNEL_NOT_CONFIGURED: "Canal aguardando configuração.",
  PROCESSING_FAILED: "Processamento falhou; consulte um administrador.",
};
