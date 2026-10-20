import { connection } from "next/server";
import { Suspense } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AdminConsole } from "@/components/admin/admin-console";

export default async function AdminPage() {
  return <Suspense fallback={<main className="p-6">Carregando administração...</main>}><AdminContent /></Suspense>;
}

async function AdminContent() {
  await connection();
  const supabase = await createSupabaseServerClient();
  if (!supabase) return <main className="mx-auto max-w-5xl p-6">Supabase não configurado.</main>;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <main className="mx-auto max-w-5xl p-6">Sua sessão expirou.</main>;
  const { data: admin } = await supabase.rpc("is_global_administrator");
  if (!admin) return <main className="mx-auto max-w-5xl p-6">Acesso administrativo não autorizado.</main>;
  const [{ data: profiles }, { data: recipients }, { data: products }] = await Promise.all([
    supabase.rpc("admin_list_profiles"),
    supabase.rpc("admin_list_recipients"),
    supabase.rpc("admin_list_products"),
  ]);
  return <AdminConsole profiles={profiles ?? []} recipients={recipients ?? []} products={products ?? []} />;
}
