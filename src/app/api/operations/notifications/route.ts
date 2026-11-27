import { NextResponse } from "next/server";
import { z } from "zod";
import { api, ApiError, authenticate, parseQuery, requireGlobal, rpc } from "@/lib/server/api";
import { technicalNotificationSource, technicalNotifications } from "@/lib/operations/notification-attempts";

const query = z.object({ source: technicalNotificationSource, page: z.coerce.number().int().min(1).max(100000).default(1) }).strict();
export async function GET(request: Request) {
  return api("operations.notifications.read", async () => {
    const auth = await authenticate();
    requireGlobal(auth);
    const params = new URL(request.url).searchParams;
    if (Array.from(params.keys()).some(key => params.getAll(key).length > 1))
      throw new ApiError("VALIDATION_ERROR", "Use cada filtro técnico uma única vez.");
    const input = parseQuery(query, Object.fromEntries(params));
    const data = technicalNotifications.parse(await rpc(auth.client, "operations_notification_attempts", { p_source: input.source, p_page: input.page, p_size: 20 }));
    if (data.source !== input.source || data.page !== input.page || data.pageSize !== 20)
      throw new Error("Resposta de outra consulta de tentativas.");
    return NextResponse.json({ data }, { headers: { "cache-control": "private, no-store" } });
  });
}
