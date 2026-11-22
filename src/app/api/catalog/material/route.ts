import { NextResponse } from "next/server";
import { z } from "zod";
import { api, ApiError, authenticate, patientContext, rpc, uuid } from "@/lib/server/api";
import { documentMaterialPanel, materialPanelSections } from "@/lib/validation/document-material-context";

const query = z.object({
  careRecipientId: uuid,
  productId: z.string().min(1).max(120),
  section: z.enum(materialPanelSections),
  page: z.coerce.number().int().min(1).max(1_000_000),
});

export async function GET(request: Request) {
  return api("catalog.material", async () => {
    const params = new URL(request.url).searchParams;
    const parsed = query.safeParse({
      careRecipientId: params.get("careRecipientId"), productId: params.get("productId"),
      section: params.get("section") ?? "stock", page: params.get("page") ?? 1,
    });
    if (!parsed.success) throw new ApiError("VALIDATION_ERROR", "Confira o paciente e o material da consulta.");
    const auth = await authenticate();
    const input = parsed.data;
    const patient = await patientContext(auth, input.careRecipientId);
    const result = await rpc(auth.client, "catalogue_material_context", {
      p_patient: patient.id, p_product: input.productId, p_section: input.section, p_page: input.page,
    });
    return NextResponse.json(documentMaterialPanel.parse(result), { headers: { "Cache-Control": "no-store" } });
  });
}
