import { NextResponse } from "next/server";
import { z } from "zod";
import {
  api,
  ApiError,
  authenticate,
  databaseError,
  pageParameters,
  patientContext,
  readJson,
  requireGlobal,
  rpc,
  uuid,
} from "@/lib/server/api";
import { deliveryErrorLabels } from "@/lib/notifications/presentation";
import { createWorkerClient } from "@/lib/server/service-client";
import { processNotifications } from "@/lib/notifications/worker";

export const maxDuration = 120;
const schema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("process"),
      limit: z.number().int().min(1).max(50).default(25),
    })
    .strict(),
  z
    .object({
      action: z.literal("retry"),
      careRecipientId: uuid,
      notificationId: uuid,
      confirmUncertain: z.boolean().default(false),
    })
    .strict(),
]);
export async function GET(request: Request) {
  return api("notifications.list", async () => {
    const auth = await authenticate();
    const params = new URL(request.url).searchParams;
    const patient = await patientContext(
      auth,
      params.get("careRecipientId"),
      "manage",
    );
    const { page, pageSize, start, end } = pageParameters(params);
    const { data, error, count } = await auth.client
      .from("requisition_notifications")
      .select(
        "id,care_recipient_id,requisition_id,alert_event_id,recipient_user_id,recipient_group,recipient_label,channel,state,attempts,attempted_at,created_at,delivered_at,read_at,last_error",
        { count: "exact" },
      )
      .eq("care_recipient_id", patient.id)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(start, end);
    if (error) databaseError(error);
    return NextResponse.json({
      data: (data ?? []).map((item) => ({
        ...item,
        last_error: item.last_error
          ? (deliveryErrorLabels[item.last_error] ??
            deliveryErrorLabels.PROCESSING_FAILED)
          : null,
      })),
      page,
      pageSize,
      total: count ?? 0,
    });
  });
}
export async function POST(request: Request) {
  return api("notifications.manage", async () => {
    const input = await readJson(request, schema);
    const auth = await authenticate();
    if (input.action === "process") {
      requireGlobal(auth);
      return NextResponse.json({
        data: await processNotifications(createWorkerClient(), input.limit),
      });
    }
    await patientContext(auth, input.careRecipientId, "manage");
    const { data, error } = await auth.client
      .from("requisition_notifications")
      .select("id,state")
      .eq("id", input.notificationId)
      .eq("care_recipient_id", input.careRecipientId)
      .maybeSingle();
    if (error) databaseError(error);
    if (!data)
      throw new ApiError("NOT_FOUND", "Notificação não encontrada.", 404);
    if (data.state === "uncertain" && !input.confirmUncertain)
      throw new ApiError(
        "RECONCILIATION_REQUIRED",
        "Confira o resultado no provedor. Uma nova tentativa de resultado incerto pode duplicar a mensagem e exige confirmação explícita.",
        409,
      );
    return NextResponse.json({
      data: await rpc(auth.client, "retry_notification_job", {
        p_id: input.notificationId,
        p_confirm_uncertain: input.confirmUncertain,
      }),
    });
  });
}
