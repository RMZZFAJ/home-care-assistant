import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase não está configurado." }, { status: 503 });
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return NextResponse.json({ error: "Sua sessão expirou. Entre novamente." }, { status: 401 });
  const { data, error } = await supabase.rpc("process_internal_notifications", { p_limit: 50 }).maybeSingle();
  if (error || !data) {
    console.error("Failed to process internal notifications.", error);
    return NextResponse.json({ error: "Não foi possível processar notificações." }, { status: 400 });
  }
  return NextResponse.json({ data });
}
