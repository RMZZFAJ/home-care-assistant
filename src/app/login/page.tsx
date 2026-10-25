import { LoginForm } from "@/components/auth/login-form";
import { Suspense } from "react";

export default function LoginPage() {
  return (
    <main className="hca-auth-page">
      <section className="hca-auth-card">
        <div className="hca-auth-brand"><span>HC</span><strong>Home Care Assistant</strong></div>
        <h1>Entrar</h1>
        <p>Acesse sua conta para acompanhar o cuidado e suas próximas tarefas.</p>
        <div className="mt-6"><Suspense fallback={<p role="status">Carregando formulário...</p>}><LoginForm /></Suspense></div>
      </section>
    </main>
  );
}
