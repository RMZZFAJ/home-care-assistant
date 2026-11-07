import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import "./design-system.css";
import { LiveSession } from "@/components/live-session";
import { ThemeProvider } from "@/theme/providers";
import "@/theme/tokens.css";
import { WorkspaceProvider } from "@/components/layout/workspace-context";
import { PwaProvider } from "@/components/pwa/pwa-provider";

export const metadata: Metadata = {
  title: "Home Care Assistant",
  description:
    "Gestão segura de requisições de insumos para assistência domiciliar.",
  appleWebApp: { capable: true, title: "Home Care", statusBarStyle: "default" },
  icons: { apple: "/pwa/apple-180.png" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <ThemeProvider>
          <Suspense fallback={<main className="p-6" role="status">Carregando seu espaço de cuidado…</main>}>
            <PwaProvider><WorkspaceProvider>{children}</WorkspaceProvider></PwaProvider>
          </Suspense>
          <LiveSession />
        </ThemeProvider>
      </body>
    </html>
  );
}
