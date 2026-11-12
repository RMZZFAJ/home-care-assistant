import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import "./design-system.css";
import "@/theme/tokens.css";
import "./canonical-ui.css";

export const metadata: Metadata = {
  title: "Página não encontrada | Home Care Assistant",
  robots: { index: false, follow: false },
};

/** Unmatched URLs must remain understandable before authentication. */
export default function GlobalNotFound() {
  return (
    <html lang="pt-BR">
      <body>
        <main className="mx-auto flex min-h-screen max-w-xl items-center px-5 py-10">
          <section className="ui-card hca-form-stack w-full min-w-0" aria-labelledby="not-found-title">
            <p className="text-sm font-semibold">Home Care Assistant · 404</p>
            <h1 id="not-found-title" className="text-2xl font-semibold">Página não encontrada</h1>
            <p className="wrap-anywhere">Este endereço não está disponível. Confira o link ou abra o aplicativo para encontrar sua tarefa.</p>
            <div className="hca-toolbar">
              <Link href="/" tabIndex={0} className="ui-button ui-button-primary">Abrir Home Care Assistant</Link>
              <Link href="/login" tabIndex={0} className="ui-button">Entrar na minha conta</Link>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
