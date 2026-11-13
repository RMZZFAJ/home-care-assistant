import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { rpc, ApiError } from "./api";
import { pushSubscription, pushTestReceipt } from "@/lib/push/subscription";
import type { PushTransport } from "./web-push";

/** The authenticated reservation owns the target; only the server receives transport keys. */
export async function sendPersonalPushTest(
  client: SupabaseClient,
  service: SupabaseClient,
  userId: string,
  input: { deviceId: string; idempotencyKey: string },
  provider: PushTransport,
) {
  const args = { p_device: input.deviceId, p_key: input.idempotencyKey, p_key_version: provider.keyVersion };
  const receipt = pushTestReceipt.parse(await rpc(client, "request_my_web_push_test", args));
  if (receipt.state !== "pending") return receipt;
  const token = crypto.randomUUID();
  const payload = await rpc(service, "prepare_web_push_test", {
    p_id: receipt.id, p_user: userId, p_token: token, p_key_version: provider.keyVersion,
  });
  if (!payload) return pushTestReceipt.parse(await rpc(client, "request_my_web_push_test", args));
  const prepared = z.object({ id: z.literal(receipt.id), subscription: pushSubscription }).strict().parse(payload);
  let result;
  try { result = await provider.send(prepared.subscription, prepared.id, "test"); }
  catch { result = { state: "uncertain" as const, code: "PUSH_RESULT_UNCERTAIN" }; }
  try {
    await rpc(service, "complete_web_push_test", {
      p_id: receipt.id, p_token: token, p_result: result.state, p_error: result.code ?? null,
    });
  } catch {
    throw new ApiError("PUSH_RESULT_UNCONFIRMED", "O resultado do teste ainda não foi confirmado. Consulte a mesma tentativa; ela não será reenviada automaticamente.", 503, true);
  }
  return pushTestReceipt.parse(await rpc(client, "request_my_web_push_test", args));
}
