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

export async function api<T>(
  url: string,
  payload?: unknown,
  signal?: AbortSignal,
  method = "POST",
): Promise<T> {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener("abort", cancel, { once: true });
  const timeout = setTimeout(cancel, 30_000);
  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
      ...(payload === undefined
        ? {}
        : {
            method,
            headers: { "content-type": "application/json" },
            body: JSON.stringify(payload),
          }),
    });
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new Error(
        "O serviço não retornou uma resposta válida. Tente novamente.",
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
      throw new Error(
        "A conexão excedeu o tempo de espera. Recupere a mesma tentativa para confirmar o resultado.",
        { cause: error },
      );
    throw error;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", cancel);
  }
}

