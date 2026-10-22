import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError, databaseError } from "@/lib/server/api";
import {
  metaConfiguration,
  MetaWhatsAppProvider,
  type NotificationJob,
  type NotificationProvider,
} from "@/lib/notifications/provider";
import { prepareDocumentNotification } from "@/lib/notifications/document-notification";

export async function processNotifications(
  client: SupabaseClient,
  limit = 25,
  provider?: NotificationProvider,
) {
  const config = metaConfiguration();
  const external =
    provider ?? (config ? new MetaWhatsAppProvider(config) : null);
  const workerId = randomUUID();
  const { data, error } = await client.rpc("claim_notification_jobs", {
    p_limit: Math.min(50, Math.max(1, limit)),
    p_worker_id: workerId,
    p_external_enabled: external !== null,
  });
  if (error) databaseError(error);
  const jobs = (data ?? []) as NotificationJob[];
  const counts: Record<string, number> = {
    claimed: jobs.length,
    skipped: 0,
    delivered: 0,
    accepted: 0,
    pending: 0,
    failed: 0,
    uncertain: 0,
  };
  let unconfirmed = 0;
  async function process(job: NotificationJob) {
    const { data: valid, error: validationError } = await client.rpc(
      "validate_notification_job",
      { p_id: job.id, p_worker_id: workerId },
    );
    if (validationError) {
      unconfirmed++;
      return;
    }
    if (!valid) {
      counts.skipped++;
      return;
    }
    let result;
    try {
      result =
        job.channel === "internal"
          ? { state: "delivered" as const }
          : job.channel === "whatsapp" && external
            ? await external.send(
                await prepareDocumentNotification(client, job, workerId),
              )
            : { state: "pending" as const, error: "CHANNEL_NOT_CONFIGURED" };
    } catch {
      result = {
        state: "pending" as const,
        error: "DOCUMENT_PREPARATION_FAILED",
      };
    }
    const { error: completionError } = await client.rpc(
      "complete_notification_job",
      {
        p_id: job.id,
        p_worker_id: workerId,
        p_state: result.state,
        p_provider_reference:
          "providerReference" in result
            ? (result.providerReference ?? null)
            : null,
        p_error: "error" in result ? (result.error ?? null) : null,
      },
    );
    if (completionError) {
      // A signed webhook or revocation may finish a job while its HTTP send is
      // still returning. Never overwrite that newer result or resend it.
      const { data: current, error: currentError } = await client.rpc(
        "notification_job_state",
        { p_id: job.id },
      );
      if (
        !currentError &&
        typeof current === "string" &&
        [
          "accepted",
          "delivered",
          "read",
          "uncertain",
          "cancelled",
          "failed",
        ].includes(current)
      ) {
        counts.skipped++;
        return;
      }
      unconfirmed++;
      return;
    }
    counts[result.state]++;
  }
  // A batch of at most 50 jobs finishes within the two-minute lease even when
  // every external request reaches its 15-second timeout.
  for (let offset = 0; offset < jobs.length; offset += 10)
    await Promise.all(jobs.slice(offset, offset + 10).map(process));
  if (unconfirmed)
    throw new ApiError(
      "NOTIFICATION_RESULT_UNCONFIRMED",
      "Parte do processamento não pôde ser confirmada. Consulte os estados persistidos antes de tentar novamente.",
      503,
      true,
    );
  return { ...counts, externalConfigured: external !== null };
}
