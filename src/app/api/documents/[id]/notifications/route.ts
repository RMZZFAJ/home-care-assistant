import { NextResponse } from "next/server";
import { api, ApiError, authenticate, rpc, uuid } from "@/lib/server/api";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return api("documents.notifications", async () => {
    const { id } = await context.params;
    if (!uuid.safeParse(id).success)
      throw new ApiError("VALIDATION_ERROR", "Identificador inválido.");
    const auth = await authenticate();
    return NextResponse.json({
      data: await rpc(auth.client, "document_delivery_status", {
        p_document: id,
      }),
    });
  });
}
