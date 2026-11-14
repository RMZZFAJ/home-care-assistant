import { quantity } from "@/lib/quantity";
import type { PdfFidelityFacts } from "./pdf-fidelity";
import type { DocumentSnapshot } from "@/lib/server/operational-pdf";
import type { PdfSourceFacts } from "./pdf-source-facts";

export function recordedDeliveryRecipient(snapshot: DocumentSnapshot, source: PdfSourceFacts) {
  if (source.historical || typeof snapshot.workflow?.acceptedAt !== "string" || typeof snapshot.workflow.acceptedBy !== "string") return null;
  const version = snapshot.action === "ent.receive" ? snapshot.version : snapshot.history?.find(event => event.action === "ent.receive" && event.version <= snapshot.version)?.version;
  const actor = source.historyActors.find(item => item.version === version && item.id === snapshot.workflow?.acceptedBy);
  return actor && !["current_profile", "unknown"].includes(actor.source) ? actor.name : null;
}

/** Personal receipt quantities remain distinct from later administrative stock credits. */
export function confirmedDeliveryQuantity(snapshot: DocumentSnapshot, line: Record<string, unknown>, resolutions: PdfFidelityFacts["deliveryResolutions"], historical: boolean) {
  if (historical || typeof snapshot.workflow?.acceptedAt !== "string") return { state: "not_confirmed" as const, quantity: null };
  const receipt = (line.metadata as { receipt?: { acceptedQuantity?: unknown } } | undefined)?.receipt;
  const cases = [...(snapshot.deliveryRegularization?.cases ?? [])].sort((a, b) => new Date(a.proposed_at).getTime() - new Date(b.proposed_at).getTime());
  const before = cases.find(item => item.before_snapshot.lines.some(itemLine => itemLine.id === line.id) || item.proposal.lines.some(itemLine => itemLine.lineId === line.id));
  let initial: unknown, after: string | null;
  if (receipt?.acceptedQuantity != null) { initial = receipt.acceptedQuantity; after = snapshot.workflow.acceptedAt; }
  else if (before) { initial = before.before_snapshot.lines.find(item => item.id === line.id)?.accepted_quantity ?? before.proposal.lines.find(item => item.lineId === line.id)?.acceptedQuantity; after = before.proposed_at; }
  else { initial = line.accepted_quantity; after = null; }
  if (typeof initial !== "number" && typeof initial !== "string") return { state: "unavailable" as const, quantity: null };
  let amount = quantity(initial);
  if (after) for (const event of resolutions) if (event.lineId === line.id && event.resolution === "received" && new Date(event.recordedAt).getTime() > new Date(after).getTime()) {
    if (event.quantity === null) return { state: "unavailable" as const, quantity: null };
    amount = amount.plus(event.quantity);
  }
  if (amount.lt(0) || (typeof line.quantity === "string" || typeof line.quantity === "number") && amount.gt(quantity(line.quantity))) throw new Error("Receipt quantity exceeds the frozen expedition");
  return { state: "recorded" as const, quantity: amount.toFixed() };
}
