import Link from "next/link";
import type { SupplyDocument } from "@/types/documents";
import { formatQuantity, quantity } from "@/lib/quantity";

export function DeliveryDispatchFacts({ data }: { data: SupplyDocument }) {
  return (
    <section aria-label="Expedição preservada" className="space-y-3 text-sm">
      <h3 className="font-semibold">Expedição preservada</h3>
      <dl className="grid grid-cols-2 gap-3">
        <div>
          <dt>Origem</dt>
          <dd>{data.payload.source === "FAMILY" ? "Família" : "Equipe"}</dd>
        </div>
        <div>
          <dt>Destino</dt>
          <dd>
            {data.payload.destination === "FAMILY" ? "Família" : "Equipe"}
          </dd>
        </div>
        <div className="col-span-2">
          <dt>Recebedor designado</dt>
          <dd>
            {data.workflow_data.recipientSelection?.recipientName ??
              "Pessoa designada no documento"}
          </dd>
        </div>
      </dl>
      <div className="space-y-2">
        <p className="font-semibold">REQs vinculadas</p>
        {data.linkedRequisitions?.map((req) => (
          <p key={req.id}>
            <Link
              className="underline break-words"
              href={"/historico/" + req.id}
            >
              {req.code} · {req.protocol}
            </Link>
          </p>
        ))}
        {data.unavailableRequisitionItems ? (
          <p>Há vínculos cuja consulta não está disponível para este perfil.</p>
        ) : null}
        {!data.lines.some((line) => line.requisitionItemIds.length) ? (
          <p>Sem REQ vinculada.</p>
        ) : null}
      </div>
    </section>
  );
}

export function DeliveryReceiptReview({
  data,
  body,
}: {
  data: SupplyDocument;
  body: unknown;
}) {
  const divergences = (
    body as {
      divergences: {
        lineId: string;
        acceptedQuantity: string;
        problem?: string;
        notes?: string;
      }[];
    }
  ).divergences;
  return (
    <section
      aria-label="Conferência pessoal dos materiais"
      className="space-y-4"
    >
      <DeliveryDispatchFacts data={data} />
      {data.lines.map((line) => {
        const divergence = divergences.find((item) => item.lineId === line.id);
        const accepted = divergence?.acceptedQuantity ?? line.quantity;
        const pending = quantity(line.quantity).minus(accepted).toFixed();
        return (
          <article
            key={line.id}
            className="rounded-xl border border-(--line) p-3 text-sm"
          >
            <h3 className="font-semibold">{line.name_snapshot}</h3>
            <dl className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div>
                <dt>Expedido</dt>
                <dd>{formatQuantity(line.quantity, line.unit_snapshot)}</dd>
              </div>
              <div>
                <dt>Recebido neste ato</dt>
                <dd>{formatQuantity(accepted, line.unit_snapshot)}</dd>
              </div>
              <div>
                <dt>Pendente de conciliação</dt>
                <dd>{formatQuantity(pending, line.unit_snapshot)}</dd>
              </div>
            </dl>
            <p className="mt-2">
              {divergence
                ? "Linha divergente: " +
                  ({
                    shortage: "Quantidade menor",
                    damaged: "Material avariado",
                    wrong: "Produto divergente",
                    other: "Outra diferença",
                  }[divergence.problem ?? "other"] ?? "Outra diferença")
                : "Recebimento integral desta linha."}
            </p>
            {divergence?.notes ? (
              <p className="mt-2 whitespace-pre-wrap">
                Justificativa: {divergence.notes}
              </p>
            ) : null}
          </article>
        );
      })}
      <p className="text-sm">
        Somente as quantidades recebidas entram no estoque do destino. A
        diferença permanece pendente; esta confirmação é pessoal.
      </p>
    </section>
  );
}
