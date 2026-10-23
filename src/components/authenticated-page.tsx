import { connection } from "next/server";
import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { headers } from "next/headers";
import { safeReturnPath } from "@/lib/safe-return-path";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export function AuthenticatedPage({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <main className="p-6" role="status">
          Validando acesso…
        </main>
      }
    >
      <SessionGate>{children}</SessionGate>
    </Suspense>
  );
}

async function SessionGate({ children }: { children: ReactNode }) {
  await connection();
  const supabase = await createSupabaseServerClient();
  if (!supabase)
    return (
      <main className="mx-auto max-w-2xl p-8">
        <h1 className="text-2xl font-semibold">Configuração necessária</h1>
        <p className="mt-3">
          Configure o Supabase para acessar o Home Care Assistant.
        </p>
      </main>
    );
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    const next = safeReturnPath(
      (await headers()).get("x-hca-return-path"),
      "https://home-care-assistant.vercel.app",
    );
    redirect("/login?next=" + encodeURIComponent(next));
  }
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError)
    return (
      <main className="p-8" role="alert">
        Não foi possível validar seu perfil. Recarregue a página.
      </main>
    );
  if (!profile || profile.status !== "active")
    return (
      <main className="p-8">
        <h1 className="text-xl font-semibold">Acesso indisponível</h1>
        <p className="mt-3">
          Seu perfil precisa estar ativo. Solicite a revisão de acesso a um
          administrador.
        </p>
        <a className="mt-4 inline-block underline" href="/login">
          Voltar ao acesso
        </a>
      </main>
    );
  return children;
}
