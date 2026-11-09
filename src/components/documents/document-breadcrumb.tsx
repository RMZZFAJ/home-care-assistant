import Link from "next/link";
import { Icon } from "@/components/ui/primitives";

export function DocumentBreadcrumb({ code }: { code: string }) {
  return (
    <nav className="hca-document-breadcrumb" aria-label="Localização da ficha">
      <Link href="/historico">Fichas</Link>
      <Icon name="chevron" />
      <strong>{code}</strong>
    </nav>
  );
}
