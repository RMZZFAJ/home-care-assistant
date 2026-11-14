import { randomUUID } from "node:crypto";
import { expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendPersonalPushTest } from "@/lib/server/web-push-test";
import type { PushResult, PushTransport } from "@/lib/server/web-push";

function fixture() {
  const id = randomUUID(), userId = randomUUID();
  let state = "pending", completionFails = false, unavailable = false;
  const value = () => ({ id, state, requestedAt: "2026-11-12T20:00:00+00:00", code: null });
  const subscription = { endpoint: "https://fcm.googleapis.com/wp/synthetic-test", expirationTime: null, keys: { p256dh: "B" + "A".repeat(86), auth: "A".repeat(22) } };
  const client = { rpc: vi.fn(async () => ({ data: value(), error: null })) };
  const service = { rpc: vi.fn(async (name: string, args: Record<string, unknown>) => {
    if (name === "prepare_web_push_test") {
      if (unavailable) { state = "expired"; return { data: null, error: null }; }
      if (state !== "pending") return { data: null, error: null };
      state = "processing";
      return { data: { id, subscription }, error: null };
    }
    if (completionFails) return { data: null, error: { code: "08006", message: "Controlled database disconnect" } };
    state = args.p_result === "pending" ? "failed" : String(args.p_result);
    return { data: state, error: null };
  }) };
  const send = vi.fn(async (): Promise<PushResult> => ({ state: "accepted" }));
  const provider: PushTransport = { keyVersion: "test-v1", send };
  const input = { deviceId: randomUUID(), idempotencyKey: randomUUID() };
  const run = () => sendPersonalPushTest(client as unknown as SupabaseClient, service as unknown as SupabaseClient, userId, input, provider);
  return { id, subscription, send, run, unavailable: () => { unavailable = true; }, failCompletion: () => { completionFails = true; } };
}

it("sends the dedicated test once and returns only its safe persisted receipt", async () => {
  const f = fixture();
  expect(await f.run()).toMatchObject({ id: f.id, state: "accepted" });
  expect(await f.run()).toMatchObject({ id: f.id, state: "accepted" });
  expect(f.send).toHaveBeenCalledExactlyOnceWith(f.subscription, f.id, "test");
});
it("does not send twice when concurrent requests compete for the same diagnostic", async () => {
  const f = fixture(), result = await Promise.all([f.run(), f.run()]);
  expect(result.some(row => row.state === "accepted")).toBe(true);
  expect(f.send).toHaveBeenCalledTimes(1);
});
it("does not send after the final device/session check refuses transport", async () => {
  const f = fixture(); f.unavailable();
  expect((await f.run()).state).toBe("expired"); expect(f.send).not.toHaveBeenCalled();
});
it("persists an uncertain provider result and never automatically replays it", async () => {
  const f = fixture(); f.send.mockRejectedValue(new TypeError("Network unavailable"));
  expect((await f.run()).state).toBe("uncertain");
  expect((await f.run()).state).toBe("uncertain"); expect(f.send).toHaveBeenCalledTimes(1);
});
it("reports an unconfirmed database completion without inventing acceptance or replaying the send", async () => {
  const f = fixture(); f.failCompletion();
  await expect(f.run()).rejects.toMatchObject({ code: "PUSH_RESULT_UNCONFIRMED", status: 503 });
  expect((await f.run()).state).toBe("processing"); expect(f.send).toHaveBeenCalledTimes(1);
});
