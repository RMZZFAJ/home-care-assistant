import { LoginForm } from "@/components/auth/login-form";
import { Suspense } from "react";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-5">
      <section className="w-full max-w-md rounded-2xl border border-(--line) bg-white p-6 shadow-sm sm:p-10">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-(--brand)">Home Care Assistant</p>
        <h1 className="mt-2 text-3xl font-semibold">Entrar</h1>
        <p className="mt-3 text-sm text-(--muted)">Use uma conta previamente criada e autorizada no Supabase.</p>
        <div className="mt-8"><Suspense fallback={<p role="status">Carregando formulário...</p>}><LoginForm /></Suspense></div>
      </section>
    </main>
  );
}
