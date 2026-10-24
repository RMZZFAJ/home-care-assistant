import type { Metadata } from "next";
import "./globals.css";
import "./design-system.css";
import { LiveSession } from "@/components/live-session";
import { ThemeProvider } from "@/theme/providers";
import "@/theme/tokens.css";

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
          {children}
          <LiveSession />
        </ThemeProvider>
      </body>
    </html>
  );
}
