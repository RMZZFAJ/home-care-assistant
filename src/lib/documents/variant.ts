import type { DocumentType } from "@/types/documents";
import { materialTransferDirection } from "./transfer-follow-up";

/** Describe only the variant preserved by the authoritative document payload. */
export function documentVariant(type: DocumentType, payload: Record<string, unknown>, workflow?: Record<string, unknown>) {
  if (type === "COM") return payload.origin === "donation" ? "Doação de insumos à família"
    : payload.origin === "purchase" ? "Compra de insumos da família" : "Compra ou doação de insumos";
  if (type === "BAL") {
    const context = payload.balanceContext;
    const kind = context && typeof context === "object" && "kind" in context ? context.kind : null;
    if (kind === "recount") return "Reconto do estoque da equipe";
    if (["scheduled", "transfer", "deferred"].includes(String(kind)))
      return workflow?.countVersion === 1 ? "Balanço do estoque da equipe · primeira contagem desta ficha" : "Balanço do estoque da equipe · contagem de plantão";
    return "Balanço do estoque da equipe · contexto de plantão não preservado";
  }
  if (type === "REQ") return "Requisição de materiais";
  const direction = materialTransferDirection(String(payload.source ?? ""), String(payload.destination ?? ""));
  return direction === "return" ? "Devolução de materiais" : direction === "delivery" ? "Entrega de materiais" : "Movimentação de materiais · percurso não preservado";
}
