export function errorMessage(body: unknown, fallback: string) {
  if (!body || typeof body !== "object") return fallback;
  const value = body as { error?: unknown; correlationId?: string };
  const error =
    typeof value.error === "string"
      ? value.error
      : value.error &&
          typeof value.error === "object" &&
          "message" in value.error
        ? String(value.error.message)
        : fallback;
  return value.correlationId
    ? `${error} Referência: ${value.correlationId}`
    : error;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// Availability preflight only. Server Auth/RPCs remain the authorization source.
// Browser-only state is never populated by SSR or treated as a permission grant.
let runtimeCommandsAvailable: boolean | undefined;
export function setRuntimeCommandsAvailable(available: boolean | undefined) {
  if (typeof window !== "undefined") runtimeCommandsAvailable = available;
}
export function requireRuntimeCommandsAvailable() {
  if (typeof window !== "undefined" && runtimeCommandsAvailable === false)
    throw new ApiError("A ação não foi enviada. Aguarde conexão e versão compatíveis antes de tentar novamente. Seus campos foram preservados.", 400, "CLIENT_RUNTIME_BLOCKED");
}

type RequestKind = "read" | "command";
export class TransportError extends ApiError {
  readonly outcome: "read_failed" | "uncertain";
  constructor(message: string, public requestKind: RequestKind, code: string, cause: unknown) {
    // A transport/decoding failure is not a proven HTTP rejection. In particular,
    // consumers must not clear a command merely because a malformed body had 4xx.
    super(message, 0, code);
    this.name = "TransportError";
    this.outcome = requestKind === "read" ? "read_failed" : "uncertain";
    this.cause = cause;
  }
}

export async function api<T>(
  url: string,
  payload?: unknown,
  signal?: AbortSignal,
  method?: string,
): Promise<T> {
  const requestMethod = method?.toUpperCase() ?? (payload === undefined ? "GET" : "POST");
  const requestKind: RequestKind = ["GET", "HEAD", "OPTIONS"].includes(requestMethod) ? "read" : "command";
  if (requestKind === "command") requireRuntimeCommandsAvailable();
  const controller = new AbortController();
  const cancel = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener("abort", cancel, { once: true });
  const timeout = setTimeout(cancel, 30_000);
  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
      method: requestMethod,
      ...(payload === undefined
        ? {}
        : {
            headers: { "content-type": "application/json" },
            body: JSON.stringify(payload),
          }),
    });
    let body: unknown;
    try {
      body = await response.json();
    } catch (cause) {
      throw new TransportError(
        requestKind === "read"
          ? "Não foi possível ler a resposta desta consulta. Atualize esta seção."
          : "A resposta desta ação não pôde ser confirmada. Recupere a mesma tentativa para verificar o resultado.",
        requestKind,
        "INVALID_RESPONSE",
        cause,
      );
    }
    if (!response.ok)
      throw new ApiError(
        errorMessage(
          body,
          response.status === 401
            ? "Sua sessão expirou. Entre novamente."
            : "Não foi possível concluir a operação.",
        ),
        response.status,
        body && typeof body === "object" && "code" in body
          ? String(body.code)
          : undefined,
      );
    return body as T;
  } catch (error) {
    if (controller.signal.aborted && !signal?.aborted)
      throw new TransportError(
        requestKind === "read"
          ? "A consulta excedeu o tempo de espera. Atualize esta seção para consultar novamente."
          : "A conexão excedeu o tempo de espera. Recupere a mesma tentativa para confirmar o resultado.",
        requestKind,
        "CONNECTION_TIMEOUT",
        error,
      );
    if (signal?.aborted)
      throw new TransportError(
        requestKind === "read"
          ? "A consulta foi interrompida."
          : "A espera desta ação foi interrompida. Recupere a mesma tentativa para verificar o resultado.",
        requestKind,
        "REQUEST_ABORTED",
        error,
      );
    if (error instanceof TypeError && /fetch|network|load failed/i.test(error.message))
      throw new TransportError(
        requestKind === "read"
          ? "Não foi possível consultar esta seção. Verifique a conexão e tente consultar novamente."
          : "Não foi possível confirmar a resposta. Recupere a mesma tentativa para verificar o resultado.",
        requestKind,
        "CONNECTION_LOST",
        error,
      );
    throw error;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", cancel);
  }
}

