import Link from "next/link";
import { ActionButton, DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeading, DataTableRow } from "@/components/ui/controls";
import { TableFrame } from "@/components/ui/table-frame";
import { formatQuantity } from "@/lib/quantity";
import { formatBrazilDate } from "@/lib/receipt";
import type { ProductStock, StockMovement } from "@/types/stock";

const locations: Record<string, string> = { FAMILY: "Família", CARE_TEAM: "Equipe", TRANSIT: "Em trânsito" };
export function StockMovementHistory({ movements, products, canCorrect, onOrigin, onCorrect }: {
  movements: StockMovement[]; products: ProductStock[]; canCorrect: boolean;
  onOrigin: (movement: StockMovement, target: HTMLElement) => void;
  onCorrect: (movement: StockMovement, target: HTMLElement) => void;
}) {
  return <>
    <p className="hca-field-hint">Nomes e unidades desta lista identificam o cadastro atual. Consulte a origem para os fatos e materiais preservados no registro.</p>
    <TableFrame label="Movimentos do estoque">
      <DataTable className="hca-table hca-mobile-records" aria-label="Movimentos do estoque">
        <DataTableHead><DataTableRow>
          <DataTableHeading scope="col">Momento / material</DataTableHeading>
          <DataTableHeading scope="col">Origem → destino</DataTableHeading>
          <DataTableHeading scope="col">Quantidade</DataTableHeading>
          <DataTableHeading scope="col">Causa</DataTableHeading>
          <DataTableHeading scope="col">Ações</DataTableHeading>
        </DataTableRow></DataTableHead>
        <DataTableBody>{movements.map(movement => {
          const product = products.find(p => p.productId === movement.product_id);
          return <DataTableRow key={movement.id} data-movement-id={movement.id}>
            <DataTableCell><strong>{product?.name ?? "Nome não disponível nesta consulta"}</strong>
              <small>{formatBrazilDate(movement.created_at)}</small>
              <small>{product ? "Cadastro atual · " + product.unit : "Unidade não disponível nesta consulta"}</small>
            </DataTableCell>
            <DataTableCell data-label="Percurso">{locations[movement.source_location ?? ""] ?? "Entrada"} → {locations[movement.destination_location ?? ""] ?? "Retirada / consumo"}</DataTableCell>
            <DataTableCell data-label="Quantidade">{formatQuantity(movement.quantity)}</DataTableCell>
            <DataTableCell data-label="Causa"><p className="whitespace-pre-wrap wrap-break-word">{movement.justification}</p>
              {movement.reference_type === "document" && movement.reference_id ? <Link href={"/fichas/" + movement.reference_id}>Abrir ficha</Link> : null}
              {movement.reference_type === "delivery_regularization" && movement.reference_document_id ? <Link href={"/fichas/" + movement.reference_document_id}>Abrir dossiê administrativo</Link> : null}
              <details><summary>Referência da movimentação</summary><p className="break-all">{movement.id}</p></details>
            </DataTableCell>
            <DataTableCell data-label="Ações"><div className="hca-toolbar">
              <ActionButton onClick={event => onOrigin(movement,event.currentTarget)}>Consultar origem</ActionButton>
              {canCorrect && movement.reference_type === "family_manual" && (movement.source_location === "FAMILY" || movement.destination_location === "FAMILY") ? <ActionButton onClick={event => onCorrect(movement,event.currentTarget)}>Corrigir este movimento</ActionButton> : null}
            </div></DataTableCell>
          </DataTableRow>;
        })}</DataTableBody>
      </DataTable>
    </TableFrame>
  </>;
}
