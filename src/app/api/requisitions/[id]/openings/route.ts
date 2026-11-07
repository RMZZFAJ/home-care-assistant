import { NextResponse } from "next/server";
import { z } from "zod";
import { api, ApiError, authenticate, databaseError, parseUuid, readJson, rpc } from "@/lib/server/api";

const cursor = z.object({ at: z.iso.datetime({ offset: true }), id: z.uuid() }).strict();
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  return api("requisition.openings.list", async () => {
    const id = parseUuid((await context.params).id);
    const params = new URL(request.url).searchParams;
    const before = params.has("beforeAt") || params.has("beforeId")
      ? cursor.safeParse({ at: params.get("beforeAt"), id: params.get("beforeId") }) : null;
    if (before && !before.success) throw new ApiError("VALIDATION_ERROR", "Referência de paginação inválida.");
    const auth = await authenticate();
    // The same minimal read gate applies to empty trails and existing records.
    await rpc(auth.client, "requisition_opening_context", { p_id: id });
    let query = auth.client.from("requisition_openings").select("id,user_id,actor_name,material_identity,reference_version,recorded_at,origin")
      .eq("requisition_id", id).order("recorded_at", { ascending: false }).order("id", { ascending: false }).limit(21);
    if (before?.success) query = query.or(`recorded_at.lt.${before.data.at},and(recorded_at.eq.${before.data.at},id.lt.${before.data.id})`);
    const result = await query;
    if (result.error) databaseError(result.error);
    const rows = result.data ?? [], data = rows.slice(0, 20), last = data.at(-1);
    return NextResponse.json({ data, next: rows.length > 20 && last ? { at: last.recorded_at, id: last.id } : null }, { headers: { "cache-control": "private, no-store" } });
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
