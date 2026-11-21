import { NextResponse } from "next/server";
import { z } from "zod";
import { api, ApiError, authenticate, parseUuid, readJson, rpc } from "@/lib/server/api";

const cursor = z.object({ at: z.iso.datetime({ offset: true }), id: z.uuid() }).strict();
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  return api("requisition.openings.list", async () => {
    const id = parseUuid((await context.params).id);
    const params = new URL(request.url).searchParams;
    const before = params.has("beforeAt") || params.has("beforeId")
      ? cursor.safeParse({ at: params.get("beforeAt"), id: params.get("beforeId") }) : null;
    if (before && !before.success) throw new ApiError("VALIDATION_ERROR", "Referência de paginação inválida.");
    const auth = await authenticate();
    await rpc(auth.client, "requisition_opening_context", { p_id: id });
    const result = await rpc(auth.client, "document_access_history", { p_document: id, p_before_at: before?.success ? before.data.at : null, p_before_id: before?.success ? before.data.id : null }) as { data: { id: string; actorId: string; actorName: string | null; referenceVersion: number; recordedAt: string; origin: string; materialIdentity: string | null }[]; next: unknown };
    const data = result.data.map(row => ({ id: row.id, user_id: row.actorId, actor_name: row.actorName, reference_version: row.referenceVersion, material_identity: row.materialIdentity, recorded_at: row.recordedAt, origin: row.origin }));
    return NextResponse.json({ data, next: result.next }, { headers: { "cache-control": "private, no-store" } });
  });
}
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return api("requisition.openings.record", async () => {
    const input = await readJson(request, z.object({
      materialIdentity: z.string().regex(/^[0-9a-f]{64}$/),
      referenceVersion: z.number().int().positive().max(2147483647),
      openingKey: z.uuid(),
    }).strict());
    const auth = await authenticate();
    return NextResponse.json({ data: await rpc(auth.client, "record_requisition_opening", {
      p_id: parseUuid((await context.params).id), p_material_identity: input.materialIdentity, p_version: input.referenceVersion, p_key: input.openingKey,
    }) }, { headers: { "cache-control": "private, no-store" } });
  });
}
