import { NextResponse } from "next/server";
import { api, ApiError, authenticate, readJson, rpc } from "@/lib/server/api";
import {
  pushDeviceCommand,
  pushDevices,
  pushEnrollment,
} from "@/lib/push/subscription";
import {
  validatePushPublicKey,
  webPushConfiguration,
} from "@/lib/server/web-push";

import { pushRequestContext, readablePushConfiguration, requirePushRequestContext } from "@/lib/server/push-request-context";

export const runtime = "nodejs";
export async function GET(request: Request) {
  return api("push.devices", async () => {
    const auth = await authenticate();
    const devices = pushDevices.parse(
      await rpc(auth.client, "my_web_push_devices"),
    );
    const configuration = readablePushConfiguration();
    const includeContext = new URL(request.url).searchParams.get("context") === "consent";
    return NextResponse.json({
      devices,
      available: !!configuration,
      deliveryEnabled:
        !!configuration && process.env.WEB_PUSH_EXTERNAL_ENABLED === "true",
      publicKey: configuration?.publicKey ?? null,
      ...(includeContext ? { userId: auth.userId, contextReference: await pushRequestContext(auth, configuration) } : {}),
    });
  });
}
export async function POST(request: Request) {
  return api("push.subscribe", async () => {
    const input = await readJson(request, pushEnrollment, 8192);
    const auth = await authenticate(),
      config = webPushConfiguration();
    if (!config)
      throw new ApiError(
        "PUSH_NOT_CONFIGURED",
        "Os avisos neste aparelho ainda não foram disponibilizados. Suas pendências continuam na central.",
        503,
      );
    await requirePushRequestContext(auth, input.contextReference, config);
    validatePushPublicKey(input.subscription);
    const data = await rpc(auth.client, "subscribe_web_push", {
      p_subscription: input.subscription,
      p_label: input.label,
      p_key_version: config.keyVersion,
    });
    return NextResponse.json({ data });
  });
}
export async function PATCH(request: Request) {
  return api("push.preference", async () => {
    const input = await readJson(request, pushDeviceCommand);
    const auth = await authenticate();
    await requirePushRequestContext(auth, input.contextReference, readablePushConfiguration());
    const data = await rpc(auth.client, "web_push_device_command", {
      p_id: input.id,
      p_action: input.action,
    });
    return NextResponse.json({ data });
  });
}
