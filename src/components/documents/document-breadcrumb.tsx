"use client";
import Link from "next/link";
import { useHistoryReturn } from "@/lib/documents/use-history-return";
import { Icon } from "@/components/ui/primitives";

export function DocumentBreadcrumb({ code }: { code: string }) {
  const history = useHistoryReturn();
  return (
    <nav className="hca-document-breadcrumb" aria-label="Localização da ficha">
      <Link href={history}>Fichas</Link>
      <Icon name="chevron" />
      <strong>{code}</strong>
    </nav>
  );
}
