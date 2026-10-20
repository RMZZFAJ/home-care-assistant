import { NextResponse } from "next/server";
import { requisitionInputSchema } from "@/lib/validation/requisition";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const parsed = requisitionInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos.", details: parsed.error.flatten() }, { status: 400 });
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase não está configurado. Configure as variáveis do servidor para registrar uma requisição oficial." }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sua sessão expirou. Entre novamente para continuar." }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).eq("status", "active").maybeSingle();
  const { data: recipient } = await supabase.from("care_recipients").select("id, display_name").eq("is_active", true).eq("is_development", true).limit(1).maybeSingle();
  if (!profile || !recipient) return NextResponse.json({ error: "Seu perfil ou pessoa assistida não está autorizado para este ambiente." }, { status: 403 });

  const { data: existing } = await supabase.from("requisitions").select("id, protocol, created_at").eq("created_by", user.id).eq("idempotency_key", parsed.data.idempotencyKey).maybeSingle();
  if (existing) return NextResponse.json({ error: "Esta requisição já foi registrada.", receipt: { ...parsed.data, protocol: existing.protocol, requesterName: profile.full_name, recipientName: recipient.display_name, createdAt: existing.created_at } });

  const { data, error } = await supabase.rpc("submit_requisition", {
    p_care_recipient_id: recipient.id,
    p_idempotency_key: parsed.data.idempotencyKey,
    p_lines: parsed.data.lines,
    p_extra_items: parsed.data.extraItems.map((item) => ({ customName: item.name, currentStock: item.currentStock, requestedQuantity: item.requestedQuantity, urgent: item.urgent })),
    p_observations: parsed.data.observations,
  }).maybeSingle();
  const requisition = data as { protocol: string; created_at: string } | null;
  if (error || !requisition) return NextResponse.json({ error: "Não foi possível persistir a requisição. Nenhuma confirmação foi emitida." }, { status: 500 });
  return NextResponse.json({ receipt: { ...parsed.data, protocol: requisition.protocol, requesterName: profile.full_name, recipientName: recipient.display_name, createdAt: requisition.created_at } }, { status: 201 });
}
