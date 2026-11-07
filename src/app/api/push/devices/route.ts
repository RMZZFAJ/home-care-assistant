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

export const runtime = "nodejs";
export async function GET() {
  return api("push.devices", async () => {
    const auth = await authenticate();
    const devices = pushDevices.parse(
      await rpc(auth.client, "my_web_push_devices"),
    );
    let configuration;
    try {
      configuration = webPushConfiguration();
    } catch {
      configuration = null;
    }
    return NextResponse.json({
      devices,
      available: !!configuration,
      deliveryEnabled:
        !!configuration && process.env.WEB_PUSH_EXTERNAL_ENABLED === "true",
      publicKey: configuration?.publicKey ?? null,
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
    const data = await rpc(auth.client, "web_push_device_command", {
      p_id: input.id,
      p_action: input.action,
    });
    return NextResponse.json({ data });
  });
}
