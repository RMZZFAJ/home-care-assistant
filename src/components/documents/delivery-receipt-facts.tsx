import Link from "next/link";
import type { SupplyDocument } from "@/types/documents";
import { formatQuantity, quantity } from "@/lib/quantity";
import { DefinitionGrid } from "@/components/ui/controls";

export function DeliveryDispatchFacts({ data }: { data: SupplyDocument }) {
  return (
    <section aria-label="Expedição preservada" className="space-y-3 text-sm">
      <h3 className="font-semibold">Expedição preservada</h3>
      <DefinitionGrid items={[
        { label: "Origem", value: data.payload.source === "FAMILY" ? "Família" : "Equipe" },
        { label: "Destino", value: data.payload.destination === "FAMILY" ? "Família" : "Equipe" },
        { label: "Recebedor designado", value: data.workflow_data.recipientSelection?.recipientName ?? "Pessoa designada no documento", wide: true },
      ]} />
      <div className="space-y-2">
        <p className="font-semibold">REQs vinculadas</p>
        {data.linkedRequisitions?.map((req) => (
          <p key={req.id}>
            <Link
              className="underline wrap-break-word"
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
            className="ui-card hca-form-stack hca-factual-material text-sm"
          >
            <h3 className="font-semibold">{line.name_snapshot}</h3>
            <DefinitionGrid items={[
              { label: "Expedido", value: formatQuantity(line.quantity, line.unit_snapshot) },
              { label: "Recebido neste ato", value: formatQuantity(accepted, line.unit_snapshot) },
              { label: "Pendente de conciliação", value: formatQuantity(pending, line.unit_snapshot) },
            ]} />
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
