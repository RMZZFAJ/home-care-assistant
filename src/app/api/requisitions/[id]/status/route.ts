import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const statusSchema = z.object({
  status: z.enum(["under_review", "approved", "separated", "delivered", "cancelled"]),
  reason: z.string().trim().max(1000).nullable().optional(),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase não está configurado." }, { status: 503 });
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return NextResponse.json({ error: "Sua sessão expirou. Entre novamente." }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Dados inválidos." }, { status: 400 }); }
  const parsed = statusSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Status inválido." }, { status: 400 });
  const { id } = await context.params;
  const { data, error } = await supabase.rpc("transition_requisition_status", {
    p_requisition_id: id,
    p_to_status: parsed.data.status,
    p_reason: parsed.data.reason ?? null,
  }).maybeSingle();
  if (error || !data) {
    console.error("Failed to transition requisition status.", error);
    const message = error?.message.includes("not authorized")
      ? "Você não tem autorização para alterar este status."
      : error?.message.includes("invalid status")
        ? "Esta transição de status não é permitida."
        : error?.message.includes("reason required")
          ? "Informe uma justificativa para cancelar."
          : "Não foi possível alterar o status.";
    return NextResponse.json({ error: message }, { status: error?.message.includes("not authorized") ? 403 : 400 });
  }
  return NextResponse.json({ data });
}
