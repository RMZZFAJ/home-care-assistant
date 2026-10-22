import { api, ApiError, boundedText, rpc } from "@/lib/server/api";
import { createWorkerClient } from "@/lib/server/service-client";
import { decryptFlow, flowRequest, tokenHash } from "@/lib/notifications/flows";
import { verifyMetaSignature } from "@/lib/notifications/webhook";
export async function POST(request: Request) {
  return api("whatsapp.flow", async () => {
    if (
      process.env.META_FLOWS_ENABLED !== "true" ||
      !process.env.META_FLOWS_PRIVATE_KEY
    )
      throw new ApiError(
        "NOT_CONFIGURED",
        "Flows aguardando configuração do provedor.",
        503,
      );
    const raw = await boundedText(request, 200000);
    if (
      !verifyMetaSignature(
        raw,
        request.headers.get("x-hub-signature-256"),
        process.env.META_APP_SECRET,
      )
    )
      throw new ApiError("FORBIDDEN", "Evento inválido.", 403);
    let decrypted: ReturnType<typeof decryptFlow>;
    try {
      decrypted = decryptFlow(
        JSON.parse(raw),
        process.env.META_FLOWS_PRIVATE_KEY,
        process.env.META_FLOWS_PRIVATE_KEY_PASSPHRASE,
      );
    } catch {
      throw new ApiError(
        "VALIDATION_ERROR",
        "Não foi possível validar o conteúdo criptografado.",
        421,
      );
    }
    const input = flowRequest.safeParse(decrypted.payload);
    if (!input.success)
      throw new ApiError("VALIDATION_ERROR", "Dados de Flow inválidos.");
    let response: unknown = { data: { status: "active" } };
    if (input.data.action !== "ping") {
      if (!input.data.flow_token)
        throw new ApiError(
          "FORBIDDEN",
          "Abra uma sessão autenticada para iniciar o Flow.",
          403,
        );
      const result = await rpc(createWorkerClient(), "flow_exchange", {
        p_hash: tokenHash(input.data.flow_token),
        p_submit:
          input.data.action === "data_exchange"
            ? (input.data.data ?? {})
            : null,
      });
      response =
        input.data.action === "data_exchange"
          ? {
              screen: "SUCCESS",
              data: {
                extension_message_response: {
                  params: {
                    flow_token: input.data.flow_token,
                    pending_confirmation: true,
                  },
                },
              },
            }
          : { screen: "REPORT", data: result };
    }
    return new Response(decrypted.encrypt(response), {
      headers: { "content-type": "text/plain", "cache-control": "no-store" },
    });
  });
}
