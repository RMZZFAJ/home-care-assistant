import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create"), careRecipientId: z.string().uuid(), location: z.enum(["FAMILY", "CARE_TEAM"]) }),
  z.object({ action: z.literal("item"), inventoryId: z.string().uuid(), productId: z.string().min(1), countedQuantity: z.number().int().nonnegative(), justification: z.string().trim().max(1000).nullable().optional() }),
  z.object({ action: z.literal("submit"), inventoryId: z.string().uuid() }),
  z.object({ action: z.literal("approve"), inventoryId: z.string().uuid() }),
]);

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase não está configurado." }, { status: 503 });
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return NextResponse.json({ error: "Sua sessão expirou. Entre novamente." }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Dados inválidos." }, { status: 400 }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dados de inventário inválidos." }, { status: 400 });
  const value = parsed.data;
  const rpc = value.action === "create"
    ? supabase.rpc("create_stock_inventory", { p_care_recipient_id: value.careRecipientId, p_location: value.location })
    : value.action === "item"
      ? supabase.rpc("add_stock_inventory_item", { p_inventory_id: value.inventoryId, p_product_id: value.productId, p_counted_quantity: value.countedQuantity, p_justification: value.justification ?? null })
      : value.action === "submit"
        ? supabase.rpc("submit_stock_inventory", { p_inventory_id: value.inventoryId })
        : supabase.rpc("approve_stock_inventory", { p_inventory_id: value.inventoryId });
  const { data, error } = await rpc.maybeSingle();
  if (error || !data) {
    console.error("Failed to update stock inventory.", error);
    return NextResponse.json({ error: "Não foi possível atualizar o inventário." }, { status: 400 });
  }
  return NextResponse.json({ data });
}
