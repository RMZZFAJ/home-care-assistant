import { NextResponse } from "next/server";
import { z } from "zod";
import {
  api,
  ApiError,
  authenticate,
  databaseError,
  parseUuid,
  patientContext,
  readJson,
  rpc,
} from "@/lib/server/api";
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return api("requisition.archive", async () => {
    const input = await readJson(
      request,
      z.object({ reason: z.string().trim().min(3).max(1000) }).strict(),
    );
    const auth = await authenticate();
    const id = parseUuid((await context.params).id);
    const { data: document, error } = await auth.client
      .from("requisitions")
      .select("care_recipient_id")
      .eq("id", id)
      .maybeSingle();
    if (error) databaseError(error);
    if (!document)
      throw new ApiError("NOT_FOUND", "Requisição não encontrada.", 404);
    await patientContext(auth, document.care_recipient_id, "req.archive", true);
    return NextResponse.json({
      data: await rpc(auth.client, "archive_requisition", {
        p_id: id,
        p_reason: input.reason,
      }),
    });
  });
}
