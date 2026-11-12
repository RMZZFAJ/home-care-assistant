import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "./globals.css";
import "./design-system.css";
import { LiveSession } from "@/components/live-session";
import "@/theme/tokens.css";
import "./canonical-ui.css";
import { WorkspaceProvider } from "@/components/layout/workspace-context";
import { PwaProvider } from "@/components/pwa/pwa-provider";
import { stablePreviewOrigin } from "@/lib/pwa/preview-origin";

export const metadata: Metadata = {
  title: "Home Care Assistant",
  description:
    "Gestão segura de requisições de insumos para assistência domiciliar.",
  appleWebApp: { capable: true, title: "Home Care", statusBarStyle: "default" },
  icons: { apple: "/pwa/apple-180.png" },
};

export const viewport: Viewport = {
  themeColor: "#173b3a",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <div className="hca-app-root hca-theme">
          <Suspense fallback={<main className="p-6" role="status">Carregando seu espaço de cuidado…</main>}>
            <PwaProvider previewOrigin={stablePreviewOrigin(process.env.VERCEL_ENV, process.env.VERCEL_BRANCH_URL)}><WorkspaceProvider>{children}</WorkspaceProvider></PwaProvider>
          </Suspense>
          <LiveSession />
        </div>
      </body>
    </html>
  );
}
