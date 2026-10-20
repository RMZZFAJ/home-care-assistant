import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { z } from "zod";

const movementSchema = z.object({
  careRecipientId: z.string().uuid(),
  productId: z.string().trim().min(1).max(120),
  quantity: z.number().int().positive().max(1_000_000),
  movementType: z.enum(["inbound", "outbound", "adjustment"]),
  sourceLocation: z.enum(["FAMILY", "CARE_TEAM"]).nullable(),
  destinationLocation: z.enum(["FAMILY", "CARE_TEAM"]).nullable(),
  justification: z.string().trim().min(1).max(1000),
  idempotencyKey: z.string().uuid().nullable(),
  referenceType: z.string().trim().max(80).nullable(),
  referenceId: z.string().uuid().nullable(),
});

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase não está configurado." }, { status: 503 });
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return NextResponse.json({ error: "Sua sessão expirou. Entre novamente." }, { status: 401 });
  const recipientId = new URL(request.url).searchParams.get("careRecipientId");
  if (!recipientId) return NextResponse.json({ error: "Informe o paciente." }, { status: 400 });
  const { data, error } = await supabase.from("stock_movements").select("id, care_recipient_id, product_id, quantity, movement_type, source_location, destination_location, justification, created_at").eq("care_recipient_id", recipientId).order("created_at", { ascending: false }).limit(100);
  if (error) {
    console.error("Failed to load stock movements.", error);
    return NextResponse.json({ error: "Não foi possível carregar as movimentações." }, { status: 503 });
  }
  return NextResponse.json({ data: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase não está configurado." }, { status: 503 });
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return NextResponse.json({ error: "Sua sessão expirou. Entre novamente." }, { status: 401 });
  let input: unknown;
  try { input = await request.json(); } catch { return NextResponse.json({ error: "Dados inválidos." }, { status: 400 }); }
  const parsed = movementSchema.safeParse(input);
  if (!parsed.success) return NextResponse.json({ error: "Dados de movimentação inválidos." }, { status: 400 });
  const value = parsed.data;
  const { data, error } = await supabase.rpc("record_stock_movement", {
    p_care_recipient_id: value.careRecipientId,
    p_product_id: value.productId,
    p_quantity: value.quantity,
    p_movement_type: value.movementType,
    p_source_location: value.sourceLocation,
    p_destination_location: value.destinationLocation,
    p_justification: value.justification,
    p_idempotency_key: value.idempotencyKey,
    p_reference_type: value.referenceType,
    p_reference_id: value.referenceId,
  }).maybeSingle();
  if (error || !data) {
    console.error("Failed to record stock movement.", error);
    return NextResponse.json({ error: "Não foi possível registrar a movimentação." }, { status: 400 });
  }
  return NextResponse.json({ data }, { status: 201 });
}
