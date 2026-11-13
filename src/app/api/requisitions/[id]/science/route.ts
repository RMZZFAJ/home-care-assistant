import { NextResponse } from "next/server";
import { z } from "zod";
import { api, authenticate, parseQuery, parseUuid, readJson, rpc } from "@/lib/server/api";

export async function GET(request: Request, context: { params: Promise<{ id: string; }>; }) {
  return api("requisition.science.result", async () => {
    const id = parseUuid((await context.params).id);
    const identity = parseQuery(z.string().regex(/^[0-9a-f]{64}$/), new URL(request.url).searchParams.get("materialIdentity"));
    const auth = await authenticate();
    const progress = await rpc(auth.client, "requisition_progress", { p_id: id }) as { science: { user_id: string; mode: string; material_identity: string | null; created_at: string ;}[] ;};
    const receipt = progress.science.find(row => row.user_id === auth.userId && row.mode === "express" && row.material_identity === identity);
    return NextResponse.json({ documentId: id, actorId: auth.userId, materialIdentity: identity, confirmed: Boolean(receipt), recordedAt: receipt?.created_at ?? null }, { headers: { "Cache-Control": "private, no-store" } });
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string; }>; },
) {
  return api("requisition.science", async () => {
    const input = await readJson(
      request,
      z
        .object({
          mode: z.enum(["express", "dialog"]),
          expectedVersion: z.number().int().positive().max(2147483647),
          materialIdentity: z.string().regex(/^[0-9a-f]{64}$/).optional(),
        })
        .strict().refine(value => value.mode === "express" || Boolean(value.materialIdentity), { path: ["materialIdentity"], message: "Reabra a prévia desta requisição." }),
    );
    const auth = await authenticate();
    return NextResponse.json({
      data: await rpc(auth.client, "acknowledge_requisition", {
        p_id: parseUuid((await context.params).id),
        p_mode: input.mode,
        p_version: input.expectedVersion,
        ...(input.materialIdentity ? { p_material_identity: input.materialIdentity } : {}),
      }),
    });
  });
}
