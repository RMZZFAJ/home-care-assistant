import { approvedDocumentContent } from "./approved-document-content";
import { documentVariant } from "@/lib/documents/variant";
import type { DocumentSnapshot, PdfEmissionContext } from "./operational-pdf";
import { purchaseEntryBalances } from "@/lib/validation/purchase-entry-balances";
import { balanceApplicationFacts } from "@/lib/validation/balance-application";
import { balanceCorrectionFacts } from "@/lib/validation/balance-corrections";
import { formatBrazilDate } from "@/lib/receipt";
import { formatQuantity } from "@/lib/quantity";

const name = (line: Record<string, unknown>) => String(line.name_snapshot ?? line.product_name_snapshot ?? line.custom_name ?? "Material não identificado");
const unit = (line: Record<string, unknown>) => String(line.unit_snapshot ?? "Unidade não preservada");
const amount = (value: unknown, measure?: string) => typeof value === "string" || typeof value === "number" ? formatQuantity(value, measure) : "Não disponível no registro";
/** Independent obligations for quantities, balances and each act in the approved supply models. */
export function approvedSupplyContent(snapshot: DocumentSnapshot, emission: PdfEmissionContext) {
  if (snapshot.type !== "COM" && snapshot.type !== "BAL") throw new Error("Approved supply content unavailable");
  const { facts, semanticFacts } = approvedDocumentContent(snapshot, emission);
  if (snapshot.type === "COM") {
    const entries = purchaseEntryBalances.parse(snapshot.purchaseEntryBalances);
    snapshot.lines.forEach((line, index) => {
      const prefix = "material/" + index, entry = entries.find(value => value.lineId === line.id)!;
      semanticFacts[prefix + "/name"] = name(line) + " " + unit(line);
      semanticFacts[prefix + "/acquired"] = amount(line.purchased_quantity, unit(line));
      semanticFacts[prefix + "/validated"] = amount(line.accepted_quantity, unit(line));
      semanticFacts[prefix + "/balance"] = (entry.state === "known" ? amount(entry.quantity, unit(line)) : entry.state === "restricted" ? "Acesso restrito" : entry.state === "not_validated" ? "Sem entrada validada" : "Não disponível no registro") + (entry.entry ? " " + formatBrazilDate(entry.entry.validatedAt) : "");
      semanticFacts["purchase/" + index + "/planned"] = amount(line.quantity, unit(line));
      semanticFacts["purchase/" + index + "/approved"] = amount(line.approved_quantity, unit(line));
    });
    [...(snapshot.purchaseReceipts ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at)).forEach((receipt, index) => {
      const prefix = "receipt/" + index;
      semanticFacts[prefix + "/submitted"] = "Chegada registrada por " + (receipt.submitted_name ?? "Nome não preservado") + " · " + formatBrazilDate(receipt.created_at);
      semanticFacts[prefix + "/decision"] = receipt.state === "pending" ? "Ainda sem decisão de validação." : (receipt.state === "approved" ? "Validada por " : "Rejeitada por ") + (receipt.validated_name ?? "Nome não preservado") + " · " + formatBrazilDate(receipt.validated_at ?? null);
      if (receipt.reason) semanticFacts[prefix + "/reason"] = receipt.reason;
      receipt.lines.forEach((item, itemIndex) => { const line = snapshot.lines.find(value => value.id === item.lineId); if (!line) throw new Error("Receipt material missing"); semanticFacts[prefix + "/quantity/" + itemIndex] = amount(item.quantity, unit(line)); });
    });
    if (snapshot.purchaseProgress?.closure) {
      const closure = snapshot.purchaseProgress.closure;
      semanticFacts["purchase/closure/actor"] = (closure.actorName ?? "Nome não preservado") + " · " + formatBrazilDate(closure.recordedAt);
      semanticFacts["purchase/closure/reason"] = closure.reason;
    }
  } else {
    semanticFacts["balance/countNature"] = Number(snapshot.workflow?.countVersion) > 1 ? "Reconto registrado em ato próprio, mantendo a contagem anterior." : documentVariant("BAL", snapshot.payload, snapshot.workflow).includes("contexto de plantão não preservado") ? "Contexto de plantão não preservado neste registro." : "Primeira contagem desta ficha, sem afirmar primeira contagem da residência.";
    const application = balanceApplicationFacts.parse(snapshot.balanceApplication);
    snapshot.lines.forEach((line, index) => {
      const prefix = "material/" + index, applied = application.state === "applied" ? application.lines.find(item => item.lineId === line.id) : null;
      semanticFacts[prefix + "/name"] = name(line) + " " + unit(line);
      semanticFacts[prefix + "/reference"] = amount((line.metadata as { expectedQuantity?: unknown } | undefined)?.expectedQuantity, unit(line));
      semanticFacts[prefix + "/counted"] = amount(line.quantity, unit(line));
      semanticFacts[prefix + "/balance"] = (application.state === "not_applied" ? "Não aplicado" : application.state === "unavailable" ? "Não disponível no registro" : applied?.state === "restricted" ? "Acesso restrito" : applied?.state === "known" ? amount(applied.quantity, unit(line)) : "Não disponível no registro") + (application.state === "applied" ? " " + formatBrazilDate(application.appliedAt) : "");
    });
    if (application.state === "applied") semanticFacts["balance/application"] = "Aplicada por " + application.actorName + " · " + formatBrazilDate(application.appliedAt);
    if (snapshot.balanceReviews?.notes && snapshot.balanceReviews.notes !== snapshot.payload.notes) semanticFacts["balance/countNotes"] = snapshot.balanceReviews.notes;
    for (const [index, review] of (snapshot.balanceReviews?.reviews ?? []).entries()) {
      const prefix = "review/" + index;
      semanticFacts[prefix + "/actor"] = review.reviewer_name + " · " + formatBrazilDate(review.recorded_at);
      semanticFacts[prefix + "/comment"] = review.comment || "Sem comentário adicional.";
      for (const [itemIndex, item] of (review.item_results ?? []).entries()) {
        const line = review.reviewed_snapshot.lines.find(value => value.id === item.lineId);
        semanticFacts[prefix + "/item/" + itemIndex] = (line?.name_snapshot ?? "Material não identificado") + " · " + (item.result === "confirmed" ? "Confirmado" : "Diferença apontada") + " · " + ({ none: "Sem encaminhamento", recount: "Reconto indicado", adjustment: "Ajuste autorizado indicado" }[item.forwarding]);
        if (item.comment) semanticFacts[prefix + "/itemComment/" + itemIndex] = item.comment;
      }
    }
    for (const [index, correction] of balanceCorrectionFacts.parse(snapshot.balanceReviewCorrections).entries()) for (const [actIndex, act] of correction.acts.entries()) {
      const prefix = "correction/" + index + "/" + actIndex;
      semanticFacts[prefix + "/count"] = "Reconto · " + act.line.name + " · " + amount(act.line.quantity, act.line.unit);
      semanticFacts[prefix + "/actor"] = (act.actorName ?? "Nome não preservado") + " · " + formatBrazilDate(act.recordedAt);
      semanticFacts[prefix + "/application"] = act.application.state === "not_applied" ? "Reconto não aplicado ao estoque." : act.application.state === "unavailable" ? "Resultado da aplicação não disponível no registro." : "Aplicado por " + act.application.actorName + " · " + formatBrazilDate(act.application.appliedAt);
      if (act.application.state === "applied") semanticFacts[prefix + "/balance"] = "Saldo após este reconto: " + (act.application.lines[0].state === "restricted" ? "Acesso restrito" : amount(act.application.lines[0].quantity, act.line.unit));
    }
    for (const [index, approval] of (snapshot.balanceReviews?.legacyApprovals ?? []).entries()) semanticFacts["balance/legacy/" + index] = (approval.actorName ?? "Nome não preservado") + " · " + formatBrazilDate(approval.created_at);
  }
  return { facts, semanticFacts };
}
