import {
  balanceDraftContent,
  balanceObservationSnapshot,
} from "@/lib/validation/creation-drafts";
import type { BalanceDraftContent } from "@/lib/validation/creation-drafts";

export function sameBalanceContext(
  a: BalanceDraftContent["context"],
  b: BalanceDraftContent["context"],
) {
  return (Object.keys(a) as (keyof typeof a)[]).every(
    (key) => a[key] === b[key],
  );
}

/** A new reference starts new physical observations. Earlier raw values remain private. */
export function beginBalanceObservation(
  source: BalanceDraftContent,
  context: BalanceDraftContent["context"],
  materials: BalanceDraftContent["materials"],
): BalanceDraftContent {
  const previous = balanceDraftContent.parse(source);
  if (previous.context.documentId !== context.documentId)
    throw Error("Abra a ficha original para recuperar este preenchimento.");
  const { previousObservations = [], ...snapshot } = previous;
  if (previousObservations.length >= 10)
    throw Error(
      "Este preenchimento já preserva dez conferências anteriores. Salve e consulte os valores antes de descartar explicitamente o preenchimento privado e iniciar outro.",
    );
  return balanceDraftContent.parse({
    counts: {},
    observationTimes: {},
    notes: previous.notes,
    materials,
    context,
    previousObservations: [
      ...previousObservations,
      balanceObservationSnapshot.parse(snapshot),
    ],
  });
}
