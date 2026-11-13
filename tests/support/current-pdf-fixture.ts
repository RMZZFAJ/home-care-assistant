import type { DocumentSnapshot } from "@/lib/server/operational-pdf";
import { fidelitySourceFacts } from "./pdf-fidelity-fixtures";

/** Explicit synthetic facts required by the consolidated pipeline.
 * Used when porting a layout probe; negative contract cases use raw inputs.
 * This is not an adapter in the application or a reconstruction of real acts.
 */
export function currentPdfFixture<T extends DocumentSnapshot>(input: T): T {
  let serialized = JSON.stringify(input);
  input.lines.forEach((line, index) => {
    if (typeof line.id === "string" && !/^[0-9a-f-]{36}$/i.test(line.id)) serialized = serialized.replaceAll(JSON.stringify(line.id), JSON.stringify(`99000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`));
  });
  const source: T = JSON.parse(serialized);
  source.sourceFacts ??= structuredClone(fidelitySourceFacts);
  source.documentFacts ??= { schemaVersion: 1, deliveryResolutions: [], purchaseReceiptEvents: [] };
  source.lifecycleFacts ??= { schemaVersion: 1, documentId: source.id, version: source.version, cancellation: { state: source.status === "cancelled" ? "unavailable" : "not_cancelled", act: null, acknowledgements: [] }, complements: [] };
  if (source.type === "BAL") {
    source.balanceApplication ??= { state: "not_applied", lines: [] };
    source.balanceReviewCorrections ??= [];
  }
  source.lines.forEach((line, index) => { line.id ??= `99000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`; });
  if (source.type === "COM") source.purchaseEntryBalances ??= source.lines.map(line => ({ lineId: line.id, state: "unavailable", quantity: null, entry: null }));
  return source;
}
