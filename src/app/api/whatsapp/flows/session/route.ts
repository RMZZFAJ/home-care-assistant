import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  api,
  ApiError,
  authenticate,
  readJson,
  rpc,
  uuid,
} from "@/lib/server/api";
import { tokenHash } from "@/lib/notifications/flows";
export async function POST(request: Request) {
  return api("whatsapp.flow.session", async () => {
    const auth = await authenticate();
    const input = await readJson(
      request,
      z.object({ careRecipientId: uuid }).strict(),
    );
    if (process.env.META_FLOWS_ENABLED !== "true")
      throw new ApiError(
        "NOT_CONFIGURED",
        "Flows aguardando configuração do provedor.",
        503,
      );
    const token = randomBytes(32).toString("base64url");
    await rpc(auth.client, "create_flow_session", {
      p_patient: input.careRecipientId,
      p_hash: tokenHash(token),
    });
    return NextResponse.json(
      {
        flowToken: token,
        expiresInSeconds: 1200,
        requiresAuthenticatedConfirmation: true,
      },
      { headers: { "cache-control": "no-store" } },
    );
  });
}
