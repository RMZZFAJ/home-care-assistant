"use client";
import { DocumentMaterialList } from "@/components/documents/document-material-list";
import { DocumentMaterialsTable } from "@/components/documents/document-materials-table";
import { presentationCaption, readPresentationConversions } from "@/lib/presentation-conversion";
import { formatQuantity, quantity } from "@/lib/quantity";
import { issuedBalanceExtras, type BalanceCountExtra } from "@/lib/validation/balance-count-extras";
import type { SupplyDocument } from "@/types/documents";

type Amount = string | number | null | undefined;
export type BalanceMaterial = { id: string; name: string; unit: string; counted: Amount; reference: Amount };
const available = (value: Amount) => value !== null && value !== undefined && value !== "";
function formatDifference(counted: Amount, reference: Amount, unit: string) {
  if (!available(counted) || !available(reference)) return "Diferença não disponível";
  const difference = quantity(counted!).minus(quantity(reference!));
  return difference.isZero() ? "Sem diferença" : formatQuantity(difference.toFixed(), unit);
}

export function IssuedBalanceMaterials({ data, active }: { data: SupplyDocument; active: boolean }) {
  const applied = Boolean(data.balanceReview?.reconciliationApplied);
  const closed = data.status === "cancelled" || data.status === "rejected";
  const reviewed = applied || data.balanceReview?.reviewSatisfied;
  const status = closed ? "Contagem encerrada" : applied ? "Conciliado" : reviewed ? "Revisado"
    : data.balanceReview?.reviewRequired ? "Aguardando revisão" : "Contado";
  const extras = issuedBalanceExtras.safeParse(data.payload.balanceExtras ?? []);
  return <><DocumentMaterialList key={data.id} documentId={data.id} documentCode={data.code ?? data.protocol} patientId={data.care_recipient_id}
    revision={String(data.version)} active={active} label="Materiais do balanço" settledLabel="Conferidos"
    today={{ location: "family", label: "Estoque familiar" }}
    heading={<><h2>Materiais</h2><p>Contagem da equipe e estoque familiar atual.</p></>}
    rows={data.lines.map(line => {
      const expected = line.metadata.expectedQuantity;
      const reference = typeof expected === "string" || typeof expected === "number" ? expected : null;
      const amount = (value: Amount) => formatQuantity(value, line.unit_snapshot);
      const countedLabel = "Contagem da equipe";
      const facts = [{ label: countedLabel, value: formatQuantity(line.quantity) }];
      const detail = [
        { label: countedLabel, value: amount(line.quantity) },
        { label: "Saldo na referência", value: available(reference) ? amount(reference) : "Referência não disponível" },
        { label: "Diferença na contagem", value: formatDifference(line.quantity, reference, line.unit_snapshot) },
        { label: "Recebido / validado", value: amount(line.accepted_quantity) },
      ];
      return { id: line.id, productId: line.product_id, name: line.name_snapshot, unit: line.unit_snapshot, status,
        done: !closed && Boolean(reviewed), tone: closed ? "neutral" : reviewed ? "success" : "pending", facts,
        detail: <>
          {readPresentationConversions(line.presentation_conversions).map(item => <p key={item.id}>{presentationCaption(item)}</p>)}
          {line.requisitionItemIds.length ? <p>{line.requisitionItemIds.length} linha(s) REQ explicitamente vinculada(s).</p> : null}
          <dl className="hca-material-balance-grid">{detail.map(fact =>
            <div key={fact.label} data-material-fact={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl>
        </>,
      };
    })} />
    {extras.success ? <BalanceRecordedExtras extras={extras.data} /> : <p role="alert">Os dados dos extras desta contagem estão indisponíveis.</p>}
  </>;
}

export function BalanceRecordedExtras({ extras }: { extras: readonly BalanceCountExtra[] }) {
  if (!extras.length) return null;
  return <section className="hca-form-stack ui-card" aria-label="Itens extras da contagem">
    <h3>Itens extras</h3>
    <ul>{extras.map(extra => <li key={extra.id}><strong>{extra.name}</strong> · {formatQuantity(extra.quantity, extra.unit)}</li>)}</ul>
    <p className="hca-muted">As quantidades ficam registradas na contagem, aguardando identificação no catálogo.</p>
  </section>;
}
export function BalanceMaterials({ rows }: { rows: BalanceMaterial[] }) {
  return <DocumentMaterialsTable label="Materiais da contagem" heading={<h3>Contagem física e referência</h3>}
    columns={[{ id: "material", label: "Material" }, { id: "counted", label: "Quantidade física" }, { id: "reference", label: "Referência" }, { id: "difference", label: "Diferença" }]}
    rows={rows.map(row => {
      const hasCount = available(row.counted), hasReference = available(row.reference);
      return { id: row.id, searchText: row.name, cells: {
        material: <div className="hca-factual-material"><strong>{row.name}</strong><small>{row.unit}</small></div>,
        counted: hasCount ? formatQuantity(row.counted, row.unit) : "Contagem não informada",
        reference: hasReference ? formatQuantity(row.reference, row.unit) : "Referência não disponível",
        difference: formatDifference(row.counted, row.reference, row.unit),
      } };
    })} />;
}
