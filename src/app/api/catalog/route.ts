import { NextResponse } from "next/server";
import { z } from "zod";
import { readCompleteCatalogue } from "@/lib/server/catalogue-read";
import { parseCatalogueCollectionRead } from "@/lib/validation/catalogue-list";
import {
  api,
  authenticate,
  patientContext,
  readJson,
  rpc,
  uuid,
} from "@/lib/server/api";

const schema = z
  .object({
    careRecipientId: uuid,
    id: z.string().min(1).max(120).nullable(),
    name: z.string().trim().min(2).max(160),
    description: z.string().trim().max(2000).nullable().optional(),
    category: z.enum(["medicamentos", "higiene", "dieta"]),
    unit: z.string().trim().min(1).max(30),
    aliases: z.array(z.string().trim().min(1).max(160)).max(30),
    isActive: z.boolean(),
    sortOrder: z.number().int().min(0).max(1_000_000).default(0),
  })
  .strict();

export async function GET(request: Request) {
  return api("catalog.read", async () => {
    const auth = await authenticate();
    const params = new URL(request.url).searchParams;
    const patient = await patientContext(auth, params.get("careRecipientId"));
    const includeInactive = params.get("includeInactive") === "true";
    const complete = await readCompleteCatalogue(auth.client, patient.id);
    const productRows = complete.items.filter(row => includeInactive || row.is_active);
    const definitions = new Map(complete.items.map(row => [row.product_id, row]));
    const successorBySource = new Map(complete.successors.map(row => [row.product_id, row.successor_product_id]));
    const predecessors = new Map<string, { id: string; name: string; unit: string }[]>();
    for (const link of complete.successors) {
      const source = definitions.get(link.product_id);
      if (source && !source.is_active) {
        const rows = predecessors.get(link.successor_product_id) ?? [];
        rows.push({ id: source.product_id, name: source.name, unit: source.unit });
        predecessors.set(link.successor_product_id, rows);
      }
    }
    const body = {
      careRecipientId: patient.id, includeInactive, total: productRows.length,
      data: productRows.map(item => ({
        product_id: item.product_id, name: item.name, description: item.description,
        category: item.category, unit: item.unit, quantity_decimals: item.quantity_decimals,
        aliases: item.aliases, is_active: item.is_active, sort_order: item.sort_order,
        updated_at: item.updated_at, id: item.product_id, active: item.is_active,
        successor: (() => {
          const target = successorBySource.get(item.product_id);
          const row = target ? definitions.get(target) : null;
          return row ? { id: row.product_id, name: row.name, unit: row.unit, active: row.is_active } : null;
        })(),
        selectionPredecessors: item.is_active ? predecessors.get(item.product_id) ?? [] : [],
      })),
    };
    parseCatalogueCollectionRead(body, patient.id, includeInactive);
    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  });
}

export async function POST(request: Request) {
  return api("catalog.write", async () => {
    const input = await readJson(request, schema);
    const auth = await authenticate();
    await patientContext(auth, input.careRecipientId, "catalog.manage", true);
    const data = await rpc(auth.client, "admin_upsert_recipient_product", {
      p_care_recipient_id: input.careRecipientId,
      p_product_id: input.id,
      p_name: input.name,
      p_category: input.category,
      p_unit: input.unit,
      p_aliases: input.aliases,
      p_is_active: input.isActive,
      p_description: input.description ?? null,
      p_sort_order: input.sortOrder,
    });
    return NextResponse.json({ data }, { status: input.id ? 200 : 201 });
  });
}
