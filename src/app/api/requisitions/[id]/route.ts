import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase não está configurado." }, { status: 503 });
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return NextResponse.json({ error: "Sua sessão expirou. Entre novamente." }, { status: 401 });
  const { id } = await context.params;
  const { data, error } = await supabase
    .from("requisitions")
    .select("id, protocol, status, created_at, updated_at, profiles!requisitions_created_by_fkey(full_name), care_recipients(display_name), requisition_items(product_id, custom_name, current_stock, urgent, products(name, category, unit)), requisition_observations(body, created_at), requisition_notifications(recipient_group, recipient_label, channel, state, attempts, attempted_at, last_error)")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("Failed to load requisition detail.", error);
    return NextResponse.json({ error: "Não foi possível carregar a requisição." }, { status: 503 });
  }
  if (!data) return NextResponse.json({ error: "Requisição não encontrada." }, { status: 404 });
  return NextResponse.json({ data });
}
