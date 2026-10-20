import { RequisitionWizard } from "@/components/requisitions/requisition-wizard";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export default function Home() {
  return <Suspense fallback={<main className="p-8">Carregando...</main>}><AuthenticatedHome /></Suspense>;
}

async function AuthenticatedHome() {
  await connection();
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return <SetupRequired />;
  }
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("status, role").eq("id", user.id).maybeSingle();
  if (!profile || profile.status !== "active" || !["admin", "supervisor", "professional"].includes(profile.role)) {
    return <AccessDenied />;
  }
  return <RequisitionWizard />;
}

function SetupRequired() {
  return <main className="mx-auto max-w-2xl p-8"><h1 className="text-2xl font-semibold">Configuração necessária</h1><p className="mt-3 text-[var(--muted)]">Configure as variáveis do Supabase em `.env.local` antes de iniciar uma sessão autenticada.</p></main>;
}

function AccessDenied() {
  return <main className="mx-auto max-w-2xl p-8"><h1 className="text-2xl font-semibold">Acesso não autorizado</h1><p className="mt-3 text-[var(--muted)]">Sua conta não possui um perfil ativo autorizado para registrar requisições.</p></main>;
}
