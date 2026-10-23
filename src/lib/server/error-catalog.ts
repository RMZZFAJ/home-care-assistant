type Category =
  | "validation"
  | "authentication"
  | "authorization"
  | "conflict"
  | "configuration"
  | "dependency"
  | "internal";
type Descriptor = {
  category: Category;
  status: number;
  retryable: boolean;
  recommendedAction: string;
};

const validation = {
  category: "validation",
  status: 400,
  retryable: false,
  recommendedAction: "Revise os dados informados antes de enviar novamente.",
} as const;
const conflict = {
  category: "conflict",
  status: 409,
  retryable: false,
  recommendedAction:
    "Consulte o estado atual e resolva o conflito antes de repetir.",
} as const;
const dependency = {
  category: "dependency",
  status: 503,
  retryable: true,
  recommendedAction:
    "Tente novamente. Se persistir, informe a referência ao suporte.",
} as const;
const configuration = {
  category: "configuration",
  status: 503,
  retryable: false,
  recommendedAction: "Solicite ao administrador a configuração do serviço.",
} as const;
const reconciliation = {
  ...dependency,
  recommendedAction:
    "Consulte o resultado persistido e recupere a mesma tentativa antes de iniciar outra.",
};

/** Stable public contracts. Messages may add context without exposing private data. */
export const errorCatalog = {
  VALIDATION_ERROR: validation,
  INVALID_JSON: validation,
  INVALID_DATE: validation,
  INVALID_OPERATION: validation,
  PATIENT_REQUIRED: {
    ...validation,
    recommendedAction: "Selecione um paciente autorizado.",
  },
  CONTEXT_REQUIRED: {
    ...conflict,
    recommendedAction: "Escolha um vínculo válido em Mudar perfil.",
  },
  JSON_REQUIRED: { ...validation, status: 415 },
  PAYLOAD_TOO_LARGE: {
    ...validation,
    status: 413,
    recommendedAction: "Reduza o conteúdo enviado.",
  },
  SESSION_EXPIRED: {
    category: "authentication",
    status: 401,
    retryable: false,
    recommendedAction: "Entre novamente com sua conta.",
  },
  FORBIDDEN: {
    category: "authorization",
    status: 403,
    retryable: false,
    recommendedAction:
      "Solicite a revisão do seu vínculo ao administrador responsável.",
  },
  INVALID_ORIGIN: {
    category: "authorization",
    status: 403,
    retryable: false,
    recommendedAction: "Abra o endereço autorizado da aplicação.",
  },
  NOT_FOUND: {
    ...validation,
    status: 404,
    recommendedAction: "Confira o paciente e o registro selecionados.",
  },
  LAST_GLOBAL_ADMIN: {
    ...conflict,
    recommendedAction:
      "Mantenha outro administrador global ativo antes da alteração.",
  },
  IDEMPOTENCY_CONFLICT: {
    ...conflict,
    recommendedAction:
      "Recupere a tentativa original. Para conteúdo novo, inicie outra operação.",
  },
  INVENTORY_CONFLICT: {
    ...conflict,
    recommendedAction: "Abra nova contagem com referência atualizada.",
  },
  INSUFFICIENT_STOCK: {
    ...conflict,
    recommendedAction:
      "Confira o saldo da custódia e a quantidade da movimentação.",
  },
  INVITATION_INVALID: {
    ...conflict,
    recommendedAction: "Solicite um novo convite ao administrador do paciente.",
  },
  AMBIGUOUS_PRODUCT: {
    ...conflict,
    recommendedAction: "Identifique explicitamente o produto correto.",
  },
  DUPLICATE: conflict,
  DUPLICATE_REVIEW_REQUIRED: {
    ...conflict,
    recommendedAction:
      "Confira os itens pendentes e justifique a nova requisição.",
  },
  VERSION_CONFLICT: {
    ...conflict,
    recommendedAction:
      "Atualize a tela e revise o estado e as aprovações atuais.",
  },
  PATIENT_INACTIVE: {
    ...conflict,
    recommendedAction:
      "Consulte o histórico ou solicite a reativação do paciente.",
  },
  RECONCILIATION_REQUIRED: {
    ...conflict,
    recommendedAction:
      "Confira o resultado no provedor antes de confirmar uma nova tentativa.",
  },
  DATABASE_UNAVAILABLE: dependency,
  AUTH_UNAVAILABLE: dependency,
  PERSISTENCE_UNCONFIRMED: reconciliation,
  RECEIPT_PENDING: reconciliation,
  NOTIFICATION_RESULT_UNCONFIRMED: {
    ...reconciliation,
    recommendedAction:
      "Confira os estados persistidos das notificações antes de reprocessar.",
  },
  NOT_CONFIGURED: configuration,
  WORKER_NOT_CONFIGURED: configuration,
  INTERNAL_ERROR: { ...dependency, category: "internal", status: 500 },
} as const satisfies Record<string, Descriptor>;

export type ErrorCode = keyof typeof errorCatalog;
