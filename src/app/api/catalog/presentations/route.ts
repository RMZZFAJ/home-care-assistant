import { NextResponse } from "next/server";
import { z } from "zod";
import {
  api,
  ApiError,
  authenticate,
  databaseError,
  patientContext,
  readJson,
  rpc,
  uuid,
} from "@/lib/server/api";
import { exactQuantity } from "@/lib/validation/documents";
import { quantity } from "@/lib/quantity";
import { presentationCommandSchema } from "@/lib/validation/catalogue";

export async function GET(request: Request) {
  return api("presentations.read", async () => {
    const auth = await authenticate();
    const params = new URL(request.url).searchParams;
    const patient = await patientContext(auth, params.get("careRecipientId"));
    const presentationId = params.get("presentationId");
    if (presentationId && !uuid.safeParse(presentationId).success)
      throw new ApiError("VALIDATION_ERROR", "Apresentação inválida.");
    const historyPage = Number(params.get("historyPage") ?? "1");
    if (
      !Number.isSafeInteger(historyPage) ||
      historyPage < 1 ||
      historyPage > 100000
    )
      throw new ApiError("VALIDATION_ERROR", "Página inválida.");
    let query = auth.client
      .from("product_presentations")
      .select("*")
      .eq("care_recipient_id", patient.id);
    if (params.get("includeInactive") !== "true")
      query = query.eq("active", true);
    if (presentationId) query = query.eq("id", presentationId);
    if (params.get("productId"))
      query = query.eq("product_id", params.get("productId")!);
    const code = params.get("barcode");
    if (code) {
      if (!/^\d{8,14}$/.test(code))
        throw new ApiError("VALIDATION_ERROR", "Código de barras inválido.");
      query = query.eq("barcode", code);
    }
    const [result, units, versions] = await Promise.all([
      query.order("name"),
      auth.client.from("measurement_units").select("*").order("name"),
      presentationId
        ? auth.client
            .from("product_presentation_versions")
            .select("version,recorded_at,definition", { count: "exact" })
            .eq("care_recipient_id", patient.id)
            .eq("presentation_id", presentationId)
            .order("version", { ascending: false })
            .range((historyPage - 1) * 20, historyPage * 20 - 1)
        : Promise.resolve({ data: [], count: 0, error: null }),
    ]);
    if (result.error) databaseError(result.error);
    if (units.error) databaseError(units.error);
    if (versions.error) databaseError(versions.error);
    return NextResponse.json({
      data: result.data ?? [],
      units: units.data ?? [],
      versions: versions.data ?? [],
      versionTotal: versions.count ?? 0,
    });
  });
}
export async function POST(request: Request) {
  return api("presentations.configure", async () => {
    const input = await readJson(
      request,
      z.union([
        presentationCommandSchema,
        z
          .object({
            careRecipientId: uuid,
            productId: z.string().min(1).max(120),
            unit: z.string().min(1).max(30),
            decimals: z.number().int().min(0).max(6),
            barcode: z
              .string()
              .regex(/^\d{8,14}$/)
              .optional(),
            name: z.string().min(2).max(160).optional(),
            baseQuantity: exactQuantity
              .refine(
                (value) => quantity(value).gt(0),
                "Informe um fator maior que zero.",
              )
              .optional(),
          })
          .strict()
          .refine(
            (input) =>
              input.barcode
                ? input.name !== undefined && input.baseQuantity !== undefined
                : input.name === undefined && input.baseQuantity === undefined,
            "Código, nome e fator devem ser informados juntos.",
          ),
      ]),
    );
    const auth = await authenticate();
    if ("action" in input) {
      // The RPC distinguishes a new write from recovery of this actor's own
      // immutable intent, under a live read authority check.
      await patientContext(auth, input.careRecipientId);
      return NextResponse.json({
        data: await rpc(auth.client, "catalogue_presentation_command", {
          p_patient: input.careRecipientId,
          p_id: input.id,
          p_version: input.referenceVersion,
          p_key: input.idempotencyKey,
          p_body: {
            productId: input.productId,
            barcode: input.barcode,
            name: input.name,
            baseQuantity: input.baseQuantity,
            active: input.active,
          },
        }),
      });
    }
    await patientContext(auth, input.careRecipientId, "catalog.manage", true);
    return NextResponse.json({
      data: await rpc(auth.client, "configure_catalogue_unit", {
        p_patient: input.careRecipientId,
        p_product: input.productId,
        p_unit: input.unit,
        p_decimals: input.decimals,
        p_barcode: input.barcode ?? null,
        p_presentation: input.name ?? null,
        p_base_quantity: input.baseQuantity ?? null,
      }),
    });
  });
}
