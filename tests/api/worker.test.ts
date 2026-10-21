import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { processNotifications } from "@/lib/notifications/worker";
import type { NotificationJob, NotificationProvider } from "@/lib/notifications/provider";

const job: NotificationJob = { id: "10000000-0000-4000-8000-000000000001", channel: "whatsapp", destination: "+5511999999999", requisition_id: "20000000-0000-4000-8000-000000000001" };
function fixture(valid = true, completionError = false, currentState: string | null = "delivered", stateError = false) {
  const calls = vi.fn(async (name: string) => {
    if (name === "claim_notification_jobs") return { data: [job], error: null };
    if (name === "validate_notification_job") return { data: valid, error: null };
    if (name === "notification_job_state") return { data: currentState, error: stateError ? { message: "state unavailable" } : null };
    return { data: null, error: completionError ? { message: "notification lease lost" } : null };
  });
  const from = vi.fn(() => { throw new Error("The worker must not query private tables directly."); });
  return { client: { rpc: calls, from } as unknown as SupabaseClient, calls, from };
}

describe("durable notification worker", () => {
  it("checks current authorization immediately before sending a claimed job", async () => {
    const { client, calls } = fixture(false);
    const provider: NotificationProvider = { send: vi.fn<NotificationProvider["send"]>(async () => ({ state: "accepted" })) };
    expect(await processNotifications(client, 25, provider)).toMatchObject({ claimed: 1, skipped: 1, accepted: 0 });
    expect(provider.send).not.toHaveBeenCalled();
    expect(calls.mock.calls.map(([name]) => name)).toEqual(["claim_notification_jobs", "validate_notification_job"]);
  });
  it("persists an uncertain transport result and does not retry the send", async () => {
    const { client, calls } = fixture();
    const provider: NotificationProvider = { send: vi.fn<NotificationProvider["send"]>(async () => ({ state: "uncertain", error: "PROVIDER_RESULT_UNCERTAIN" })) };
    expect(await processNotifications(client, 25, provider)).toMatchObject({ uncertain: 1, accepted: 0 });
    expect(provider.send).toHaveBeenCalledTimes(1);
    expect(calls).toHaveBeenLastCalledWith("complete_notification_job", expect.objectContaining({ p_state: "uncertain", p_provider_reference: null }));
  });
  it("preserves a webhook result that raced completion of the HTTP send", async () => {
    const { client, calls, from } = fixture(true, true);
    const provider: NotificationProvider = { send: vi.fn<NotificationProvider["send"]>(async () => ({ state: "accepted", providerReference: "wamid.fixture" })) };
    expect(await processNotifications(client, 25, provider)).toMatchObject({ skipped: 1, accepted: 0 });
    expect(provider.send).toHaveBeenCalledTimes(1);
    expect(calls).toHaveBeenLastCalledWith("notification_job_state", { p_id: job.id });
    expect(from).not.toHaveBeenCalled();
  });
  it("reports an unconfirmed result when reconciliation cannot prove completion", async () => {
    for (const [state, error] of [["processing", false], [null, false], ["delivered", true]] as const) {
      const { client } = fixture(true, true, state, error);
      const provider: NotificationProvider = { send: vi.fn<NotificationProvider["send"]>(async () => ({ state: "accepted" })) };
      await expect(processNotifications(client, 25, provider)).rejects.toMatchObject({ code: "NOTIFICATION_RESULT_UNCONFIRMED" });
      expect(provider.send).toHaveBeenCalledTimes(1);
    }
  });
});
