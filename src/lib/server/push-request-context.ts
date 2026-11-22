import { createHash } from "node:crypto";
import { z } from "zod";
import { ApiError, type AuthContext } from "./api";
import { webPushConfiguration, type WebPushConfiguration } from "./web-push";

type Configuration = Pick<WebPushConfiguration, "keyVersion" | "publicKey"> | null;
export function readablePushConfiguration() {
  try { return webPushConfiguration(); } catch { return null; }
}
/** A concurrency reference, never a credential or authorization grant. */
export async function pushRequestContext(auth: Pick<AuthContext, "client" | "userId">, configuration: Configuration) {
  const { data, error } = await auth.client.auth.getClaims();
  const session = z.uuid().safeParse(data?.claims.session_id);
  if (error || data?.claims.sub !== auth.userId || !session.success)
    throw new ApiError("SESSION_EXPIRED", "Sua sessão mudou ou expirou. Entre novamente antes de confirmar os avisos.", 401);
  return createHash("sha256").update(JSON.stringify([
    "hca-push-context-v1", auth.userId, session.data,
    configuration?.keyVersion ?? null, configuration?.publicKey ?? null,
  ])).digest("hex");
}
export async function requirePushRequestContext(auth: Pick<AuthContext, "client" | "userId">, reference: string | undefined, configuration: Configuration) {
  if (!reference || reference !== await pushRequestContext(auth, configuration))
    throw new ApiError("VERSION_CONFLICT", "A conta, sessão ou configuração dos avisos mudou. Atualize esta página e confirme sua escolha novamente.", 409);
}
