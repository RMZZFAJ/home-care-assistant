"use client";
import Link from "next/link";
import { EmptyState, StatusBadge } from "@/components/ui/primitives";
import { formatQuantity } from "@/lib/quantity";
import { formatBrazilDate } from "@/lib/receipt";

export type TransitDocument = {
  id: string;
  code: string;
  status: string;
  source: string;
  destination: string;
  createdAt: string;
  lines: {
    productId: string;
    name: string;
    unit: string;
    dispatched: string;
    accepted: string;
    reconciled: string;
    pending: string;
    disputed: boolean;
  }[];
};
export function TransitStock({
  documents,
  search,
  loading,
}: {
  documents: TransitDocument[];
  search: string;
  loading: boolean;
}) {
  const visible = documents.filter((doc) =>
    doc.lines.some((line) =>
      line.name
        .toLocaleLowerCase("pt-BR")
        .includes(search.toLocaleLowerCase("pt-BR")),
    ),
  );
  return (
    <div className="mt-5 space-y-4">
      <p className="text-sm leading-6 text-(--muted)">
        Materiais expedidos aguardando conferência ou resolução de divergência.
        Essas quantidades ainda não fazem parte do saldo confirmado do
        destinatário.
      </p>
      {visible.map((doc) => (
        <article className="rounded-xl border border-(--line) p-4" key={doc.id}>
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
                className="rounded-lg bg-(--background) p-3"
                key={line.productId}
              >
                <h3 className="text-sm font-semibold">{line.name}</h3>
                <dl className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                  {[
                    ["Expedido", line.dispatched],
                    ["Aceito no destino", line.accepted],
                    ["Conciliado", line.reconciled],
                    [
                      line.disputed
                        ? "Divergência pendente"
                        : "Aguardando conferência",
                      line.pending,
                    ],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-(--muted)">{label}</dt>
                      <dd className="mt-1 font-semibold">
                        {formatQuantity(value, line.unit)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </li>
            ))}
          </ul>
        </article>
      ))}
      {!loading && !visible.length ? (
        <EmptyState title="Nenhuma entrega em trânsito">
          As conferências pendentes deste paciente aparecerão aqui.
        </EmptyState>
      ) : null}
    </div>
  );
}
