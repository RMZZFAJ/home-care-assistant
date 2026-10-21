export type DeliveryStatus = {
  id: string; requisition_id: string; recipient_group: string; recipient_label: string;
  channel: string; state: string; attempts: number; attempted_at: string | null;
  delivered_at?: string | null; read_at?: string | null; error_code?: string | null;
};
export const deliveryLabels: Record<string,string> = {
  pending:"Pendente",processing:"Processando",sent:"Enviada ao provedor",
  accepted:"Aceita pelo provedor",delivered:"Entregue",read:"Lida",
  uncertain:"Resultado incerto",failed:"Falhou",cancelled:"Cancelada",
};
export const recipientGroupLabels: Record<string,string> = {
  family:"Família",supervision:"Supervisão",care_team:"Equipe de cuidado",other:"Responsável",
};
export const deliveryErrorLabels: Record<string,string> = {
  INVALID_DESTINATION:"Destino inválido; revise a configuração.",
  PROVIDER_RATE_LIMIT:"Provedor limitou os envios; aguarde a próxima tentativa.",
  PROVIDER_RESULT_UNCERTAIN:"Confirme o resultado no provedor antes de reenviar.",
  PROVIDER_REJECTED:"Provedor recusou o envio; revise sua configuração.",
  CHANNEL_NOT_CONFIGURED:"Canal aguardando configuração.",
  PROCESSING_FAILED:"Processamento falhou; consulte um administrador.",
};
