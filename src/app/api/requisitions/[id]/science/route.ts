import { NextResponse } from "next/server";
import { z } from "zod";
import { api, authenticate, parseUuid, readJson, rpc } from "@/lib/server/api";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
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
