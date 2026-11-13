import { NextResponse } from "next/server";
import { api, ApiError, authenticate, readJson } from "@/lib/server/api";
import { pushTestRequest } from "@/lib/push/subscription";
import { webPushConfiguration, webPushTransport } from "@/lib/server/web-push";
import { requirePushRequestContext } from "@/lib/server/push-request-context";
import { createWorkerClient } from "@/lib/server/service-client";
import { sendPersonalPushTest } from "@/lib/server/web-push-test";

export const runtime = "nodejs";
export async function POST(request: Request) {
  return api("push.test", async () => {
    const input = await readJson(request, pushTestRequest, 2048);
    const auth = await authenticate(), config = webPushConfiguration();
    if (!config || process.env.WEB_PUSH_EXTERNAL_ENABLED !== "true")
      throw new ApiError("PUSH_NOT_CONFIGURED", "O envio de testes ainda não está disponível neste ambiente.", 503);
    await requirePushRequestContext(auth, input.contextReference, config);
    const data = await sendPersonalPushTest(auth.client, createWorkerClient(), auth.userId, input, webPushTransport(config));
    return NextResponse.json({ data });
  });
}
