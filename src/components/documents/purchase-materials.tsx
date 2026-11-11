"use client";
import { useMemo } from "react";
import { DocumentMaterialsTable } from "./document-materials-table";
import { formatQuantity } from "@/lib/quantity";
import { readPresentationConversions, presentationCaption } from "@/lib/presentation-conversion";
import type { SupplyDocument } from "@/types/documents";

const core = [{ id: "material", label: "Material" }, { id: "proposed", label: "Proposto" }, { id: "approved", label: "Aprovado" }, { id: "purchased", label: "Adquirido" }, { id: "validated", label: "Validado" }];
const expectation = [{ id: "pending", label: "Em conferência" }, { id: "unarrived", label: "Aquisição sem chegada válida" }, { id: "waived", label: "Não será adquirido" }, { id: "remaining", label: "Por adquirir" }];
export function PurchaseMaterials({ data }: { data: SupplyDocument }) {
  const progress = useMemo(() => new Map(data.purchaseProgress?.lines.map(line => [line.lineId, line])), [data.purchaseProgress]);
  return <DocumentMaterialsTable key={data.id} label="Materiais da compra ou doação" heading={<><h2>Produtos e quantidades</h2><p>Valores de cada ato são apresentados separadamente. A validação da chegada determina a entrada no estoque.</p></>} columns={progress.size ? [...core, ...expectation] : core}
    rows={data.lines.map(line => {
      const current = progress.get(line.id);
      const quantity = (value: string | number | undefined) => value === undefined ? "Não informado neste registro" : formatQuantity(value, line.unit_snapshot);
      return { id: line.id, searchText: line.name_snapshot, cells: {
        material: <><strong>{line.name_snapshot}</strong><small>{line.unit_snapshot}</small>{readPresentationConversions(line.presentation_conversions).map(row => <small key={row.id}>{presentationCaption(row)}</small>)}{line.requisitionItemIds.length ? <small>{line.requisitionItemIds.length} linha(s) REQ explicitamente vinculada(s).</small> : null}</>,
        proposed: quantity(line.quantity), approved: quantity(line.approved_quantity), purchased: quantity(line.purchased_quantity), validated: quantity(line.accepted_quantity),
        pending: quantity(current?.pendingValidationQuantity), unarrived: quantity(current?.unarrivedQuantity), waived: quantity(current?.waivedQuantity), remaining: quantity(current?.remainingExpectation),
      } };
    })} />;
}
