import { NextResponse } from "next/server";
import { z } from "zod";
import { catalogueCommitFor, catalogueReceipt } from "@/lib/validation/catalogue-preparation";
import { runCatalogueAttempt } from "@/lib/server/catalogue-preparation";
import {
  api,
  authenticate,
  databaseError,
  readJson,
  rpc,
  uuid,
} from "@/lib/server/api";
export async function GET() {
  return api("units.read", async () => {
    const auth = await authenticate();
    const { data, error } = await auth.client
      .from("measurement_units")
      .select("*")
      .order("name");
    if (error) databaseError(error);
    return NextResponse.json({ data });
  });
}
export async function POST(request: Request) {
  return api("units.create", async () => {
    const auth = await authenticate();
    const input = await readJson(
      request,
      z.union([catalogueCommitFor("unit_create"), z
        .object({
          careRecipientId: uuid.nullable(),
          code: z.string().trim().min(1).max(30),
          name: z.string().trim().min(2).max(80),
          dimension: z.enum(["count", "volume", "mass", "package"]),
          decimals: z.number().int().min(0).max(6),
        })
        .strict()]),
    );
    if ("cataloguePreparation" in input) {
      const receipt = catalogueReceipt.parse(await runCatalogueAttempt(auth, input.cataloguePreparation));
      return NextResponse.json({ id: receipt.outcome && "unitId" in receipt.outcome ? receipt.outcome.unitId : null, receipt });
    }
    return NextResponse.json({
      id: await rpc(auth.client, "create_measurement_unit", {
        p_patient: input.careRecipientId,
        p_code: input.code,
        p_name: input.name,
        p_dimension: input.dimension,
        p_decimals: input.decimals,
      }),
    });
  });
}
