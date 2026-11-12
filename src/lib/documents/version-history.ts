import { documentStatusLabel } from "./presentation";
import { formatBrazilDate } from "../receipt";
import { documentEventLabel } from "../notifications/event-labels";
import { formatQuantity } from "../quantity";

export type HistoryFact = { key: string; label: string; value: string };
export type DocumentVersion = {
  id: string; version: number; action: string; recordedAt: string; hash: string;
  actorId: string | null; actorName: string | null; actorSource: "event_snapshot" | "unknown" | "system";
  code: string; protocol: string | null; type: string; facts: HistoryFact[]; additionalFields: boolean;
};
export type VersionComparison = {
  documentId: string; selected: DocumentVersion; before: DocumentVersion | null;
  versions: { version: number; action: string; createdAt: string; hash: string }[];
};

/** Node24 preserves the original numeric token so historical decimals never round. */
export function parseHistorySnapshot(text: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(text, (_key: string, value: unknown, context?: { source?: string }) => {
    if (typeof value !== "number") return value;
    if (typeof context?.source !== "string") throw new Error("Exact numeric source unavailable");
    return context.source;
  });
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid frozen snapshot");
  return parsed as Record<string, unknown>;
}

const labels: Record<string, string> = {
  status: "Situação", payload: "Declaração", event: "Fato desta versão", workflow: "Etapa do processo",
  lines: "Materiais", actors: "Identidades na origem", issuer: "Responsável na origem", recipient: "Destinatário na origem", patient: "Paciente na origem",
  name: "Nome preservado", name_snapshot: "Nome preservado", product_name_snapshot: "Nome preservado", custom_name: "Material descrito", short_name_snapshot: "Nome curto preservado",
  unit_snapshot: "Unidade preservada", category_snapshot: "Categoria preservada", urgent: "Urgente", current_stock: "Estoque observado da equipe",
  stock_observation: "Forma da observação", stock_observation_at: "Instante da observação", stock_observation_time_source: "Origem do instante",
  quantity: "Quantidade declarada", approved_quantity: "Quantidade aprovada", purchased_quantity: "Quantidade adquirida", accepted_quantity: "Quantidade aceita", reconciled_quantity: "Quantidade conciliada", waived_quantity: "Expectativa dispensada", fully_checked: "Conferência integral",
  origin: "Origem", source: "Custódia de origem", destination: "Custódia de destino", notes: "Observações", reason: "Motivo", comment: "Parecer", body: "Relato", text: "Texto registrado",
  metadata: "Informações do material", receipt: "Conferência declarada", problem: "Classificação da diferença", acceptedQuantity: "Quantidade aceita na declaração", observation: "Observação", observations: "Observações", intent: "Contexto declarado",
  resolution: "Destino da diferença", returnQuantity: "Quantidade devolvida", consumedQuantity: "Consumo declarado", unknownQuantity: "Quantidade desconhecida", receivedQuantity: "Quantidade recebida", pendingQuantity: "Quantidade pendente", outcome: "Resultado", accepted: "Aceito", decision: "Decisão",
  countVersion: "Contagem", count_version: "Contagem", reviewPolicy: "Política de revisão preservada", balApprovers: "Grupos de revisão habilitados", balRule: "Condição de revisão", balanceContext: "Contexto da contagem", kind: "Tipo da contagem", countedAt: "Instante da contagem", professionalName: "Profissional no registro", shiftType: "Tipo do plantão", startsAt: "Início do plantão", endsAt: "Fim do plantão", timezone: "Fuso", weeks: "Semanas de referência",
  recipientSelection: "Escolha do recebedor", recipientSelectionHistory: "Histórico da escolha", recipientName: "Nome do recebedor", selectedName: "Nome de quem escolheu", recipientRole: "Papel do recebedor", manual: "Escolha manual", official: "Escolha oficial", recordedAt: "Instante do registro", createdAt: "Instante registrado", created_at: "Instante registrado", validated_at: "Instante da validação", importedAt: "Instante da importação", sourceCreatedAt: "Data declarada da origem",
  purchaseReceipts: "Parcelas de chegada", state: "Estado", submitted_name: "Autor da informação", validated_name: "Responsável pela conferência", submittedName: "Autor da informação", validatedName: "Responsável pela conferência",
  balanceReviews: "Pareceres da contagem", counter: "Contador", reviews: "Pareceres", legacyApprovals: "Aprovações antigas", reviewer_name: "Nome do revisor no registro", review_group: "Grupo revisor", reference_state: "Situação da referência", reviewed_snapshot: "Contagem examinada", reviewed_document_version: "Versão examinada", recorded_at: "Instante do parecer", appliedBeforeReview: "Reconciliação anterior ao parecer",
  deliveryCancellation: "Cancelamento da entrega", deliveryRegularization: "Regularização da entrega", transfer: "Transferência", request: "Solicitação", history: "Histórico preservado", proposal: "Proposta", requestedName: "Nome do solicitante", requestedAt: "Instante da solicitação", proposedName: "Nome do proponente", proposedAt: "Instante da proposta", decidedName: "Nome do decisor", decidedAt: "Instante da decisão", base: "Base registrada", finding: "Apuração", findings: "Apurações", executedAt: "Instante da execução",
  sciencePolicy: "Acompanhamento da requisição", scienceEvents: "Ciências registradas", fulfillmentLines: "Atendimento por item", familyAware: "Ciência familiar exigida", policy: "Política preservada", mode: "Modo de registro", actor_name: "Nome no evento", attended: "Algum aceite positivo registrado", completed_at: "Instante da conclusão", archived_at: "Instante do arquivamento", archive_reason: "Motivo do arquivamento", manual_archive_required: "Arquivamento manual exigido", science_satisfied_at: "Instante da ciência exigida", isHistorical: "Registro importado", historical: "Registro histórico", source_created_at: "Data declarada da origem", historical_source: "Fonte histórica",
  counterName: "Nome do contador", reviewerName: "Nome do revisor", receiptId: "Parcela vinculada", actorName: "Nome preservado no evento", count: "Contagem", requirement: "Exigência", regularization: "Regularização", cancellation: "Cancelamento", previousStatus: "Situação anterior", previousCountVersion: "Contagem anterior",
  attachments: "Anexos preservados", filename: "Nome do arquivo", sha256: "SHA-256 do anexo", snapshot_source: "Proveniência da descrição", quantity_decimals: "Precisão preservada",
  purchaseProgress: "Andamento da aquisição", expectationClosed: "Expectativa encerrada", expectationPending: "Expectativa pendente", physicalPending: "Chegada física pendente", validationPending: "Conferência pendente", plannedQuantity: "Quantidade planejada", approvedQuantity: "Quantidade aprovada", purchasedQuantity: "Quantidade adquirida", validatedQuantity: "Quantidade validada", pendingValidationQuantity: "Quantidade aguardando validação", unarrivedQuantity: "Quantidade ainda não chegada", waivedQuantity: "Expectativa dispensada", waivableQuantity: "Expectativa elegível para dispensa", remainingExpectation: "Expectativa restante", unit: "Unidade preservada", closure: "Encerramento da expectativa", referenceVersion: "Versão de referência",
  "group": "Grupo revisor",
  "reviewReference": "Referência examinada",
  "expectedQuantity": "Quantidade de referência antes da contagem",
  "category": "Categoria preservada",
  "registration": "Registro profissional preservado",
  "assignmentVersion": "Versão da atribuição",
  "balanceAssignment": "Atribuição da contagem preservada",
  "appliedAt": "Instante da reconciliação",
  "appliedBy": "Identidade de quem reconciliou",
  "balDay": "Dia semanal da referência (0 é domingo)",
  "balReview": "Revisão do balanço na política",
  "balRequirement": "Exigência de revisão do balanço",
  "whatsappSimpleAcceptance": "Aceite simplificado por WhatsApp na política",
  "appliedRevision": "Revisão reconciliada",
  "approvals": "Aprovações preservadas",
  "requestLinks": "Vínculos de origem da requisição",
  "request_body": "Declaração examinada",
  "count_event_id": "Evento da contagem examinada",
  "eventId": "Identidade do evento preservado",
  "nameSource": "Proveniência do nome",
  "itemResolutions": "Identificações posteriores de materiais",
  "countActor": "Autoria da contagem",
  "attachmentId": "Identidade do anexo vinculado",
  "bytes": "Tamanho do arquivo em bytes",
  "confirmed": "Confirmação registrada",
  "purchaseExpectationClosure": "Encerramento da expectativa",
  "purchaseReceipt": "Parcela de chegada registrada no evento",
  "issueOpen": "Diferença ainda aberta",
  "recipientReason": "Motivo da escolha do recebedor",
  "acceptedAt": "Instante da conferência",
  "acceptedBy": "Identidade de quem conferiu",
  "cancellationReason": "Motivo do cancelamento",
  "shifts": "Plantões de referência preservados",
  "suggestedId": "Identidade sugerida naquele registro",
  "suggestionState": "Situação da sugestão naquele registro",
  "previousRecipientId": "Identidade do destinatário anterior",
  "requestedVersion": "Versão da solicitação",
  "cancellationRequestedBy": "Identidade de quem pediu cancelamento",
  "deliveryCancellationHistory": "Solicitações anteriores de cancelamento",
  "sourceReady": "Referência da custódia disponível no registro",
  "quantityDecimals": "Precisão preservada da quantidade",
  "unresolvedTransit": "Quantidade ainda em trânsito",
  "consumptionReferences": "Relatos de consumo vinculados",
  "minimumReturnQuantity": "Quantidade mínima para devolução",
  "availableConsumedQuantity": "Quantidade disponível para declarar consumo",
  "cases": "Casos de regularização preservados",
  "currentId": "Identidade do caso de regularização",
  "reviewers": "Pessoas registradas como revisoras nesse contexto",
  "sourceLines": "Materiais de origem da regularização",
  "followUpPeople": "Pessoas registradas para apuração nesse contexto",
  "pendingTransit": "Pendência em trânsito",
  "recipientAvailable": "Recebedor disponível no registro",
  "requestId": "Identidade da solicitação vinculada",
  "returnMovementIds": "Movimentações vinculadas à devolução",
  "missingQuantity": "Quantidade faltante declarada",
  "returnedQuantity": "Quantidade devolvida declarada",
  "reviewerId": "Identidade do revisor",
  "physicalUnknownQuantity": "Quantidade física ainda desconhecida",
  "administrativeRegularizationId": "Identidade da regularização administrativa",
  "basis": "Base administrativa preservada",
  "divergences": "Diferenças declaradas no recebimento",
  "securityLevel": "Nível do registro preservado",
  "caseId": "Identidade do caso vinculado",
  "scheduled": "Evento de agendamento automático",
  "accept": "Concordância registrada",
  "inactiveAtDeclaration": "Vínculo inativo na declaração",
  "agreement": "Concordância preservada",
  "withdrawal": "Retirada preservada",
  "declaration": "Declaração preservada da transferência",
  "dispatchedAt": "Instante da expedição",
  "originDocumentId": "Identidade da ficha de origem",
  "counterpartyId": "Identidade da contraparte",
  "requisition_id": "Identidade da requisição vinculada",
  "requisitionId": "Identidade da requisição vinculada",
  "currentStock": "Estoque observado da equipe",
  "repeatReason": "Motivo da necessidade repetida",
  "stockObservation": "Forma da observação",
  "stockObservationAt": "Instante da observação",
  "extraItems": "Materiais descritos fora do catálogo",
  "patientName": "Nome do paciente no registro",
  "requesterName": "Nome do solicitante no registro",
  "evidence": "Evidência preservada",
  "archiveDays": "Prazo de arquivamento em dias",
  "policySource": "Origem da política preservada",
  "scienceRoles": "Papéis habilitados à ciência no registro",
  "scienceUsers": "Identidades habilitadas à ciência no registro",
  "policyVersion": "Versão da política preservada",
  "reminderHours": "Prazo inicial do lembrete em horas",
  "scienceRequired": "Ciência exigida na política",
  "scienceAutomatic": "Ciência automática na política",
  "scienceByDispatch": "Ciência pelo encaminhamento na política",
  "scienceRequirement": "Condição da ciência exigida",
  "reminderRepeatHours": "Intervalo dos lembretes em horas",
  "reminders": "Lembretes registrados",
  "archived_by": "Identidade de quem arquivou",
  "eligible_users": "Identidades habilitadas no registro",
  "next_reminder_at": "Próximo lembrete previsto nessa versão",
  "fulfillment_state": "Estado de atendimento preservado",
  "effectiveRequirement": "Condição de ciência preservada",
  "materialEmittedAt": "Instante da emissão material",
  "materialIdentitySource": "Proveniência da identidade material",
  "scienceSatisfied": "Ciência exigida satisfeita",
  "total": "Total de itens registrados",
  "fulfilled": "Itens com algum aceite positivo",
  "sciencePending": "Ciência ainda pendente",
  "operationalIssue": "Emissão para o processo operacional",
  "itemId": "Identidade do item vinculado",
  "originalName": "Descrição original preservada",
  "legacyReconstructed": "Registro reconstruído a partir de fonte legada",
  "newProtocol": "Protocolo da nova declaração vinculada",
  "sourceVersion": "Versão da fonte vinculada",
  "newRequisitionId": "Identidade da nova requisição vinculada",
  "scienceEventId": "Identidade do evento de ciência",
  "reportId": "Identidade do relato vinculado",
  "movementId": "Identidade da movimentação vinculada",
  "movementIds": "Movimentações vinculadas ao resultado",
  "role": "Papel preservado nesse contexto",
  "document_line_id": "Identidade da linha da ficha",
  "requisition_item_id": "Identidade do item da requisição",
  "expeditedQuantity": "Quantidade expedida",
  "priorReconciledQuantity": "Quantidade conciliada anteriormente",
  "regularization_id": "Identidade da regularização vinculada",
  "personalReceipt": "Declaração de recebimento pessoal",
  "followUpOwnerName": "Nome registrado para acompanhar a apuração",
  "proposed_at": "Instante da proposta",
  "proposed_by": "Identidade do proponente",
  "before_snapshot": "Conteúdo anterior preservado",
  "follow_up_owner_id": "Identidade responsável pela apuração",
  "actor": "Responsável preservado no ato",
  "documentVersion": "Versão documental do ato",
  "counterparty": "Contraparte preservada no ato",
  "deliveryId": "Identidade da entrega vinculada",
  "deliveryVersion": "Versão da entrega vinculada",
  "reconciled": "Conciliação preservada",
  "seenTechnicalVersion": "Versão técnica consultada",
  "customName": "Descrição informada do material",
  "resolved_by": "Identidade de quem identificou o material",
  "version": "Versão preservada da referência",
  "code": "Código preservado da referência",
  "protocol": "Protocolo preservado da referência",
  "type": "Tipo preservado da referência",
  "action": "Ato preservado da referência",
  "receiptName": "Nome registrado para o recebimento",
};
const technical = new Set(["id", "document_id", "documentId", "care_recipient_id", "careRecipientId", "product_id", "productId", "lineId", "line_id", "actor_id", "actorId", "user_id", "userId", "created_by", "createdBy", "recipientId", "recipient_id", "submitted_by", "validated_by", "reviewer_id", "counter_id", "requestedBy", "selectedBy", "professionalId", "shiftId", "cycleId", "assignmentId", "referenceRevision", "currentRevision", "referenceHash", "materialIdentity", "source_key", "material_identity", "reference_version", "idempotencyKey", "idempotency_key", "submission_key", "updated_at", "authority", "authority_context", "capabilities", "history", "requestHash", "previousHash", "content_hash", "hash", "sourceFacts", "documentFacts", "schemaVersion", "version", "action", "code", "protocol", "type", "presentation_conversions", "requisitionItemIds", "canClose", "canReview", "canApprove", "canPropose", "canRecordFinding"]);
const values: Record<string, string> = {
  purchase: "Compra", donation: "Doação", FAMILY: "Família", CARE_TEAM: "Equipe", received: "Recebimento complementar", returned: "Devolução à origem", missing: "Falta ou perda conciliada",
  shortage: "Quantidade menor", damaged: "Material avariado", wrong: "Produto divergente", other: "Outra diferença", known: "Quantidade informada", observed: "Quantidade informada", unknown: "Não sabe informar", not_provided: "Não preenchido", unfilled: "Não preenchido", legacy_unknown: "Origem não preservada", client_draft: "Instante observado no preenchimento", server_submission: "Instante de envio registrado pelo servidor",
  approved: "Validado", rejected: "Rejeitado", pending: "Pendente", current: "Atual", historical: "Histórico", unavailable: "Indisponível", scheduled: "Contagem de plantão", recount: "Reconto", transfer: "Transferência", deferred: "Contagem adiada", family: "Família", supervisor: "Supervisão", professional: "Profissional", all: "Todos os grupos habilitados", any: "Qualquer grupo habilitado", optional: "Revisão opcional",
};
const record = (v: unknown): Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {};
const enumKeys = new Set(["origin", "source", "destination", "resolution", "problem", "stock_observation", "stockObservation", "stock_observation_time_source", "state", "suggestionState", "nameSource", "group", "balRequirement", "scienceRequirement", "scienceRoles", "policySource", "effectiveRequirement", "fulfillment_state", "kind", "review_group", "reference_state", "balRule", "balApprovers", "recipientRole"]);
const scalar = (value: unknown, key: string, path: string) => {
  if (value === null) return "Não preservado";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (value === "") return "Sem texto registrado";
  if (key === "status" || key === "previousStatus") {
    if (key === "status" && path.includes("/")) {
      const decisions: Record<string, string> = { pending: "Pendente", approved: "Aprovado", rejected: "Rejeitado", consented: "Consentido", refused: "Recusado", withdrawn: "Retirado", cancelled: "Cancelado", closed: "Encerrado" };
      if (Object.hasOwn(decisions, String(value))) return decisions[String(value)];
    }
    const label = documentStatusLabel(String(value));
    return label === "Situação não reconhecida" ? `${label}: ${String(value)}` : label;
  }
  if (key === "state" && value === "approved") return path.startsWith("purchaseReceipts/") ? "Validado" : "Aprovado";
  if (key === "state" && !path.startsWith("actors/") && !Object.hasOwn(values, String(value))) {
    const label = documentStatusLabel(String(value));
    return label === "Situação não reconhecida" ? `Estado preservado: ${String(value)}` : label;
  }
  if (key === "role") {
    const roles: Record<string, string> = { admin: "Administração local", family: "Família", professional: "Profissional", supervisor: "Supervisão", reader: "Leitura" };
    return Object.hasOwn(roles, String(value)) ? roles[String(value)] : String(value);
  }
  if (/^(?:quantity|current_stock|currentStock|remainingExpectation|pendingTransit|unresolvedTransit)$|_quantity$|Quantity$/.test(key) && /^-?\d+(?:\.\d+)?$/.test(String(value))) return formatQuantity(String(value));
  if (/(?:At|_at)$/.test(key) && typeof value === "string" && /^\d{4}-\d\d-\d\dT/.test(value)) return formatBrazilDate(value);
  // Free text, names and exact quantities must not become translated enum values.
  if (key === "action") { const label = documentEventLabel(String(value)); return label === "Atualização registrada" ? `Ato preservado sem rótulo: ${String(value)}` : label; }
  if (key === "nameSource" || key === "source" && path.startsWith("actors/")) return ["profile_fallback", "current_profile"].includes(String(value)) ? "Nome do cadastro naquele registro; não comprova autoria nominal histórica" : value === "unknown" ? "Nome histórico não preservado" : value === "event_snapshot" ? "Nome preservado no evento" : value === "historical_snapshot" ? "Nome declarado na fonte histórica" : String(value);
  return enumKeys.has(key) && Object.hasOwn(values, String(value)) ? values[String(value)] : String(value);
};

/** Project frozen values only; never consult profiles, catalogue, stock or policy now. */
export function snapshotFacts(body: Record<string, unknown>): { facts: HistoryFact[]; additionalFields: boolean } {
  const facts: HistoryFact[] = [];
  let additionalFields = false;
  const names = new Map((Array.isArray(body.lines) ? body.lines : []).map(item => {
    const line = record(item);
    return [line.id, line.name_snapshot ?? line.product_name_snapshot ?? line.custom_name];
  }));
  const visit = (value: unknown, key: string, path: string, parent: string) => {
    if (technical.has(key) && !(path.includes("/") && ["version", "code", "protocol", "type", "action"].includes(key)) || key === "sessionId") return;
    if (!Object.hasOwn(labels, key)) { additionalFields = true; return; }
    const fieldLabel = path === "createdAt" ? "Data de criação preservada no conteúdo" : key === "state" && path.startsWith("actors/") ? "UF do registro profissional" : key === "source" && path !== "payload/source" ? "Origem preservada" : labels[key];
    const label = parent ? parent + " · " + fieldLabel : fieldLabel;
    if (Array.isArray(value)) {
      if (!value.length) facts.push({ key: path, label, value: "Nenhum registro preservado" });
      value.forEach((item, index) => {
        const obj = record(item), identity = typeof obj.id === "string" ? obj.id : typeof obj.lineId === "string" ? obj.lineId : String(index);
        const name = obj.name_snapshot ?? obj.product_name_snapshot ?? obj.custom_name ?? names.get(obj.lineId ?? obj.id);
        const itemLabel = typeof name === "string" ? `${label} · ${name}` : `${label} · registro ${index + 1}`;
        if (Object.keys(obj).length) for (const child of Object.keys(obj).sort((left, right) => left < right ? -1 : left > right ? 1 : 0)) visit(obj[child], child, `${path}/${identity}/${child}`, itemLabel);
        else facts.push({ key: `${path}/${identity}`, label: itemLabel, value: scalar(item, key, path) });
      });
    } else if (value !== null && typeof value === "object") {
      for (const child of Object.keys(record(value)).sort((left, right) => left < right ? -1 : left > right ? 1 : 0)) visit(record(value)[child], child, `${path}/${child}`, label);
    } else facts.push({ key: path, label, value: scalar(value, key, path) });
  };
  for (const key of Object.keys(body).sort((left, right) => left < right ? -1 : left > right ? 1 : 0)) visit(body[key], key, key, "");
  return { facts, additionalFields };
}

export function compareVersionFacts(before: HistoryFact[], after: HistoryFact[]) {
  const previous = new Map(before.map(fact => [fact.key, fact]));
  const current = new Map(after.map(fact => [fact.key, fact]));
  return [...new Set([...previous.keys(), ...current.keys()])].flatMap(key => {
    const a = previous.get(key), b = current.get(key);
    return a?.value === b?.value && a?.label === b?.label ? [] : [{ key, label: b?.label ?? a!.label, before: a?.value ?? "Não consta nesta versão", after: b?.value ?? "Não consta nesta versão" }];
  });
}

export function versionEventLabel(version: DocumentVersion) {
  return documentEventLabel(version.action, version.facts.find(f => f.key === "payload/origin")?.value === "Doação" ? "donation" : undefined);
}
