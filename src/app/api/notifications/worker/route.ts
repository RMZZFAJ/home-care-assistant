import { NextResponse } from "next/server";
import { api, ApiError, rpc } from "@/lib/server/api";
import { createWorkerClient } from "@/lib/server/service-client";
import { secretMatches } from "@/lib/notifications/webhook";
import { processNotifications } from "@/lib/notifications/worker";
import { processWebPush } from "@/lib/server/web-push";
import { observeHeartbeat } from "@/lib/server/operations-observer";
import { processInitialDocumentPdfs } from "@/lib/server/initial-document-issuance";
import { processScheduledDocumentArchives } from "@/lib/server/pdf-issuance";
import { configuredAppOrigin } from "@/lib/server/app-origin";

export const maxDuration = 120;
export async function POST(request: Request) {
  return api("notification.worker", async () => {
    if (
      !secretMatches(
        request.headers.get("authorization"),
        process.env.NOTIFICATIONS_WORKER_SECRET
          ? `Bearer ${process.env.NOTIFICATIONS_WORKER_SECRET}`
          : undefined,
      )
    )
      throw new ApiError("FORBIDDEN", "Processamento não autorizado.", 403);
    const client = createWorkerClient();
    const [schedule] = await Promise.allSettled([rpc(client, "run_operational_schedule")]);
    const [notifications, push] = await Promise.allSettled([processNotifications(client), processWebPush(client)]);
    const origin = configuredAppOrigin();
    const [initialPdfs, documentArchives] = await Promise.allSettled([
      processInitialDocumentPdfs(client, origin),
      processScheduledDocumentArchives(client, origin),
    ]);
    if (schedule.status === "rejected") throw schedule.reason;
    if (notifications.status === "rejected") throw notifications.reason;
    if (push.status === "rejected") throw push.reason;
    if (initialPdfs.status === "rejected") throw initialPdfs.reason;
    if (documentArchives.status === "rejected") throw documentArchives.reason;
    const operationsObservation = await observeHeartbeat(client, "worker");
    return NextResponse.json({
      data: notifications.value,
      webPush: push.value,
      initialPdfs: initialPdfs.value,
      documentArchives: documentArchives.value,
      schedule: schedule.value,
      operationsObservation,
    });
  });
}
