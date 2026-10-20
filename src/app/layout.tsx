import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Home Care Assistant",
  description: "Gestão segura de requisições de insumos para assistência domiciliar.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
