import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { RequisitionHistory } from "@/components/requisitions/requisition-history";
import { Suspense } from "react";

export default async function HistoryPage() {
  return <Suspense fallback={<main className="p-8">Carregando histórico...</main>}><HistoryContent /></Suspense>;
}

async function HistoryContent() {
  await connection();
  const supabase = await createSupabaseServerClient();
  if (!supabase) return <main className="p-8">Configure o Supabase para consultar o histórico.</main>;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("status").eq("id", user.id).maybeSingle();
  if (!profile || profile.status !== "active") return <main className="mx-auto max-w-2xl p-8"><h1 className="text-2xl font-semibold">Acesso não autorizado</h1><p className="mt-3 text-[var(--muted)]">Seu perfil não está ativo.</p></main>;
  return <RequisitionHistory />;
}
