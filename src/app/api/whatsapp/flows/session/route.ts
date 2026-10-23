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
      z.object({ careRecipientId: uuid, documentId: uuid.optional() }).strict(),
    );
    if (process.env.META_FLOWS_ENABLED !== "true")
      throw new ApiError(
        "NOT_CONFIGURED",
        "Flows aguardando configuração do provedor.",
        503,
      );
    const token = randomBytes(32).toString("base64url");
    await rpc(auth.client, input.documentId ? "create_receipt_flow_session" : "create_flow_session", {
      ...(input.documentId ? { p_document: input.documentId } : { p_patient: input.careRecipientId }),
      p_hash: tokenHash(token),
    });
    return NextResponse.json(
      {
        flowToken: token,
        expiresInSeconds: input.documentId ? 600 : 1200,
        requiresAuthenticatedConfirmation: !input.documentId,
      },
      { headers: { "cache-control": "no-store" } },
    );
  });
}
