"use client";
import Link from "next/link";
import { EmptyState, StatusBadge } from "@/components/ui/primitives";
import { formatQuantity } from "@/lib/quantity";
import { formatBrazilDate } from "@/lib/receipt";
import type { TransitDocument } from "@/types/stock";
import { DefinitionGrid } from "@/components/ui/controls";

export type { TransitDocument } from "@/types/stock";
export function TransitStock({
  documents,
  search,
  loading,
  showEmpty = true,
}: {
  documents: TransitDocument[];
  search: string;
  loading: boolean;
  showEmpty?: boolean;
}) {
  const visible = documents.filter((doc) =>
    doc.lines.some((line) =>
      line.name
        .toLocaleLowerCase("pt-BR")
        .includes(search.toLocaleLowerCase("pt-BR")),
    ),
  );
  return (
    <div className="hca-form-stack hca-transit-stock">
      <p className="text-sm leading-6 text-(--muted)">
        Materiais expedidos aguardando conferência ou resolução de divergência.
        Essas quantidades ainda não fazem parte do saldo confirmado do
        destinatário.
      </p>
      {visible.map((doc) => (
        <article className="ui-card hca-form-stack" key={doc.id}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              className="font-semibold underline"
              href={"/fichas/" + doc.id}
            >
              {doc.code}
            </Link>
            <StatusBadge status={doc.status} />
          </div>
          <p className="mt-2 text-xs text-(--muted)">
            {doc.source === "FAMILY" ? "Família → Equipe" : "Equipe → Família"}{" "}
            · {formatBrazilDate(doc.createdAt)}
          </p>
          <ul className="mt-4 space-y-3">
            {doc.lines.map((line) => (
              <li
                className="hca-transit-material"
                key={line.productId}
              >
                <h3 className="text-sm font-semibold">{line.name}</h3>
                <DefinitionGrid items={[
                    ["Expedido", line.dispatched],
                    ["Aceito no destino", line.accepted],
                    ["Conciliado", line.reconciled],
                    [
                      line.disputed
                        ? "Divergência pendente"
                        : "Aguardando conferência",
                      line.pending,
                    ],
                  ].map(([label, value]) => ({ label, value: formatQuantity(value, line.unit) }))} />
              </li>
            ))}
          </ul>
        </article>
      ))}
      {!loading && showEmpty && !visible.length ? (
        <EmptyState title="Nenhuma entrega em trânsito">
          As conferências pendentes deste paciente aparecerão aqui.
        </EmptyState>
      ) : null}
    </div>
  );
}
