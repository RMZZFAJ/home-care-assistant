import { NextResponse } from "next/server";
import { api, ApiError, rpc } from "@/lib/server/api";
import { createWorkerClient } from "@/lib/server/service-client";
import { secretMatches } from "@/lib/notifications/webhook";
import { processNotifications } from "@/lib/notifications/worker";
import { processWebPush } from "@/lib/server/web-push";

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
    const schedule = await rpc(client, "run_operational_schedule");
    const data = await processNotifications(client);
    return NextResponse.json({
      data,
      webPush: await processWebPush(client),
      schedule,
    });
  });
}
