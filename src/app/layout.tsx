import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import "./design-system.css";
import { LiveSession } from "@/components/live-session";
import { ThemeProvider } from "@/theme/providers";
import "@/theme/tokens.css";
import { WorkspaceProvider } from "@/components/layout/workspace-context";

export const metadata: Metadata = {
  title: "Home Care Assistant",
  description:
    "Gestão segura de requisições de insumos para assistência domiciliar.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <ThemeProvider>
          <Suspense fallback={<main className="p-6" role="status">Carregando seu espaço de cuidado…</main>}>
            <WorkspaceProvider>{children}</WorkspaceProvider>
          </Suspense>
          <LiveSession />
        </ThemeProvider>
      </body>
    </html>
  );
}
