import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { unstable_rethrow } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { quantity } from "@/lib/quantity";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { appOrigins } from "@/lib/server/app-origin";
import { errorCatalog, type ErrorCode } from "@/lib/server/error-catalog";
import { observeApiFailure } from "@/lib/server/operations-observer";

export class ApiError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public status: number = errorCatalog[code].status,
    public retryable: boolean = errorCatalog[code].retryable,
    public confirmedStage?: {
      kind: "revision";
      documentId: string;
      idempotencyKey: string;
      version: number;
    },
  ) {
    super(message);
  }
}

export function databaseError(
  error: { code?: string; message?: string } | null,
): never {
  const message = error?.message ?? "";
  if (/invalid push|expired push subscription|push device limit reached|push device requires consent/i.test(message))
    throw new ApiError("VALIDATION_ERROR", "A inscrição está inválida, expirou ou atingiu o limite de aparelhos ativos. Consulte os avisos deste aparelho antes de confirmar novamente.", 400);
  if (error?.code === "42702")
    throw new ApiError(
      "INTERNAL_ERROR",
      "Não foi possível processar esta operação. Informe a referência ao suporte.",
      500,
      true,
    );
  if (/stale schedule type reference/i.test(message)) throw new ApiError("VERSION_CONFLICT", "O tipo de plantão mudou. Consulte e revise os horários atuais antes de confirmar.", 409);
  if (/stale private draft revision/i.test(message))
    throw new ApiError("DRAFT_VERSION_CONFLICT", "O rascunho mudou em outro editor ou já foi concluído. Seu preenchimento foi preservado; compare a revisão salva antes de continuar.", 409);
  if (/stale remaining need source/i.test(message))
    throw new ApiError("VERSION_CONFLICT", "A requisição de origem mudou. Consulte e compare a referência atual antes de confirmar a nova necessidade. Sua seleção e seu motivo foram preservados.", 409);
  if (/stale transfer preparation|stale transfer version|transfer decision already settled|transfer already dispatched or closed|transfer agreement required before dispatch|transfer not dispatched/i.test(message))
    throw new ApiError("VERSION_CONFLICT", "A transferência ou suas referências mudaram. Compare a situação atual antes de preparar outra confirmação. Sua justificativa foi preservada.", 409);
  if (/bilateral transfer recipient is frozen/i.test(message))
    throw new ApiError("VALIDATION_ERROR", "O recebedor pertence à declaração e à concordância preservadas. Cancele esta transferência pelo fluxo próprio antes de declarar outra com nova pessoa.", 400);
  if (/insufficient transfer stock/i.test(message))
    throw new ApiError("VERSION_CONFLICT", "O saldo da custódia de origem não comporta a quantidade declarada. Consulte a referência atual antes de continuar.", 409);
  if (/stale recount assignment reference|stale recount target shift|another recount assignment is active/i.test(message))
    throw new ApiError("VERSION_CONFLICT","A contagem ou o plantão do reconto mudou. Compare a referência atual e revise a pessoa e o período antes de confirmar. Sua justificativa foi preservada.",409);
  if (/obsolete balance deferral|balance deferral already decided/i.test(message))
    throw new ApiError("VERSION_CONFLICT","O pedido ou o plantão proposto mudou. O destino permanece congelado; uma aprovação antiga não pode substituí-lo. Confira a situação atual e preserve sua justificativa.",409);
  if (/stale balance review|balance review group unavailable/i.test(message))
    throw new ApiError("VERSION_CONFLICT","A contagem, a revisão ou sua referência mudou. Compare o estado atual; seu parecer foi preservado.",409);
  if (/balance count attribution unavailable/i.test(message))
    throw new ApiError("VALIDATION_ERROR","A autoria da contagem antiga não está íntegra. Preserve o histórico e inicie um reconto autorizado.",400);
  if (/stale (?:or unavailable )?presentation|existing presentation requires identity and version/i.test(message))
    throw new ApiError("VERSION_CONFLICT", "A apresentação mudou ou ficou indisponível. Consulte o fator e a versão atuais; os campos informados foram preservados.", 409);
  if (/administrative regularization required/i.test(message))throw new ApiError("VALIDATION_ERROR","O recebedor está indisponível. Abra a regularização administrativa para registrar base, fatos conhecidos e conferência independente, preservando o recebimento anterior.",400);
  if (/stale regularization|regularization decision conflict|regularization proposal not eligible/i.test(message))throw new ApiError("VERSION_CONFLICT","A entrega ou a proposta de regularização mudou. Consulte a versão e a decisão atuais antes de preparar outra confirmação.",409);
  if (/unknown physical facts require an active follow-up owner/i.test(message))throw new ApiError("VALIDATION_ERROR","Indique uma pessoa ativa e elegível para encaminhar a apuração das quantidades ainda desconhecidas. Nenhuma quantidade desconhecida será baixada.",400);
  if (/regularization exceeds pending transit/i.test(message))throw new ApiError("VALIDATION_ERROR","As quantidades apuradas excedem a pendência em trânsito. Confira somente a nova declaração física; os aceites anteriores permanecem preservados.",400);
  if (/purchase origin required/i.test(message))
    throw new ApiError("VALIDATION_ERROR", "Escolha compra ou doação antes de emitir esta ficha. A origem histórica não informada continua preservada.", 400);
  if (/stale delivery recipient reference/i.test(message))
    throw new ApiError("VERSION_CONFLICT", "As pessoas elegíveis ou a sugestão da escala mudaram. Consulte e compare as referências atuais; sua escolha e justificativa foram preservadas.", 409);
  if (/recipient selection reason required|invalid recipient selection reason/i.test(message))
    throw new ApiError("VALIDATION_ERROR", "Registre a justificativa própria da escolha manual ou troca de recebedor, com 3 a 1000 caracteres.", 400);
  if (/historical requisition is read only/i.test(message))
    throw new ApiError("VALIDATION_ERROR", "Esta requisição histórica é somente consulta. Registre uma nova necessidade ou prepare uma ficha avulsa para o ato atual.", 400);
  if (/no purchase expectation remaining/i.test(message))
    throw new ApiError("VALIDATION_ERROR", "Não existe expectativa não adquirida elegível para encerrar nesta versão. Materiais já adquiridos continuam sujeitos à chegada e conferência.", 400);
  if (/delivery cancellation decision conflict/i.test(message))
    throw new ApiError("VERSION_CONFLICT", "Este pedido já mudou ou recebeu outra decisão. Consulte o pedido e seu resultado antes de continuar.", 409);
  if (/stale delivery consumption reference|delivery unit reference changed/i.test(message))
    throw new ApiError("VERSION_CONFLICT", "As referências da conciliação mudaram. Consulte a situação atual e revise as devoluções preservadas antes de confirmar.", 409);
  if (/delivery consumption reference unavailable/i.test(message))
    throw new ApiError("VALIDATION_ERROR", "Não foi possível comprovar as referências de consumo desta conciliação. Atualize a seção; o dado de origem não pode ser corrigido neste formulário.", 400);
  if (/delivery transit requires reconciliation/i.test(message))
    throw new ApiError("VALIDATION_ERROR", "Ainda há material em trânsito sem conciliação. Registre sua situação real antes de concluir o cancelamento.", 400);
  if (/confirmed delivery consumption insufficient/i.test(message))
    throw new ApiError("VALIDATION_ERROR", "A parte que não será devolvida precisa de consumo já confirmado e disponível para conciliação. Confira as devoluções reais e os relatos vinculados.", 400);
  if (/consumption decision conflict/i.test(message))
    throw new ApiError("VERSION_CONFLICT", "Outro responsável já decidiu esta versão. Consulte o relato e a decisão registrada antes de continuar.", 409);
  if (/stale consumption report/i.test(message))
    throw new ApiError("VERSION_CONFLICT", "O relato recebeu um complemento. Consulte a versão atual e revise seu conteúdo antes de decidir.", 409);
  if (/structured consumption supplement required/i.test(message))
    throw new ApiError("VALIDATION_ERROR", "Este consumo precisa de material e quantidade. Registre um complemento antes de confirmar o desconto.", 400);
  if (/purchase has acquisition or receipt facts/i.test(message))
    throw new ApiError("VALIDATION_ERROR", "Esta ficha já tem aquisição, parcelas ou encerramento registrados. Preserve esses fatos; confira as parcelas e encerre somente a expectativa ainda não adquirida.", 400);
  if (error?.code === "PT409" && message === "operations version conflict")
    throw new ApiError("VERSION_CONFLICT", "O acompanhamento técnico mudou em outra sessão. Atualize a consulta antes de enviar uma nova alteração.", 409);
  if (/stale preference version/i.test(message))
    throw new ApiError("VERSION_CONFLICT", "Sua preferência mudou em outra sessão. Recarregue o estado antes de confirmar uma nova alteração.", 409);
  if (/science preference or authority changed/i.test(message))
    throw new ApiError("VERSION_CONFLICT", "Sua preferência ou habilitação mudou. Consulte novamente a referência antes de confirmar ciência.", 409);
  if (/stale document material/i.test(message))
    throw new ApiError("VERSION_CONFLICT", "A referência do conteúdo desta requisição não confere. Reabra a requisição antes de confirmar ciência.", 409);
  if (/balance requires family deferral before schedule period change/i.test(message))
    throw new ApiError("VERSION_CONFLICT", "Este plantão tem um BAL designado. Registre a decisão familiar no acompanhamento do balanço antes de alterar o período ou cancelar o plantão.",409);
  if (/distinct balance reviewer/i.test(message))
    throw new ApiError("FORBIDDEN","A revisão precisa ser realizada por outra pessoa autorizada, distinta de quem fez a contagem.",403);
  if (/schedule overlap/i.test(message))
    throw new ApiError("SCHEDULE_OVERLAP", "Este profissional já possui um plantão nesse período. Revise os horários.", 409);
  if (/duplicate review required/i.test(message))
    throw new ApiError(
      "DUPLICATE_REVIEW_REQUIRED",
      "Há uma requisição pendente deste produto. Confira a anterior e justifique a reiteração.",
      409,
    );
  if (
    /stale document|stale policy|stale balance assignment|distinct patient administrator|existing balance document|another balance assignment/i.test(message)
  )
    throw new ApiError(
      "VERSION_CONFLICT",
      "O registro mudou ou precisa de outro administrador. Atualize o acompanhamento.",
      409,
    );
  if (/last global|last administrator/i.test(message))
    throw new ApiError(
      "LAST_GLOBAL_ADMIN",
      "Mantenha ao menos um administrador global ativo.",
      409,
    );
  if (/idempotency|different content|payload mismatch/i.test(message))
    throw new ApiError(
      "IDEMPOTENCY_CONFLICT",
      "A chave já foi utilizada com outro conteúdo. Inicie uma nova operação.",
      409,
    );
  if (
    /reference.*changed|stale|concurrent|recount|inventory conflict/i.test(
      message,
    )
  )
    throw new ApiError(
      "INVENTORY_CONFLICT",
      "O estoque mudou após a referência. Faça uma nova contagem antes de aprovar.",
      409,
    );
  if (/insufficient|negative balance/i.test(message))
    throw new ApiError(
      "INSUFFICIENT_STOCK",
      "O estoque disponível é insuficiente.",
      409,
    );
  if (
    error?.code === "42501" ||
    /not authorized|authorization|required permission|access denied/i.test(
      message,
    )
  )
    throw new ApiError(
      "FORBIDDEN",
      "Você não tem autorização para esta operação.",
      403,
    );
  if (/not found/i.test(message))
    throw new ApiError("NOT_FOUND", "Registro não encontrado.", 404);
  if (/expired|invalid invitation/i.test(message))
    throw new ApiError(
      "INVITATION_INVALID",
      "O convite é inválido, expirou ou foi revogado.",
      409,
    );
  if (/ambiguous|alias/i.test(message))
    throw new ApiError(
      "AMBIGUOUS_PRODUCT",
      "O nome ou apelido já identifica outro produto deste paciente.",
      409,
    );
  if (error?.code === "23505" || /duplicate/i.test(message))
    throw new ApiError("DUPLICATE", "Este registro já existe.", 409);
  if (
    error?.code?.startsWith("22") ||
    error?.code?.startsWith("23") ||
    error?.code === "P0001"
  )
    throw new ApiError(
      "INVALID_OPERATION",
      "A operação não é compatível com o estado atual. Revise os dados e as permissões.",
      400,
    );
  throw new ApiError(
    "DATABASE_UNAVAILABLE",
    "Não foi possível concluir a operação. Tente novamente.",
    503,
    true,
  );
}

export async function api(
  operation: string,
  action: () => Promise<Response>,
): Promise<Response> {
  const correlationId = randomUUID();
  try {
    const response = await action();
    response.headers.set("x-correlation-id", correlationId);
    response.headers.set("cache-control", "no-store");
    return response;
  } catch (error) {
    unstable_rethrow(error);
    const known =
      error instanceof ApiError
        ? error
        : new ApiError(
            "INTERNAL_ERROR",
            "Não foi possível concluir a operação.",
            500,
            true,
          );
    // Deliberately exclude payloads, identities, credentials and raw database errors.
    console.error(
      JSON.stringify({
        level: "error",
        operation,
        code: known.code,
        correlationId,
      }),
    );
    // Bounded best-effort persistence cannot change the original failure.
    await observeApiFailure(operation, known.code, known.status, correlationId).catch(() => undefined);
    const descriptor = errorCatalog[known.code];
    return NextResponse.json(
      {
        error: known.message,
        code: known.code,
        category: descriptor.category,
        recommendedAction: descriptor.recommendedAction,
        retryable: known.retryable,
        correlationId,
        ...(known.confirmedStage ? { confirmedStage: known.confirmedStage } : {}),
      },
      {
        status: known.status,
        headers: {
          "cache-control": "no-store",
          "x-correlation-id": correlationId,
        },
      },
    );
  }
}

export function validateMutationRequest(request: Request, requireJson = true) {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site")
    throw new ApiError(
      "INVALID_ORIGIN",
      "Origem da operação não autorizada.",
      403,
    );
  if (origin) {
    let sameOrigin = false;
    try {
      // Next may normalize the internal host behind its server/proxy. Compare
      // against the configured public origin, never an arbitrary forwarded host.
      sameOrigin = appOrigins(request).has(new URL(origin).origin);
    } catch {
      /* rejected below */
    }
    if (!sameOrigin)
      throw new ApiError(
        "INVALID_ORIGIN",
        "Origem da operação não autorizada.",
        403,
      );
  }
  if (
    requireJson &&
    request.headers
      .get("content-type")
      ?.split(";", 1)[0]
      .trim()
      .toLowerCase() !== "application/json"
  )
    throw new ApiError("JSON_REQUIRED", "Envie os dados em formato JSON.", 415);
}

export async function boundedText(request: Request, maxBytes: number) {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > maxBytes)
    throw new ApiError(
      "PAYLOAD_TOO_LARGE",
      "Dados acima do limite permitido.",
      413,
    );
  const reader = request.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel();
        throw new ApiError(
          "PAYLOAD_TOO_LARGE",
          "Dados acima do limite permitido.",
          413,
        );
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks).toString("utf8");
}

export async function readJson<T>(
  request: Request,
  schema: z.ZodType<T>,
  maxBytes = 256_000,
): Promise<T> {
  validateMutationRequest(request);
  const body = await boundedText(request, maxBytes);
  let json: unknown;
  try {
    json = JSON.parse(body, (_key, value, ...details: unknown[]) => {
      if (typeof value === "number") {
        const source = (details[0] as { source?: string } | undefined)?.source;
        // Node is pinned to 24. Compare the wire token before a rounded Number
        // can pass a schema or become an authoritative decimal quantity.
        if (!source || !Number.isFinite(value) || !quantity(source).eq(quantity(value)))
          throw new ApiError("VALIDATION_ERROR", "Um número enviado perde precisão. Revise o valor informado.");
      }
      return value;
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError("INVALID_JSON", "JSON inválido.");
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success)
    throw new ApiError(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Dados inválidos.",
    );
  return parsed.data;
}

export type AuthContext = {
  client: SupabaseClient;
  userId: string;
  fullName: string;
  isGlobalAdmin: boolean;
};
export async function authenticatedIdentity() {
  const client = await createSupabaseServerClient();
  if (!client)
    throw new ApiError("NOT_CONFIGURED", "Supabase não está configurado.", 503);
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user)
    throw new ApiError(
      "SESSION_EXPIRED",
      "Sua sessão expirou. Entre novamente.",
      401,
    );
  return { client, user };
}
export async function authenticate(): Promise<AuthContext> {
  const { client, user } = await authenticatedIdentity();
  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("full_name,status")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) databaseError(profileError);
  if (!profile || profile.status !== "active")
    throw new ApiError(
      "FORBIDDEN",
      "Seu acesso foi revogado ou ainda não foi ativado.",
      403,
    );
  if ((await rpc(client, "my_session_valid")) !== true)
    throw new ApiError(
      "SESSION_EXPIRED",
      "Sua sessão foi encerrada. Entre novamente.",
      401,
    );
  const { data: global, error: globalError } = await client.rpc(
    "is_global_administrator",
  );
  if (globalError) databaseError(globalError);
  return {
    client,
    userId: user.id,
    fullName: profile.full_name,
    isGlobalAdmin: global === true,
  };
}

export function requireGlobal(auth: AuthContext) {
  if (!auth.isGlobalAdmin)
    throw new ApiError(
      "FORBIDDEN",
      "A operação exige administração global.",
      403,
    );
}

export const uuid = z.string().uuid("Informe um identificador válido.");
export function parseUuid(value: unknown) {
  const parsed = uuid.safeParse(value);
  if (!parsed.success)
    throw new ApiError("VALIDATION_ERROR", "Identificador inválido.");
  return parsed.data;
}
export async function patientContext(
  auth: AuthContext,
  id: string | null | undefined,
  capability: string = "read",
  active = false,
) {
  if (!id || !uuid.safeParse(id).success)
    throw new ApiError("PATIENT_REQUIRED", "Selecione um paciente válido.");
  const { data: patient, error } = await auth.client
    .from("care_recipients")
    .select("id,display_name,is_active,is_development")
    .eq("id", id)
    .maybeSingle();
  if (error) databaseError(error);
  if (!patient)
    throw new ApiError(
      "NOT_FOUND",
      "Paciente não encontrado ou acesso não autorizado.",
      404,
    );
  let role: string;
  {
    const { data: member, error: memberError } = await auth.client
      .from("care_recipient_memberships")
      .select("role,status,can_manage_stock,can_count_stock")
      .eq("care_recipient_id", id)
      .eq("user_id", auth.userId)
      .eq("status", "active")
      .maybeSingle();
    if (memberError) databaseError(memberError);
    if (!member)
      throw new ApiError(
        "FORBIDDEN",
        "Você não tem acesso ativo a este paciente.",
        403,
      );
    role = member.role;
  }
  const selected = (await rpc(auth.client, "my_active_context")) as {
    mode?: string;
    care_recipient_id?: string;
  } | null;
  if (selected?.mode !== "patient" || selected.care_recipient_id !== id)
    throw new ApiError(
      "CONTEXT_REQUIRED",
      "Selecione seu vínculo com este paciente em Mudar perfil.",
      409,
    );
  const capabilities = (await rpc(auth.client, "patient_capabilities", {
    p_patient: id,
  })) as Record<string, boolean>;
  const permissions = {
    canManage: capabilities["access.manage"] === true,
    canRequest: capabilities["req.create"] === true,
    canManageStock: capabilities["stock.family.manage"] === true,
    canCountStock: capabilities["bal.count"] === true,
  };
  const aliases: Record<string, string> = {
    request: "req.create",
    manage: "access.manage",
    manageStock: "stock.family.manage",
    countStock: "bal.count",
  };
  const permitted =
    capability === "read" ||
    capabilities[aliases[capability] ?? capability] === true;
  if (!permitted)
    throw new ApiError(
      "FORBIDDEN",
      "Você não tem autorização para esta operação.",
      403,
    );
  if (active && !patient.is_active)
    throw new ApiError(
      "PATIENT_INACTIVE",
      "O paciente está inativo. O histórico permanece disponível.",
      409,
    );
  return { ...patient, role, permissions, capabilities };
}

export async function rpc(
  client: SupabaseClient,
  name: string,
  args?: Record<string, unknown>,
) {
  const { data, error } = await client.rpc(name, args);
  if (error) databaseError(error);
  return data;
}

export function pageParameters(params: URLSearchParams) {
  const page = Math.max(
    1,
    Math.min(100_000, Number.parseInt(params.get("page") ?? "1", 10) || 1),
  );
  const pageSize = Math.min(
    100,
    Math.max(1, Number.parseInt(params.get("pageSize") ?? "20", 10) || 20),
  );
  return {
    page,
    pageSize,
    start: (page - 1) * pageSize,
    end: page * pageSize - 1,
  };
}

/** Validate request query input before reading; result validation has its own boundary. */
export function parseQuery<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new ApiError("VALIDATION_ERROR", "Revise os filtros e os limites desta consulta.", 400);
  return parsed.data;
}

/** First instant of a São Paulo calendar day, including historical DST changes. */
export function saoPauloDateBoundary(value: string, nextDay = false) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new ApiError("INVALID_DATE", "Informe uma data válida.");
  const date = new Date(`${value}T00:00:00.000Z`);
  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  )
    throw new ApiError("INVALID_DATE", "Informe uma data válida.");
  if (nextDay) date.setUTCDate(date.getUTCDate() + 1);
  const target = date.toISOString().slice(0, 10);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  function localDate(instant: number) {
    const parts = formatter.formatToParts(instant);
    return ["year", "month", "day"]
      .map((type) => parts.find((part) => part.type === type)!.value)
      .join("-");
  }
  let before = date.getTime() - 12 * 3_600_000;
  let after = date.getTime() + 18 * 3_600_000;
  while (after - before > 1) {
    const middle = Math.floor((before + after) / 2);
    if (localDate(middle) < target) before = middle;
    else after = middle;
  }
  return new Date(after).toISOString();
}
