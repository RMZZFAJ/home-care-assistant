import { RequisitionWizard } from "@/components/requisitions/requisition-wizard";
import { LogoutButton } from "@/components/auth/logout-button";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";

export default function Home() {
  return <Suspense fallback={<main className="p-8">Carregando...</main>}><AuthenticatedHome /></Suspense>;
}

async function AuthenticatedHome() {
  await connection();
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return <SetupRequired />;
  }
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) {
    return <AuthProblem />;
  }
  if (!user) redirect("/login");
  const { data: profile, error: profileError } = await supabase.from("profiles").select("status, role, global_scope").eq("id", user.id).maybeSingle();
  if (profileError) {
    return <AuthProblem />;
  }
  if (!profile || profile.status !== "active" || !["admin", "supervisor", "professional", "reader"].includes(profile.role)) {
    return <AccessDenied />;
  }
  if (profile.role === "reader") return <ReadOnlyHome />;
  return <RequisitionWizard canAccessAdmin={profile.role === "admin" && profile.global_scope === true} />;
}

function SetupRequired() {
  return <main className="mx-auto max-w-2xl p-8"><h1 className="text-2xl font-semibold">Configuração necessária</h1><p className="mt-3 text-[var(--muted)]">Configure as variáveis do Supabase em `.env.local` antes de iniciar uma sessão autenticada.</p></main>;
}

function AuthProblem() {
  return <main className="mx-auto max-w-2xl p-8"><h1 className="text-2xl font-semibold">Não foi possível validar o acesso</h1><p className="mt-3 text-[var(--muted)]">O serviço de autenticação ou o perfil não respondeu corretamente. Saia e entre novamente; se o problema persistir, verifique a configuração do Supabase.</p><div className="mt-5"><LogoutButton /></div></main>;
}

function AccessDenied() {
  return <main className="mx-auto max-w-2xl p-8"><div className="flex items-center justify-between gap-4"><div><h1 className="text-2xl font-semibold">Acesso não autorizado</h1><p className="mt-3 text-[var(--muted)]">Sua conta não possui um perfil ativo autorizado para registrar requisições.</p></div><LogoutButton /></div></main>;
}

function ReadOnlyHome() {
  return <main className="mx-auto max-w-2xl p-8"><div className="flex items-start justify-between gap-4"><div><h1 className="text-2xl font-semibold">Acesso somente leitura</h1><p className="mt-3 text-[var(--muted)]">Seu perfil pode consultar requisições autorizadas, mas não registrar ou alterar operações.</p><Link href="/historico" className="mt-5 inline-block rounded-lg bg-[var(--brand)] px-4 py-3 text-sm font-bold text-white">Consultar histórico</Link></div><LogoutButton /></div></main>;
}
