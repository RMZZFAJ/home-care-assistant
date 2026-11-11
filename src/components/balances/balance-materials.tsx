"use client";
import { DocumentMaterialsTable } from "@/components/documents/document-materials-table";
import { formatQuantity, quantity } from "@/lib/quantity";

type Amount = string | number | null | undefined;
export type BalanceMaterial = { id: string; name: string; unit: string; counted: Amount; reference: Amount };
const available = (value: Amount) => value !== null && value !== undefined && value !== "";
export function BalanceMaterials({ rows }: { rows: BalanceMaterial[] }) {
  return <DocumentMaterialsTable label="Materiais da contagem" heading={<h3>Contagem física e referência</h3>}
    columns={[{ id: "material", label: "Material" }, { id: "counted", label: "Quantidade física" }, { id: "reference", label: "Referência" }, { id: "difference", label: "Diferença" }]}
    rows={rows.map(row => {
      const hasCount = available(row.counted), hasReference = available(row.reference);
      const difference = hasCount && hasReference ? quantity(row.counted!).minus(quantity(row.reference!)) : null;
      return { id: row.id, searchText: row.name, cells: {
        material: <div className="hca-factual-material"><strong>{row.name}</strong><small>{row.unit}</small></div>,
        counted: hasCount ? formatQuantity(row.counted, row.unit) : "Contagem não informada",
        reference: hasReference ? formatQuantity(row.reference, row.unit) : "Referência não disponível",
        difference: difference === null ? "Diferença não disponível" : difference.isZero() ? "Sem diferença" : formatQuantity(difference.toFixed(), row.unit),
      } };
    })} />;
}
