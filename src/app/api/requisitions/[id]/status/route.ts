import { NextResponse } from "next/server";
import { z } from "zod";
import { api, ApiError, authenticate, databaseError, patientContext, readJson, rpc, uuid } from "@/lib/server/api";

const schema = z.object({ status: z.literal("cancelled"), reason: z.string().trim().min(3).max(1000) }).strict();
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return api("requisitions.transition", async () => {
    const input = await readJson(request, schema);
    const auth = await authenticate();
    const { id } = await context.params;
    if (!uuid.safeParse(id).success) throw new ApiError("VALIDATION_ERROR", "Identificador inválido.");
    const { data: row, error } = await auth.client.from("requisitions").select("care_recipient_id").eq("id", id).maybeSingle();
    if (error) databaseError(error);
    if (!row) throw new ApiError("NOT_FOUND", "Requisição não encontrada.", 404);
    await patientContext(auth, row.care_recipient_id, "request", true);
    const data = await rpc(auth.client, "transition_requisition_status", { p_requisition_id: id, p_to_status: input.status, p_reason: input.reason ?? null });
    return NextResponse.json({ data });
  });
}
