import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { unstable_rethrow } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { appOrigins } from "@/lib/server/app-origin";
import { errorCatalog, type ErrorCode } from "@/lib/server/error-catalog";

export class ApiError extends Error {
  constructor(public code: ErrorCode, message: string, public status: number = errorCatalog[code].status, public retryable: boolean = errorCatalog[code].retryable) { super(message); }
}

export function databaseError(error: { code?: string; message?: string } | null): never {
  const message = error?.message ?? "";
  if (/last global|last administrator/i.test(message)) throw new ApiError("LAST_GLOBAL_ADMIN", "Mantenha ao menos um administrador global ativo.", 409);
  if (/idempotency|different content|payload mismatch/i.test(message)) throw new ApiError("IDEMPOTENCY_CONFLICT", "A chave já foi utilizada com outro conteúdo. Inicie uma nova operação.", 409);
  if (/reference.*changed|stale|concurrent|recount|inventory conflict/i.test(message)) throw new ApiError("INVENTORY_CONFLICT", "O estoque mudou após a referência. Faça uma nova contagem antes de aprovar.", 409);
  if (/insufficient|negative balance/i.test(message)) throw new ApiError("INSUFFICIENT_STOCK", "O estoque disponível é insuficiente.", 409);
  if (error?.code === "42501" || /not authorized|authorization|required permission|access denied/i.test(message)) throw new ApiError("FORBIDDEN", "Você não tem autorização para esta operação.", 403);
  if (/not found/i.test(message)) throw new ApiError("NOT_FOUND", "Registro não encontrado.", 404);
  if (/expired|invalid invitation/i.test(message)) throw new ApiError("INVITATION_INVALID", "O convite é inválido, expirou ou foi revogado.", 409);
  if (/ambiguous|alias/i.test(message)) throw new ApiError("AMBIGUOUS_PRODUCT", "O nome ou apelido já identifica outro produto deste paciente.", 409);
  if (error?.code === "23505" || /duplicate/i.test(message)) throw new ApiError("DUPLICATE", "Este registro já existe.", 409);
  if (error?.code?.startsWith("22") || error?.code?.startsWith("23") || error?.code === "P0001") throw new ApiError("INVALID_OPERATION", "A operação não é compatível com o estado atual. Revise os dados e as permissões.", 400);
  throw new ApiError("DATABASE_UNAVAILABLE", "Não foi possível concluir a operação. Tente novamente.", 503, true);
}

export async function api(operation: string, action: () => Promise<Response>): Promise<Response> {
  const correlationId = randomUUID();
  try {
    const response = await action();
    response.headers.set("x-correlation-id", correlationId);
    response.headers.set("cache-control", "no-store");
    return response;
  } catch (error) {
    unstable_rethrow(error);
    const known = error instanceof ApiError ? error : new ApiError("INTERNAL_ERROR", "Não foi possível concluir a operação.", 500, true);
    // Deliberately exclude payloads, identities, credentials and raw database errors.
    console.error(JSON.stringify({ level: "error", operation, code: known.code, correlationId }));
    const descriptor = errorCatalog[known.code];
    return NextResponse.json({ error: known.message, code: known.code, category: descriptor.category, recommendedAction: descriptor.recommendedAction, retryable: known.retryable, correlationId }, { status: known.status, headers: { "cache-control": "no-store", "x-correlation-id": correlationId } });
  }
}

export function validateMutationRequest(request: Request) {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") throw new ApiError("INVALID_ORIGIN", "Origem da operação não autorizada.", 403);
  if (origin) {
    let sameOrigin = false;
    try {
      // Next may normalize the internal host behind its server/proxy. Compare
      // against the configured public origin, never an arbitrary forwarded host.
      sameOrigin = appOrigins(request).has(new URL(origin).origin);
    } catch { /* rejected below */ }
    if (!sameOrigin) throw new ApiError("INVALID_ORIGIN", "Origem da operação não autorizada.", 403);
  }
  if (request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() !== "application/json") throw new ApiError("JSON_REQUIRED", "Envie os dados em formato JSON.", 415);
}

export async function boundedText(request: Request, maxBytes: number) {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > maxBytes) throw new ApiError("PAYLOAD_TOO_LARGE", "Dados acima do limite permitido.", 413);
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
        throw new ApiError("PAYLOAD_TOO_LARGE", "Dados acima do limite permitido.", 413);
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks).toString("utf8");
}

export async function readJson<T>(request: Request, schema: z.ZodType<T>, maxBytes = 256_000): Promise<T> {
  validateMutationRequest(request);
  const body = await boundedText(request, maxBytes);
  let json: unknown;
  try { json = JSON.parse(body); } catch { throw new ApiError("INVALID_JSON", "JSON inválido."); }
  const parsed = schema.safeParse(json);
  if (!parsed.success) throw new ApiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Dados inválidos.");
  return parsed.data;
}

export type AuthContext = { client: SupabaseClient; userId: string; fullName: string; isGlobalAdmin: boolean };
export async function authenticatedIdentity() {
  const client = await createSupabaseServerClient();
  if (!client) throw new ApiError("NOT_CONFIGURED", "Supabase não está configurado.", 503);
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) throw new ApiError("SESSION_EXPIRED", "Sua sessão expirou. Entre novamente.", 401);
  return { client, user };
}
export async function authenticate(): Promise<AuthContext> {
  const { client, user } = await authenticatedIdentity();
  const { data: profile, error: profileError } = await client.from("profiles").select("full_name,status").eq("id", user.id).maybeSingle();
  if (profileError) databaseError(profileError);
  if (!profile || profile.status !== "active") throw new ApiError("FORBIDDEN", "Seu acesso foi revogado ou ainda não foi ativado.", 403);
  const { data: global, error: globalError } = await client.rpc("is_global_administrator");
  if (globalError) databaseError(globalError);
  return { client, userId: user.id, fullName: profile.full_name, isGlobalAdmin: global === true };
}

export function requireGlobal(auth: AuthContext) {
  if (!auth.isGlobalAdmin) throw new ApiError("FORBIDDEN", "A operação exige administração global.", 403);
}

export const uuid = z.string().uuid("Informe um identificador válido.");
export async function patientContext(auth: AuthContext, id: string | null | undefined, capability: "read" | "request" | "manage" | "manageStock" | "countStock" = "read", active = false) {
  if (!id || !uuid.safeParse(id).success) throw new ApiError("PATIENT_REQUIRED", "Selecione um paciente válido.");
  const { data: patient, error } = await auth.client.from("care_recipients").select("id,display_name,is_active,is_development").eq("id", id).maybeSingle();
  if (error) databaseError(error);
  if (!patient) throw new ApiError("NOT_FOUND", "Paciente não encontrado ou acesso não autorizado.", 404);
  let role = "admin";
  let manageStock = auth.isGlobalAdmin;
  let countStock = auth.isGlobalAdmin;
  if (!auth.isGlobalAdmin) {
    const { data: member, error: memberError } = await auth.client.from("care_recipient_memberships").select("role,status,can_manage_stock,can_count_stock").eq("care_recipient_id", id).eq("user_id", auth.userId).eq("status", "active").maybeSingle();
    if (memberError) databaseError(memberError);
    if (!member) throw new ApiError("FORBIDDEN", "Você não tem acesso ativo a este paciente.", 403);
    role = member.role;
    manageStock = role === "admin";
    countStock = role === "admin" || (["supervisor", "professional"].includes(role) && member.can_count_stock);
  }
  const permissions = { canManage: role === "admin", canRequest: ["admin", "supervisor", "professional"].includes(role), canManageStock: manageStock, canCountStock: countStock };
  const permitted = capability === "read" || (capability === "manage" ? permissions.canManage : capability === "request" ? permissions.canRequest : capability === "manageStock" ? permissions.canManageStock : permissions.canCountStock);
  if (!permitted) throw new ApiError("FORBIDDEN", "Você não tem autorização para esta operação.", 403);
  if (active && !patient.is_active) throw new ApiError("PATIENT_INACTIVE", "O paciente está inativo. O histórico permanece disponível.", 409);
  return { ...patient, role, permissions };
}

export async function rpc(client: SupabaseClient, name: string, args?: Record<string, unknown>) {
  const { data, error } = await client.rpc(name, args);
  if (error) databaseError(error);
  return data;
}

export function pageParameters(params: URLSearchParams) {
  const page = Math.max(1, Math.min(100_000, Number.parseInt(params.get("page") ?? "1", 10) || 1));
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(params.get("pageSize") ?? "20", 10) || 20));
  return { page, pageSize, start: (page - 1) * pageSize, end: page * pageSize - 1 };
}

/** First instant of a São Paulo calendar day, including historical DST changes. */
export function saoPauloDateBoundary(value: string, nextDay = false) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new ApiError("INVALID_DATE", "Informe uma data válida.");
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new ApiError("INVALID_DATE", "Informe uma data válida.");
  if (nextDay) date.setUTCDate(date.getUTCDate() + 1);
  const target = date.toISOString().slice(0, 10);
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" });
  function localDate(instant: number) {
    const parts = formatter.formatToParts(instant);
    return ["year", "month", "day"].map((type) => parts.find((part) => part.type === type)!.value).join("-");
  }
  let before = date.getTime() - 12 * 3_600_000;
  let after = date.getTime() + 18 * 3_600_000;
  while (after - before > 1) {
    const middle = Math.floor((before + after) / 2);
    if (localDate(middle) < target) before = middle; else after = middle;
  }
  return new Date(after).toISOString();
}
